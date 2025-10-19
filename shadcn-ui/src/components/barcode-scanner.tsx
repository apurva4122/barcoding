import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Barcode, PackingStatus, ScanUpdateData } from "@/types";
import { findBarcodeByCode, updateBarcodeStatus } from "@/lib/storage";
import { AlertCircle } from "lucide-react";
import jsQR from "jsqr";

export function BarcodeScanner({ 
  onBarcodeDetected,
  onBarcodeUpdated
}: { 
  onBarcodeDetected: (barcode: Barcode | null) => void;
  onBarcodeUpdated: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [activeTab, setActiveTab] = useState<"camera" | "manual">("camera");
  const [error, setError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<Barcode | null>(null);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [updateData, setUpdateData] = useState<ScanUpdateData>({
    weight: "",
    packer: ""
  });
  const scanIntervalRef = useRef<number | null>(null);
  
  // Reset state when changing tabs
  useEffect(() => {
    setError(null);
    setScanResult(null);
  }, [activeTab]);
  
  // Clean up media streams when component unmounts
  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);
  
  const startScanning = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Camera not supported by your browser");
      return;
    }
    
    try {
      setError(null);
      setScanResult(null);
      
      // Try rear camera first, fallback to any available camera
      let constraints = {
        video: { 
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };
      
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        // Fallback to any available camera
        console.log("Rear camera not available, trying any camera");
        constraints = {
          video: { 
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      }
      
      if (videoRef.current && stream) {
        videoRef.current.srcObject = stream;
        
        // Wait for video to be ready
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play().then(() => {
              setScanning(true);
              scanIntervalRef.current = window.setInterval(scanVideoFrame, 300);
            }).catch(err => {
              console.error("Error playing video:", err);
              setError("Failed to start camera playback");
            });
          }
        };
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Failed to access camera. Please allow camera permissions and try again.");
    }
  };
  
  const stopScanning = () => {
    setScanning(false);
    
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };
  
  const scanVideoFrame = () => {
    if (!scanning) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
      // Set canvas dimensions to match video
      const width = video.videoWidth;
      const height = video.videoHeight;
      
      if (width === 0 || height === 0) return;
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw video frame to canvas
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, width, height);
        
        try {
          // Get image data for processing
          const imageData = ctx.getImageData(0, 0, width, height);
          
          // Process the image data to detect QR codes using jsQR
          const code = jsQR(imageData.data, width, height, {
            inversionAttempts: "attemptBoth",
          });
          
          if (code && code.data) {
            console.log("QR Code detected:", code.data);
            stopScanning();
            handleCodeDetection(code.data);
          }
        } catch (err) {
          console.error("Error processing video frame:", err);
        }
      }
    }
  };
  
  const handleCodeDetection = (code: string) => {
    // Look up the detected code
    const barcode = findBarcodeByCode(code);
    
    if (barcode) {
      setScanResult(barcode);
      onBarcodeDetected(barcode);
      
      // If this is the first scan and status is PENDING, show update dialog
      if (barcode.status === PackingStatus.PENDING) {
        setUpdateDialogOpen(true);
      } else if (barcode.status === PackingStatus.PACKED) {
        // For second scan (PACKED to DISPATCHED), we don't need weight/packer, just update
        try {
          const updated = updateBarcodeStatus(
            barcode.code, 
            PackingStatus.DISPATCHED
          );
          if (updated) {
            setScanResult(updated);
            onBarcodeUpdated();
          }
        } catch (error) {
          console.error("Failed to update status:", error);
          setError("Failed to update status");
        }
      } else if (barcode.status === PackingStatus.DISPATCHED) {
        // Update to DELIVERED if it was DISPATCHED
        try {
          const updated = updateBarcodeStatus(
            barcode.code, 
            PackingStatus.DELIVERED
          );
          if (updated) {
            setScanResult(updated);
            onBarcodeUpdated();
          }
        } catch (error) {
          console.error("Failed to update status:", error);
          setError("Failed to update status");
        }
      } else {
        setError("Package already delivered");
      }
    } else {
      setError(`QR code not found: ${code}`);
      setScanResult(null);
    }
  };
  
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) {
      setError("Please enter a QR code");
      return;
    }
    
    handleCodeDetection(manualCode.trim());
  };
  
  const handleUpdateSubmit = () => {
    if (!scanResult) return;
    
    // For first scan, validate input
    if (scanResult.status === PackingStatus.PENDING) {
      if (!updateData.weight?.trim()) {
        setError("Please enter the weight");
        return;
      }
      
      if (!updateData.packer?.trim()) {
        setError("Please enter the packer name");
        return;
      }
      
      try {
        const updated = updateBarcodeStatus(
          scanResult.code, 
          PackingStatus.PACKED, 
          {
            weight: updateData.weight.trim(),
            packerName: updateData.packer.trim()
          }
        );
        
        if (updated) {
          setScanResult(updated);
          onBarcodeUpdated();
          setUpdateDialogOpen(false);
          setError(null);
        }
      } catch (error) {
        console.error("Failed to update status:", error);
        setError("Failed to update status");
      }
    }
  };
  
  const handleScanAgain = () => {
    setManualCode("");
    setScanResult(null);
    setError(null);
    
    if (activeTab === "camera") {
      startScanning();
    }
  };
  
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Scan QR Code</CardTitle>
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "camera" | "manual")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="camera">Camera</TabsTrigger>
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          </TabsList>
          
          <TabsContent value="camera" className="space-y-4">
            <div className="relative aspect-video bg-black rounded-md overflow-hidden">
              <video 
                ref={videoRef} 
                className="absolute top-0 left-0 w-full h-full object-cover"
                playsInline
                autoPlay
                muted
              ></video>
              <canvas 
                ref={canvasRef}
                className="absolute top-0 left-0 w-full h-full object-cover pointer-events-none"
                style={{ display: 'none' }}
              ></canvas>
              
              {scanning && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-red-500 rounded-lg">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-red-500 rounded-tl-lg"></div>
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-red-500 rounded-tr-lg"></div>
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-red-500 rounded-bl-lg"></div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-red-500 rounded-br-lg"></div>
                  </div>
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-black bg-opacity-50 text-white px-3 py-1 rounded text-sm">
                      Point camera at QR code
                    </div>
                  </div>
                </div>
              )}
              
              {!scanning && !scanResult && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                  <Button onClick={startScanning} size="lg">
                    Start Camera
                  </Button>
                </div>
              )}
              
              {scanning && (
                <div className="absolute top-4 right-4">
                  <Button variant="destructive" size="sm" onClick={stopScanning}>
                    Stop
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="manual">
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="manual-code">Enter QR Code</Label>
                <Input
                  id="manual-code"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="e.g. PKG123456"
                />
              </div>
              
              <Button type="submit" className="w-full">
                Submit
              </Button>
            </form>
          </TabsContent>
        </Tabs>
        
        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {scanResult && (
          <div className="mt-4 p-4 border rounded-md">
            <h3 className="font-semibold">Package Found:</h3>
            <div className="mt-2 space-y-1 text-sm">
              <p><span className="font-medium">Code:</span> {scanResult.code}</p>
              <p><span className="font-medium">Status:</span> {scanResult.status}</p>
              {scanResult.description && (
                <p><span className="font-medium">Description:</span> {scanResult.description}</p>
              )}
              {scanResult.weight && (
                <p><span className="font-medium">Weight:</span> {scanResult.weight}</p>
              )}
              {scanResult.packerName && (
                <p><span className="font-medium">Packer:</span> {scanResult.packerName}</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-end">
        {scanResult && (
          <Button variant="outline" onClick={handleScanAgain}>
            Scan Another
          </Button>
        )}
      </CardFooter>
      
      {/* Update Dialog for first scan */}
      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Package Details</DialogTitle>
            <DialogDescription>
              Enter package weight and packer name to update the status to PACKED
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="weight">Package Weight</Label>
              <Input
                id="weight"
                value={updateData.weight}
                onChange={(e) => setUpdateData(prev => ({ ...prev, weight: e.target.value }))}
                placeholder="e.g. 1.5kg"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="packer">Packer Name</Label>
              <Input
                id="packer"
                value={updateData.packer}
                onChange={(e) => setUpdateData(prev => ({ ...prev, packer: e.target.value }))}
                placeholder="e.g. John Smith"
              />
            </div>
            
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateSubmit}>
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
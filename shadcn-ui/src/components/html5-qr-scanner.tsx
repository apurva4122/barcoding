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
import { Html5QrcodeScanner, Html5Qrcode } from "html5-qrcode";

export function Html5QRScanner({
  onBarcodeDetected,
  onBarcodeUpdated
}: { 
  onBarcodeDetected: (barcode: Barcode | null) => void;
  onBarcodeUpdated: () => void;
}) {
  const [manualCode, setManualCode] = useState("");
  const [activeTab, setActiveTab] = useState<"camera" | "manual">("camera");
  const [error, setError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<Barcode | null>(null);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [updateData, setUpdateData] = useState<ScanUpdateData>({
    weight: "",
    packer: ""
  });
  const [shippingLocation, setShippingLocation] = useState("");
  const [shippingDialogOpen, setShippingDialogOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const currentBarcodeRef = useRef<string | null>(null);
  
  // Reset state when changing tabs
  useEffect(() => {
    setError(null);
    //setScanResult(null);
  }, [activeTab]);
  
  // Clean up scanner when component unmounts or tab changes
  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);

  // Clean up when switching tabs
  useEffect(() => {
    if (activeTab !== "camera") {
      stopScanning();
    }
  }, [activeTab]);
  
  const startScanning = async () => {
    try {
      setError(null);
      setScanResult(null);
      
      // Clean up any existing scanner
      if (scannerRef.current) {
        await scannerRef.current.clear();
        scannerRef.current = null;
      }
      
      // Create new scanner instance
      const scanner = new Html5QrcodeScanner(
        "qr-reader", 
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.777778,
          disableFlip: false,
          videoConstraints: {
            facingMode: "environment"
          }
        },
        false
      );
      
      scannerRef.current = scanner;
      
      scanner.render(
        (decodedText) => {
          console.log("QR Code detected:", decodedText);
          handleCodeDetection(decodedText);
          stopScanning();
        },
        (error) => {
          // This is called for each scan attempt, so we don't want to log every error
          // console.warn("QR scan error:", error);
        }
      );
      
      setIsScanning(true);
    } catch (err) {
      console.error("Error starting scanner:", err);
      setError("Failed to start camera. Please allow camera permissions and try again.");
    }
  };
  
  const stopScanning = async () => {
    setIsScanning(false);
    
    if (scannerRef.current) {
      try {
        await scannerRef.current.clear();
        scannerRef.current = null;
      } catch (err) {
        console.warn("Error stopping scanner:", err);
      }
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setError(null);
      
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode("qr-reader-file");
      }
      
      const result = await html5QrCodeRef.current.scanFile(file, true);
      console.log("QR Code detected from file:", result);
      handleCodeDetection(result);
    } catch (err) {
      console.error("Error scanning file:", err);
      setError("No QR code found in the uploaded image");
    }
  };
  
  const handleCodeDetection = async (code: string) => {
    // Look up the detected code
    console.log("barcode_4", code);
    // Store the barcode code in the ref for use later regardless of state changes
    currentBarcodeRef.current = code;
    
    try {
      const barcode = await findBarcodeByCode(code);

      console.log("barcode_3", barcode);
      console.log("status", barcode.status);
      if (barcode) {
        setScanResult(barcode);
        onBarcodeDetected(barcode);
        
        // If this is the first scan and status is PENDING, show update dialog
        if (barcode.status === PackingStatus.PENDING) {
          setUpdateDialogOpen(true);
        } else if (barcode.status === PackingStatus.PACKED) {
          // For second scan (PACKED to DISPATCHED), we need shipping location before update
          // Open a dialog to ask for shipping location
          setShippingDialogOpen(true);
        } else if (barcode.status === PackingStatus.DISPATCHED) {
          // Update to DELIVERED if it was DISPATCHED
          try {
            console.log("Attempting to update barcode status to DELIVERED:", barcode.code);
            const updated = await updateBarcodeStatus(
              barcode.code, 
              PackingStatus.DELIVERED
            );
            
            console.log("Update result:", updated);
            
            if (updated) {
              setScanResult(updated);
              onBarcodeUpdated();
              currentBarcodeRef.current = null; // Clear the reference after successful update
            } else {
              console.error("Failed to update barcode status - no data returned");
              setError("Failed to update barcode status - please try again");
            }
          } catch (err) {
            console.error("Failed to update status:", err);
            setError("Error: " + (err instanceof Error ? err.message : "Unknown error"));
          }
        } else {
          setError("Package already delivered");
        }
      } else {
        setError(`QR code not found: ${code}`);
        setScanResult(null);
      }
    } catch (error) {
      console.error("Error in handleCodeDetection:", error);
      setError("Error processing barcode: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  };
  
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) {
      setError("Please enter a QR code");
      return;
    }
    console.log("Manual is", manualCode.trim());
    handleCodeDetection(manualCode.trim());
  };
  
  const handleUpdateSubmit = async () => {
    // Use the stored barcode code from ref which persists even if state changes
    const barcodeCode = currentBarcodeRef.current;
    console.log("Working with barcode code from ref:", barcodeCode);
    
    if (!barcodeCode) {
      console.log("No barcode code stored in ref");
      setError("No barcode selected. Please scan again.");
      return;
    }
    
    // For first scan, validate input
    if (!scanResult || scanResult.status === PackingStatus.PENDING) {
      if (!updateData.weight?.trim()) {
        setError("Please enter the weight");
        return;
      }
      
      if (!updateData.packer?.trim()) {
        setError("Please enter the packer name");
        return;
      }
      
      try {
        console.log("Attempting to update barcode status to PACKED:", barcodeCode);
        console.log("Starting updateBarcodeStatus call with code:", barcodeCode);
        const updated = await updateBarcodeStatus(
          barcodeCode,
          PackingStatus.PACKED, 
          {
            weight: updateData.weight.trim(),
            packerName: updateData.packer.trim()
          }
        );
        console.log("Barcode code used for update:", barcodeCode);
        console.log("Update result:", updated);
        
        if (updated) {
          setScanResult(updated);
          onBarcodeUpdated();
          setUpdateDialogOpen(false);
          setError(null);
          // Clear the current barcode reference after successful update
          currentBarcodeRef.current = null;
        } else {
          console.log("Failed to update barcode status - no data returned");
          setError("Failed to update barcode status - please try again");
        }
      } catch (err) {
        console.error("Failed to update status:", err);
        setError("Error: " + (err instanceof Error ? err.message : "Unknown error"));
      }
    }
  };
  
  const handleShippingSubmit = async () => {
    const barcodeCode = currentBarcodeRef.current;
    
    if (!barcodeCode) {
      setError("No barcode selected. Please scan again.");
      return;
    }
    
    if (!shippingLocation.trim()) {
      setError("Please enter the shipping location");
      return;
    }
    
    try {
      console.log("Attempting to update barcode status to DISPATCHED with location:", shippingLocation);
      console.log("Barcode code:", barcodeCode);
      const updated = await updateBarcodeStatus(
        barcodeCode,
        PackingStatus.DISPATCHED,
        {
          shippingLocation: shippingLocation.trim()
        }
      );
      
      console.log("Update result with shipping location:", updated);
      console.log("Updated barcode shipping location:", updated?.shippingLocation);
      
      if (updated) {
        setScanResult(updated);
        onBarcodeUpdated();
        setShippingDialogOpen(false);
        setError(null);
        setShippingLocation(""); // Reset for next time
        currentBarcodeRef.current = null; // Clear reference
      } else {
        console.error("Failed to update barcode status - no data returned");
        setError("Failed to update barcode status - please try again");
      }
    } catch (err) {
      console.error("Failed to update status:", err);
      setError("Error: " + (err instanceof Error ? err.message : "Unknown error"));
    }
  };
  
  const handleScanAgain = () => {
    setManualCode("");
    setScanResult(null);
    setError(null);
    currentBarcodeRef.current = null;
    
    if (activeTab === "camera" && !isScanning) {
      startScanning();
    }
  };
  
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Html5-QRCode Scanner</CardTitle>
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "camera" | "manual")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="camera">Camera</TabsTrigger>
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          </TabsList>
          
          <TabsContent value="camera" className="space-y-4">
            <div className="space-y-4">
              <div id="qr-reader" className="w-full"></div>
              <div id="qr-reader-file" style={{ display: 'none' }}></div>
              
              {!isScanning && !scanResult && (
                <div className="space-y-4">
                  <Button onClick={startScanning} className="w-full" size="lg">
                    Start Camera Scanner
                  </Button>
                  
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">Or upload an image:</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </div>
                </div>
              )}
              
              {isScanning && (
                <div className="flex justify-center">
                  <Button variant="destructive" onClick={stopScanning}>
                    Stop Scanner
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
              {scanResult.shippingLocation && (
                <p><span className="font-medium">Shipping Location:</span> {scanResult.shippingLocation}</p>
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

      {/* Shipping Location Dialog */}
      <Dialog open={shippingDialogOpen} onOpenChange={setShippingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Shipping Information</DialogTitle>
            <DialogDescription>
              Enter the shipping location to update the status to DISPATCHED
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="shipping-location">Shipping Location</Label>
              <Input
                id="shipping-location"
                value={shippingLocation}
                onChange={(e) => setShippingLocation(e.target.value)}
                placeholder="e.g. New York Warehouse"
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
            <Button variant="outline" onClick={() => setShippingDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleShippingSubmit}>
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Upload } from "lucide-react";
import { Barcode, PackingStatus, ScanUpdateData } from "@/types";
import { findBarcodeByCode, updateBarcodeStatus } from "@/lib/storage";
import jsQR from "jsqr";

export function FileUploadScanner({ 
  onBarcodeDetected,
  onBarcodeUpdated
}: { 
  onBarcodeDetected: (barcode: Barcode | null) => void;
  onBarcodeUpdated: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<Barcode | null>(null);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [updateData, setUpdateData] = useState<ScanUpdateData>({
    weight: "",
    packer: ""
  });
  const [processing, setProcessing] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const processImage = async () => {
    if (!file) {
      setError("Please select an image file");
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // Create image from file
      const image = new Image();
      image.src = URL.createObjectURL(file);
      
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
      });

      // Draw image on canvas to get pixel data
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      
      if (!context) {
        setError("Failed to process image - canvas context not available");
        setProcessing(false);
        return;
      }
      
      canvas.width = image.width;
      canvas.height = image.height;
      context.drawImage(image, 0, 0);
      
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      
      // Try to detect QR code
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });
      
      URL.revokeObjectURL(image.src);
      
      if (code && code.data) {
        console.log("QR Code detected:", code.data);
        handleCodeDetection(code.data);
      } else {
        setError("No QR code found in the image");
      }
    } catch (err) {
      console.error("Error processing image:", err);
      setError(`Error processing image: ${err instanceof Error ? err.message : String(err)}`);
    }
    
    setProcessing(false);
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
  
  const handleReset = () => {
    setFile(null);
    setScanResult(null);
    setError(null);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>QR Code Scanner (Upload Method)</CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {!scanResult && (
          <>
            <div className="space-y-2">
              <Label htmlFor="qr-file">Upload QR Code Image</Label>
              <Input
                id="qr-file"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
              />
              <p className="text-sm text-muted-foreground">
                Take a picture of the QR code with your phone camera and upload it here
              </p>
            </div>
            
            {file && (
              <div className="flex justify-center mt-4">
                <img 
                  src={URL.createObjectURL(file)} 
                  alt="QR Code Preview"
                  className="max-h-48 object-contain rounded-md"
                  onLoad={() => URL.revokeObjectURL(URL.createObjectURL(file))}
                />
              </div>
            )}
            
            <Button 
              onClick={processImage} 
              disabled={!file || processing}
              className="w-full"
            >
              {processing ? "Processing..." : "Scan QR Code"}
              {!processing && <Upload className="ml-2 h-4 w-4" />}
            </Button>
          </>
        )}
        
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {scanResult && (
          <div className="p-4 border rounded-md">
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
        
        {updateDialogOpen && scanResult?.status === PackingStatus.PENDING && (
          <div className="mt-4 p-4 border rounded-md">
            <h3 className="font-semibold mb-3">Update Package Details</h3>
            <div className="space-y-4">
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
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setUpdateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateSubmit}>
                  Update Status
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-end">
        {scanResult && (
          <Button variant="outline" onClick={handleReset}>
            Scan Another
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
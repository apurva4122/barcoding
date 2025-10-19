import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Html5QrcodeScanner } from "html5-qrcode";
import { Package, CheckCircle } from "lucide-react";
import { findBarcodeByCode, updateBarcodeStatus } from "@/lib/storage";
import { Barcode, PackingStatus } from "@/types";

interface DeliveredScannerProps {
  onBarcodeDetected?: (barcode: Barcode | null) => void;
  onBarcodeUpdated?: () => void;
}

export function DeliveredScanner({ onBarcodeDetected, onBarcodeUpdated }: DeliveredScannerProps) {
  const [scanner, setScanner] = useState<Html5QrcodeScanner | null>(null);
  const [scannerActive, setScannerActive] = useState(false);
  const [scanResults, setScanResults] = useState<string[]>([]);
  const [error, setError] = useState<string>("");
  const [showError, setShowError] = useState(false);

  const startScanner = async () => {
    if (scanner) {
      await scanner.clear();
    }

    const newScanner = new Html5QrcodeScanner(
      "delivered-scanner",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );

    newScanner.render(
      async (decodedText: string) => {
        try {
          setError("");
          // Find existing barcode
          const existingBarcode = await findBarcodeByCode(decodedText);
          if (existingBarcode) {
            console.log("Found barcode for delivery:", existingBarcode);
            console.log("Current status before delivery:", existingBarcode.status);
            
            if (existingBarcode.status === PackingStatus.DELIVERED) {
              setError("Package already marked as delivered.");
              setShowError(true);
              return;
            }
            
            try {
              // Update status to 'delivered'
              const updatedBarcode = await updateBarcodeStatus(
                decodedText, 
                PackingStatus.DELIVERED, 
                {}
              );
              
              if (updatedBarcode) {
                setScanResults(prev => [...prev, decodedText]);
                onBarcodeDetected?.(updatedBarcode);
                onBarcodeUpdated?.();
                console.log("Successfully updated to DELIVERED status");
              }
            } catch (statusError) {
              console.error("Status update error:", statusError.message);
              setError(`Error: ${statusError.message}`);
              setShowError(true);
              return;
            }
          } else {
            setError('QR code not found in the system');
            setShowError(true);
          }
        } catch (error) {
          console.error('Error updating barcode status:', error);
          setError(`Error: ${error.message}`);
          setShowError(true);
        }
      },
      (error: string) => {
        // Handle scan errors silently
      }
    );

    setScanner(newScanner);
    setScannerActive(true);
  };

  const stopScanner = async () => {
    if (scanner) {
      await scanner.clear();
      setScanner(null);
    }
    setScannerActive(false);
  };

  const closeErrorDialog = () => {
    setShowError(false);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-green-600" />
            Delivered Status Scanner
          </CardTitle>
          <CardDescription>
            Scan QR codes to mark packages as delivered
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              onClick={startScanner}
              disabled={scannerActive}
              className="flex-1"
            >
              {scannerActive ? 'Scanner Active' : 'Start Delivered Scanner'}
            </Button>
            {scannerActive && (
              <Button
                onClick={stopScanner}
                variant="outline"
              >
                Stop
              </Button>
            )}
          </div>
          
          <div id="delivered-scanner" className="w-full" />
          
          {scanResults.length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium text-sm mb-2">Recently Marked as Delivered:</h4>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {scanResults.slice(-5).map((code, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className="font-mono">{code}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showError} onOpenChange={closeErrorDialog}>
        <Alert variant="destructive" className="mt-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </Dialog>
    </>
  );
}
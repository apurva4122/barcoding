import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Barcode, PackingStatus } from "@/types";
import { findBarcodeByCode, updateBarcodeStatus } from "@/lib/storage";
import { AlertCircle, Package, Truck, CheckCircle } from "lucide-react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { toast } from "sonner";

interface DualStatusScannerProps {
  onBarcodesUpdated?: () => void;
}

export function DualStatusScanner({ onBarcodesUpdated }: DualStatusScannerProps) {
  // Scanner states
  const [packedScannerActive, setPackedScannerActive] = useState(false);
  const [shippedScannerActive, setShippedScannerActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Scanner refs
  const packedScannerRef = useRef<Html5QrcodeScanner | null>(null);
  const shippedScannerRef = useRef<Html5QrcodeScanner | null>(null);
  
  // Results tracking
  const [recentPackedResults, setRecentPackedResults] = useState<Barcode[]>([]);
  const [recentShippedResults, setRecentShippedResults] = useState<Barcode[]>([]);
  
  // Location dialog - simplified to use only one state
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [shippingLocation, setShippingLocation] = useState("");
  const [currentSessionLocation, setCurrentSessionLocation] = useState<string | null>(null);
  
  // Use ref to store location immediately for reliable access
  const sessionLocationRef = useRef<string | null>(null);

  // Clean up scanners on unmount
  useEffect(() => {
    return () => {
      stopPackedScanner();
      stopShippedScanner();
    };
  }, []);

  // Start packed scanner (for updating PENDING to PACKED)
  const startPackedScanner = async () => {
    try {
      setError(null);
      
      // Clean up existing scanner
      if (packedScannerRef.current) {
        await packedScannerRef.current.clear();
        packedScannerRef.current = null;
      }
      
      // Create new scanner instance
      const scanner = new Html5QrcodeScanner(
        "packed-scanner",
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
      
      packedScannerRef.current = scanner;
      
      // Configure scanner with continuous scanning
      scanner.render(
        async (decodedText) => {
          console.log("Packed scanner detected:", decodedText);
          await handlePackedScan(decodedText);
          // Note: We don't stop scanner - it continues running
        },
        (error) => {
          // This is called for each scan attempt, so we don't want to log every error
          // console.warn("QR scan error:", error);
        }
      );
      
      setPackedScannerActive(true);
    } catch (err) {
      console.error("Error starting packed scanner:", err);
      setError("Failed to start camera. Please allow camera permissions and try again.");
    }
  };

  // Start shipped scanner (for updating PACKED to SHIPPED)
  const startShippedScanner = async () => {
    try {
      setError(null);
      
      // First show the location dialog to get location for this session
      setLocationDialogOpen(true);
      
    } catch (err) {
      console.error("Error preparing shipped scanner:", err);
      setError("Failed to start scanner setup.");
    }
  };
  
  // Initialize the shipped scanner after location is set
  const initializeShippedScanner = async () => {
    try {
      // Clean up existing scanner
      if (shippedScannerRef.current) {
        await shippedScannerRef.current.clear();
        shippedScannerRef.current = null;
      }
      
      // Create new scanner instance
      const scanner = new Html5QrcodeScanner(
        "shipped-scanner",
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
      
      shippedScannerRef.current = scanner;
      
      // Configure scanner with continuous scanning
      scanner.render(
        async (decodedText) => {
          console.log("Shipped scanner detected:", decodedText);
          await handleShippedScan(decodedText);
          // Note: We don't stop scanner - it continues running
        },
        (error) => {
          // This is called for each scan attempt, so we don't want to log every error
          // console.warn("QR scan error:", error);
        }
      );
      
      setShippedScannerActive(true);
      
    } catch (err) {
      console.error("Error starting shipped scanner:", err);
      setError("Failed to start camera. Please allow camera permissions and try again.");
    }
  };
  
  // Handle location dialog submit - simplified approach
  const handleLocationSubmit = () => {
    if (!shippingLocation.trim()) {
      setError("Shipping location is required");
      return;
    }
    
    const newLocation = shippingLocation.trim();
    console.log("[handleLocationSubmit] Setting shipping location to:", newLocation);
    
    // Store in ref FIRST for immediate access (before any async operations)
    sessionLocationRef.current = newLocation;
    
    // Then update state
    setCurrentSessionLocation(newLocation);
    
    console.log("[handleLocationSubmit] Location stored in ref:", sessionLocationRef.current);
    console.log("[handleLocationSubmit] Location stored in state:", newLocation);
    
    setLocationDialogOpen(false);
    setShippingLocation("");
    setError(null);
    
    // Initialize scanner after location is set
    // Use a small delay to ensure state updates are processed
    setTimeout(() => {
      console.log("[handleLocationSubmit] Initializing scanner with location:", sessionLocationRef.current);
      initializeShippedScanner();
    }, 100);
  };

  // Stop packed scanner
  const stopPackedScanner = async () => {
    if (packedScannerRef.current) {
      try {
        await packedScannerRef.current.clear();
        packedScannerRef.current = null;
        setPackedScannerActive(false);
      } catch (err) {
        console.warn("Error stopping packed scanner:", err);
      }
    }
  };

  // Stop shipped scanner
  const stopShippedScanner = async () => {
    if (shippedScannerRef.current) {
      try {
        await shippedScannerRef.current.clear();
        shippedScannerRef.current = null;
        setShippedScannerActive(false);
        // Clear the session location when stopping
        setCurrentSessionLocation(null);
        sessionLocationRef.current = null;
      } catch (err) {
        console.warn("Error stopping shipped scanner:", err);
      }
    }
  };

  // Handle scan from packed scanner
  const handlePackedScan = async (code: string) => {
    try {
      const barcode = await findBarcodeByCode(code);
      
      if (!barcode) {
        toast.error(`QR code not found: ${code}`);
        return;
      }
      
      // Only allow PENDING status to be updated
      if (barcode.status !== PackingStatus.PENDING) {
        toast.error(`Package status is ${barcode.status}, expected ${PackingStatus.PENDING}`);
        return;
      }
      
      // Auto-generate weight and packer name (no dialog)
      const weight = `${(Math.random() * 9 + 1).toFixed(1)}kg`;
      const packerName = "Auto Scanner";
      
      // Update status to PACKED
      const updated = await updateBarcodeStatus(
        code,
        PackingStatus.PACKED,
        {
          weight,
          packerName
        }
      );
      
      if (updated) {
        // Show temporary success notification
        toast.success(`Package marked as packed: ${code}`);
        
        // Add to recent results (keeping only the 5 most recent)
        setRecentPackedResults(prev => {
          const newResults = [updated, ...prev];
          return newResults.slice(0, 5);
        });
        
        // Notify parent component
        if (onBarcodesUpdated) {
          onBarcodesUpdated();
        }
      } else {
        toast.error("Failed to update package status");
      }
      
    } catch (error) {
      console.error("Error in handlePackedScan:", error);
      toast.error("Error processing barcode");
    }
  };

  // Handle scan from shipped scanner
  const handleShippedScan = async (code: string) => {
    try {
      const barcode = await findBarcodeByCode(code);
      
      if (!barcode) {
        toast.error(`QR code not found: ${code}`);
        return;
      }
      
      // Only allow PACKED status to be updated
      if (barcode.status !== PackingStatus.PACKED) {
        toast.error(`Package status is ${barcode.status}, expected ${PackingStatus.PACKED}`);
        return;
      }
      
      // Use ref for immediate access to location (most reliable)
      // Also check state as fallback
      const locationToUse = sessionLocationRef.current || currentSessionLocation;
      
      console.log("[handleShippedScan] Barcode code:", code);
      console.log("[handleShippedScan] Location from ref:", sessionLocationRef.current);
      console.log("[handleShippedScan] Location from state:", currentSessionLocation);
      console.log("[handleShippedScan] Final location to use:", locationToUse);
      
      if (!locationToUse || locationToUse.trim() === '') {
        console.error("[handleShippedScan] ERROR: No shipping location available!");
        toast.error("No shipping location set. Please restart the scanner and set a location.");
        return;
      }
      
      // Update status to SHIPPED with current session location
      console.log("[handleShippedScan] Calling updateBarcodeStatus with:", {
        code,
        status: PackingStatus.DISPATCHED,
        shippingLocation: locationToUse
      });
      
      const updated = await updateBarcodeStatus(
        code,
        PackingStatus.DISPATCHED,
        {
          shippingLocation: locationToUse.trim()
        }
      );
      
      console.log("[handleShippedScan] Update result:", updated);
      console.log("[handleShippedScan] Updated barcode shippingLocation:", updated?.shippingLocation);
      
      if (updated) {
        // Show temporary success notification
        toast.success(`Package shipped to ${locationToUse}: ${code}`);
        
        // Add to recent results (keeping only the 5 most recent)
        setRecentShippedResults(prev => {
          const newResults = [updated, ...prev];
          return newResults.slice(0, 5);
        });
        
        // Notify parent component
        if (onBarcodesUpdated) {
          onBarcodesUpdated();
        }
      } else {
        toast.error("Failed to update package status");
      }
      
    } catch (error) {
      console.error("[handleShippedScan] Error processing barcode:", error);
      toast.error("Error processing barcode");
    }
  };
  
  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Packed Scanner */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" />
              Pack Scanner
            </CardTitle>
            <CardDescription>
              Scan QR codes to mark packages as packed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div id="packed-scanner" className="w-full min-h-[250px] border rounded"></div>
              
              <div className="flex justify-center gap-4">
                {!packedScannerActive ? (
                  <Button 
                    onClick={startPackedScanner}
                    className="flex-1"
                    variant="default"
                  >
                    Start Pack Scanner
                  </Button>
                ) : (
                  <Button 
                    onClick={stopPackedScanner}
                    className="flex-1"
                    variant="destructive"
                  >
                    Stop Scanner
                  </Button>
                )}
              </div>
            </div>
            
            {/* Recent results */}
            {recentPackedResults.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">Recent Packed Items:</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {recentPackedResults.map((barcode, index) => (
                    <div key={`packed-${index}`} className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span className="font-mono">{barcode.code}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Shipped Scanner */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-orange-600" />
              Ship Scanner
            </CardTitle>
            <CardDescription>
              Scan QR codes to mark packages as shipped
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div id="shipped-scanner" className="w-full min-h-[250px] border rounded"></div>
              
              <div className="flex justify-center gap-4">
                {!shippedScannerActive ? (
                  <Button 
                    onClick={startShippedScanner}
                    className="flex-1"
                    variant="default"
                  >
                    Start Ship Scanner
                  </Button>
                ) : (
                  <Button 
                    onClick={stopShippedScanner}
                    className="flex-1"
                    variant="destructive"
                  >
                    Stop Scanner
                  </Button>
                )}
              </div>
              
              {currentSessionLocation && (
                <div className="text-center text-sm">
                  <span className="font-medium">Current Shipping Location: </span>
                  <span className="text-orange-600">{currentSessionLocation}</span>
                </div>
              )}
            </div>
            
            {/* Recent results */}
            {recentShippedResults.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">Recent Shipped Items:</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {recentShippedResults.map((barcode, index) => (
                    <div key={`shipped-${index}`} className="flex items-center gap-2 text-sm text-orange-600">
                      <CheckCircle className="h-4 w-4" />
                      <span className="font-mono">{barcode.code}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {/* Location Dialog */}
      <Dialog open={locationDialogOpen} onOpenChange={setLocationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Shipping Location</DialogTitle>
            <DialogDescription>
              Enter the shipping location for this scanning session.
              This location will be applied to all QR codes scanned.
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleLocationSubmit();
                  }
                }}
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
            <Button variant="outline" onClick={() => setLocationDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleLocationSubmit}>
              Start Scanning
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";

export function ResetQRCodes({ onReset }: { onReset: () => void }) {
  const [isResetting, setIsResetting] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const resetAllQRCodes = async () => {
    setIsResetting(true);
    setError(null);
    setSuccess(null);

    try {
      console.log("Attempting to reset all QR codes to pending status");
      
      // Update all QR codes in Supabase to pending status
      const { error } = await supabase
        .from('app_e74012970c_qr_codes')
        .update({ status: 'pending' })
        .neq('code', ''); // Update all records
      
      if (error) {
        console.error("Error resetting QR codes:", error);
        setError("Failed to reset QR codes. Please try again.");
      } else {
        setSuccess("All QR codes have been reset to pending status.");
        onReset();
      }
    } catch (err) {
      console.error("Unexpected error during reset:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsResetting(false);
      setShowDialog(false);
    }
  };

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-red-600 flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Debug Tools
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            These tools help resolve issues with QR codes. Use with caution.
          </p>
          
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {success && (
            <Alert className="mb-4 bg-green-50 text-green-800 border-green-200">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        
        <CardFooter>
          <Button 
            variant="destructive" 
            onClick={() => setShowDialog(true)} 
            disabled={isResetting}
          >
            {isResetting ? "Resetting..." : "Reset All QR Codes to Pending"}
          </Button>
        </CardFooter>
      </Card>
      
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset All QR Codes?</DialogTitle>
            <DialogDescription>
              This will reset the status of all QR codes to "pending" state. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={resetAllQRCodes} disabled={isResetting}>
              Yes, Reset All QR Codes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
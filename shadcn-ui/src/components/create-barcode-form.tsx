import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { generateBarcodeCode } from "@/lib/barcode-generator";
import { generateQRCodeDataURL } from "@/lib/qr-generator";
import { Barcode, BarcodeFormData, PackingStatus } from "@/types";
import { saveBarcode } from "@/lib/storage";
import { BulkBarcodeGenerator } from "./bulk-barcode-generator";
import { AlertCircle } from "lucide-react";

export function CreateBarcodeForm({ onBarcodeCreated }: { onBarcodeCreated: () => void }) {
  const [formData, setFormData] = useState<BarcodeFormData>({
    description: "",
    packer: ""
  });
  const [generatingQR, setGeneratingQR] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"single" | "bulk">("single");
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setGeneratingQR(true);
    
    try {
      // Generate unique barcode code
      const code = await generateBarcodeCode("PKG");
      
      // Generate QR code image
      const qrCodeImage = await generateQRCodeDataURL(code);
      
      // Create barcode object
      const barcode: Barcode = {
        id: crypto.randomUUID(),
        code,
        description: formData.description || undefined,
        createdAt: new Date().toISOString(),
        qrCodeImage,
        status: PackingStatus.PENDING,
        packer: formData.packer || undefined
      };
      
      // Save barcode to storage
      const success = await saveBarcode(barcode);
      
      if (!success) {
        setError("Failed to save QR code. Please try again.");
        return;
      }
      
      // Reset form
      setFormData({
        description: "",
        packer: ""
      });
      
      // Notify parent component
      onBarcodeCreated();
      
    } catch (error) {
      console.error("Error creating QR code:", error);
      setError("Failed to create QR code. Please try again.");
    } finally {
      setGeneratingQR(false);
    }
  };
  
  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "single" | "bulk")} className="w-full max-w-md">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="single">Single QR Code</TabsTrigger>
        <TabsTrigger value="bulk">Bulk Generator</TabsTrigger>
      </TabsList>
      
      <TabsContent value="single">
        <Card>
          <CardHeader>
            <CardTitle>Create QR Code</CardTitle>
            <CardDescription>Generate a single QR code for package tracking</CardDescription>
          </CardHeader>
          
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="description">Package Description (Optional)</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Enter package details"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="packer">Packer Name (Optional)</Label>
                <Input
                  id="packer"
                  name="packer"
                  placeholder="Enter packer name"
                  value={formData.packer}
                  onChange={handleInputChange}
                />
              </div>
            </CardContent>
            
            <CardFooter>
              <Button type="submit" disabled={generatingQR}>
                {generatingQR ? "Generating..." : "Generate QR Code"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </TabsContent>
      
      <TabsContent value="bulk">
        <BulkBarcodeGenerator onBarcodeCreated={onBarcodeCreated} />
      </TabsContent>
    </Tabs>
  );
}
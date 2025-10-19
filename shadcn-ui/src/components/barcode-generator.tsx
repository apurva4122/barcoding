import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Barcode, PackingStatus } from "@/types";
import { saveBarcode, getAllBarcodes } from "@/lib/storage";
import { getPresentPackersForDate } from "@/lib/attendance-utils";
import { QRCodeSVG } from "qrcode.react";
import { Package, Download, Plus, AlertCircle, CheckCircle, Loader2, Users, Hash, Shuffle, UserCheck } from "lucide-react";
import { toast } from "sonner";

interface BarcodeGeneratorProps {
  onBarcodeGenerated?: () => void;
}

export function BarcodeGenerator({ onBarcodeGenerated }: BarcodeGeneratorProps) {
  const [barcodes, setBarcodes] = useState<Barcode[]>([]);
  const [presentPackers, setPresentPackers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkGenerating, setBulkGenerating] = useState(false);

  // Single barcode form
  const [singleForm, setSingleForm] = useState({
    description: "",
    assignedWorker: ""
  });

  // Bulk barcode form
  const [bulkForm, setBulkForm] = useState({
    prefix: "PKG-",
    quantity: 10,
    baseDescription: "",
    assignmentMode: "equal", // "equal", "single", "random"
    assignedWorker: ""
  });

  const [error, setError] = useState<string | null>(null);
  const [bulkResults, setBulkResults] = useState<{
    success: number;
    failed: number;
    codes: string[];
    assignments: { [key: string]: number };
  } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [barcodesData, packersData] = await Promise.all([
        getAllBarcodes(),
        getPresentPackersForDate(new Date().toISOString().split('T')[0])
      ]);
      
      setBarcodes(barcodesData);
      setPresentPackers(packersData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  // Generate unique barcode code
  const generateBarcodeCode = (prefix: string = ""): string => {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    if (prefix) {
      return `${prefix}${timestamp}-${randomSuffix}`;
    }
    
    return `PKG-${timestamp}-${randomSuffix}`;
  };

  // Generate single barcode
  const generateSingleBarcode = async () => {
    if (!singleForm.description.trim()) {
      setError("Description is required");
      return;
    }

    // Validate worker assignment
    if (singleForm.assignedWorker && singleForm.assignedWorker !== "none" && !presentPackers.some(p => p.name === singleForm.assignedWorker)) {
      setError("Selected worker is not a present packer");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const newBarcode: Barcode = {
        id: `barcode-${Date.now()}`,
        code: generateBarcodeCode(),
        description: singleForm.description.trim(),
        status: PackingStatus.PENDING,
        assignedWorker: (singleForm.assignedWorker && singleForm.assignedWorker !== "none") ? singleForm.assignedWorker : undefined,
        createdAt: new Date().toISOString()
      };

      await saveBarcode(newBarcode);
      await loadData(); // Refresh data

      // Reset form
      setSingleForm({
        description: "",
        assignedWorker: ""
      });

      toast.success("Barcode generated successfully");

      if (onBarcodeGenerated) {
        onBarcodeGenerated();
      }
    } catch (error) {
      console.error("Error generating barcode:", error);
      setError("Failed to generate barcode");
    } finally {
      setLoading(false);
    }
  };

  // Assign worker based on mode
  const assignWorker = (index: number, mode: string, specificWorker?: string): string | undefined => {
    if (presentPackers.length === 0) return undefined;

    switch (mode) {
      case "single":
        return specificWorker;
      case "random":
        return presentPackers[Math.floor(Math.random() * presentPackers.length)].name;
      case "equal":
      default:
        return presentPackers[index % presentPackers.length].name;
    }
  };

  // Generate bulk barcodes
  const generateBulkBarcodes = async () => {
    if (!bulkForm.prefix.trim()) {
      setError("Prefix is required for bulk generation");
      return;
    }

    if (bulkForm.quantity < 1 || bulkForm.quantity > 1000) {
      setError("Quantity must be between 1 and 1000");
      return;
    }

    // Validate single worker assignment
    if (bulkForm.assignmentMode === "single" && !bulkForm.assignedWorker) {
      setError("Please select a worker for single assignment mode");
      return;
    }

    if (bulkForm.assignmentMode === "single" && !presentPackers.some(p => p.name === bulkForm.assignedWorker)) {
      setError("Selected worker is not a present packer");
      return;
    }

    // Check if packers are available for equal/random assignment
    if ((bulkForm.assignmentMode === "equal" || bulkForm.assignmentMode === "random") && presentPackers.length === 0) {
      setError("No present packers available for assignment");
      return;
    }

    setBulkGenerating(true);
    setBulkProgress(0);
    setError(null);
    setBulkResults(null);

    const results = {
      success: 0,
      failed: 0,
      codes: [] as string[],
      assignments: {} as { [key: string]: number }
    };

    // Initialize assignment counters
    presentPackers.forEach(packer => {
      results.assignments[packer.name] = 0;
    });

    try {
      const batchSize = 10; // Process in batches to avoid blocking UI
      const totalBatches = Math.ceil(bulkForm.quantity / batchSize);

      for (let batch = 0; batch < totalBatches; batch++) {
        const batchStart = batch * batchSize;
        const batchEnd = Math.min(batchStart + batchSize, bulkForm.quantity);
        
        const batchPromises = [];
        
        for (let i = batchStart; i < batchEnd; i++) {
          const sequentialNumber = String(i + 1).padStart(4, '0');
          const code = `${bulkForm.prefix}${sequentialNumber}`;
          const description = bulkForm.baseDescription.trim() 
            ? `${bulkForm.baseDescription.trim()} #${sequentialNumber}`
            : `Package ${code}`;

          const assignedWorker = assignWorker(i, bulkForm.assignmentMode, bulkForm.assignedWorker);

          const newBarcode: Barcode = {
            id: `barcode-${Date.now()}-${i}`,
            code: code,
            description: description,
            status: PackingStatus.PENDING,
            assignedWorker: assignedWorker,
            createdAt: new Date().toISOString()
          };

          batchPromises.push(
            saveBarcode(newBarcode)
              .then(() => {
                results.success++;
                results.codes.push(newBarcode.code);
                if (assignedWorker) {
                  results.assignments[assignedWorker] = (results.assignments[assignedWorker] || 0) + 1;
                }
              })
              .catch((error) => {
                console.error(`Failed to save barcode ${newBarcode.code}:`, error);
                results.failed++;
              })
          );
        }

        await Promise.all(batchPromises);
        
        // Update progress
        const progress = ((batch + 1) / totalBatches) * 100;
        setBulkProgress(progress);

        // Small delay to allow UI updates
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      await loadData(); // Refresh data
      setBulkResults(results);

      // Reset form
      setBulkForm({
        prefix: "PKG-",
        quantity: 10,
        baseDescription: "",
        assignmentMode: "equal",
        assignedWorker: ""
      });

      toast.success(`Bulk generation completed: ${results.success} barcodes generated`);

      if (onBarcodeGenerated) {
        onBarcodeGenerated();
      }
    } catch (error) {
      console.error("Error in bulk generation:", error);
      setError("Failed to complete bulk generation");
    } finally {
      setBulkGenerating(false);
      setBulkProgress(0);
    }
  };

  // Download barcode as image
  const downloadBarcode = (barcode: Barcode) => {
    const svg = document.getElementById(`qr-${barcode.id}`)?.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      
      const link = document.createElement("a");
      link.download = `${barcode.code}.png`;
      link.href = canvas.toDataURL();
      link.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  // Download all barcodes as CSV
  const downloadAllBarcodes = () => {
    if (barcodes.length === 0) {
      toast.error("No barcodes to export");
      return;
    }

    const csvContent = [
      "Code,Description,Status,Assigned Worker,Created At",
      ...barcodes.map(barcode => 
        `${barcode.code},"${barcode.description}",${barcode.status},${barcode.assignedWorker || ''},${barcode.createdAt}`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `barcodes-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success("Barcodes exported successfully");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Barcode Generator</h2>
          <p className="text-muted-foreground">Generate single barcodes or bulk generate multiple barcodes with flexible assignment options</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadAllBarcodes} disabled={barcodes.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export All ({barcodes.length})
          </Button>
        </div>
      </div>

      {/* Present Packers Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Present Packers ({presentPackers.length})
          </CardTitle>
          <CardDescription>
            Available packers for barcode assignment
          </CardDescription>
        </CardHeader>
        <CardContent>
          {presentPackers.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {presentPackers.map((packer) => (
                <Badge key={packer.id} variant="secondary" className="flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  {packer.name} ({packer.employeeId})
                </Badge>
              ))}
            </div>
          ) : (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No packers are present today. Please ensure workers are designated as packers and marked present in the Attendance tab.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Generator Tabs */}
      <Tabs defaultValue="single" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="single" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Single Barcode
          </TabsTrigger>
          <TabsTrigger value="bulk" className="flex items-center gap-2">
            <Hash className="h-4 w-4" />
            Bulk Generation
          </TabsTrigger>
        </TabsList>

        {/* Single Barcode Generation */}
        <TabsContent value="single">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Generate Single Barcode
              </CardTitle>
              <CardDescription>
                Create a single barcode with custom description and optional worker assignment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="single-description">Description *</Label>
                  <Input
                    id="single-description"
                    value={singleForm.description}
                    onChange={(e) => setSingleForm({...singleForm, description: e.target.value})}
                    placeholder="Package description"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="single-worker">Assign to Packer (Optional)</Label>
                  <Select 
                    value={singleForm.assignedWorker} 
                    onValueChange={(value) => setSingleForm({...singleForm, assignedWorker: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a packer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No assignment</SelectItem>
                      {presentPackers.map((packer) => (
                        <SelectItem key={packer.id} value={packer.name}>
                          📦 {packer.name} ({packer.employeeId})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button onClick={generateSingleBarcode} disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Generate Barcode
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bulk Barcode Generation */}
        <TabsContent value="bulk">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="h-5 w-5" />
                Bulk Barcode Generation
              </CardTitle>
              <CardDescription>
                Generate multiple barcodes with sequential codes and flexible assignment options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bulk-prefix">Code Prefix *</Label>
                  <Input
                    id="bulk-prefix"
                    value={bulkForm.prefix}
                    onChange={(e) => setBulkForm({...bulkForm, prefix: e.target.value})}
                    placeholder="PKG-, BOX-, ITEM-"
                  />
                  <p className="text-xs text-muted-foreground">
                    Will generate: {bulkForm.prefix}0001, {bulkForm.prefix}0002, etc.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="bulk-quantity">Quantity *</Label>
                  <Input
                    id="bulk-quantity"
                    type="number"
                    min="1"
                    max="1000"
                    value={bulkForm.quantity}
                    onChange={(e) => setBulkForm({...bulkForm, quantity: parseInt(e.target.value) || 1})}
                    placeholder="Number of barcodes"
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum 1000 barcodes per batch
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bulk-description">Base Description (Optional)</Label>
                <Input
                  id="bulk-description"
                  value={bulkForm.baseDescription}
                  onChange={(e) => setBulkForm({...bulkForm, baseDescription: e.target.value})}
                  placeholder="Base description for all barcodes"
                />
                <p className="text-xs text-muted-foreground">
                  Each barcode will have: "{bulkForm.baseDescription || 'Package'} #0001", "#0002", etc.
                </p>
              </div>

              {/* Assignment Mode */}
              <div className="space-y-3">
                <Label>Assignment Mode</Label>
                <RadioGroup
                  value={bulkForm.assignmentMode}
                  onValueChange={(value) => setBulkForm({...bulkForm, assignmentMode: value, assignedWorker: ""})}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="equal" id="equal" />
                    <Label htmlFor="equal" className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4" />
                      Equal Distribution - Distribute barcodes equally among all present packers
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="random" id="random" />
                    <Label htmlFor="random" className="flex items-center gap-2">
                      <Shuffle className="h-4 w-4" />
                      Random Assignment - Randomly assign each barcode to any present packer
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="single" id="single" />
                    <Label htmlFor="single" className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Single Packer - Assign all barcodes to one specific packer
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Single Worker Selection */}
              {bulkForm.assignmentMode === "single" && (
                <div className="space-y-2">
                  <Label htmlFor="bulk-worker">Select Packer *</Label>
                  <Select 
                    value={bulkForm.assignedWorker} 
                    onValueChange={(value) => setBulkForm({...bulkForm, assignedWorker: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a packer" />
                    </SelectTrigger>
                    <SelectContent>
                      {presentPackers.map((packer) => (
                        <SelectItem key={packer.id} value={packer.name}>
                          📦 {packer.name} ({packer.employeeId})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Bulk Generation Progress */}
              {bulkGenerating && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Generation Progress</Label>
                    <span className="text-sm text-muted-foreground">{Math.round(bulkProgress)}%</span>
                  </div>
                  <Progress value={bulkProgress} className="w-full" />
                </div>
              )}

              {/* Bulk Results */}
              {bulkResults && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p><strong>Bulk generation completed!</strong></p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>✅ Generated: {bulkResults.success}</div>
                        {bulkResults.failed > 0 && <div>❌ Failed: {bulkResults.failed}</div>}
                      </div>
                      {Object.keys(bulkResults.assignments).length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm font-medium">Assignment Summary:</p>
                          <div className="grid grid-cols-2 gap-1 text-xs">
                            {Object.entries(bulkResults.assignments).map(([worker, count]) => (
                              count > 0 && <div key={worker}>📦 {worker}: {count}</div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button 
                onClick={generateBulkBarcodes} 
                disabled={bulkGenerating || bulkForm.quantity < 1} 
                className="w-full"
              >
                {bulkGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating {bulkForm.quantity} barcodes...
                  </>
                ) : (
                  <>
                    <Hash className="h-4 w-4 mr-2" />
                    Generate {bulkForm.quantity} Barcodes
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Recent Barcodes */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Barcodes</CardTitle>
          <CardDescription>
            Latest generated barcodes with QR codes and assignment information
          </CardDescription>
        </CardHeader>
        <CardContent>
          {barcodes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {barcodes
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 12)
                .map((barcode) => (
                  <div key={barcode.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-mono text-sm font-medium">{barcode.code}</p>
                        <p className="text-sm text-muted-foreground">{barcode.description}</p>
                      </div>
                      <Badge variant={
                        barcode.status === PackingStatus.DELIVERED ? "default" :
                        barcode.status === PackingStatus.DISPATCHED ? "secondary" :
                        barcode.status === PackingStatus.PACKED ? "outline" : "destructive"
                      }>
                        {barcode.status}
                      </Badge>
                    </div>
                    
                    <div className="flex justify-center">
                      <QRCodeSVG
                        id={`qr-${barcode.id}`}
                        value={barcode.code}
                        size={120}
                        level="M"
                        includeMargin={true}
                      />
                    </div>
                    
                    {barcode.assignedWorker && (
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4" />
                        <span>Assigned to: {barcode.assignedWorker}</span>
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadBarcode(barcode)}
                        className="flex-1"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No barcodes generated yet.</p>
              <p className="text-sm">Generate your first barcode to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
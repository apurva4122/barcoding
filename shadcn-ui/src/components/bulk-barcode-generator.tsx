import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { generateBarcodeCode } from "@/lib/barcode-generator";
import { generateQRCodeDataURL } from "@/lib/qr-generator";
import { Barcode, PackingStatus, Worker, Gender } from "@/types";
import { saveBarcodes, getAllBarcodes } from "@/lib/storage";
import { getAllWorkers, saveWorker, deleteWorker } from "@/lib/attendance-utils";
import { saveBarcodeAssignments, getWorkerForBarcode } from "@/lib/supabase";
import * as XLSX from 'xlsx';
import { Download, Plus, Trash2, Users } from "lucide-react";

interface PrintableQrCode {
  code: string;
  dataUrl: string;
  assignedWorker?: string;
}

interface WorkerAssignment {
  worker: string;
  count: number;
}

export function BulkBarcodeGenerator({ onBarcodeCreated }: { onBarcodeCreated: () => void }) {
  const [count, setCount] = useState(10);
  const [prefix, setPrefix] = useState("PKG");
  const [description, setDescription] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState<PrintableQrCode[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Worker management state
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [newWorkerName, setNewWorkerName] = useState("");
  const [isLoadingWorkers, setIsLoadingWorkers] = useState(false);
  const [workerAssignments, setWorkerAssignments] = useState<WorkerAssignment[]>([]);
  const [useEqualDistribution, setUseEqualDistribution] = useState(true);

  // Load workers on component mount
  useEffect(() => {
    loadWorkers();
  }, []);

  // Update worker assignments when workers or count changes
  useEffect(() => {
    if (useEqualDistribution && workers.length > 0) {
      distributeEqually();
    }
  }, [workers, count, useEqualDistribution]);

  const loadWorkers = async () => {
    setIsLoadingWorkers(true);
    try {
      const workersList = await getAllWorkers(true); // Include inactive workers for barcode assignment
      setWorkers(workersList);
    } catch (error) {
      console.error('Error loading workers:', error);
      setError('Failed to load workers');
    } finally {
      setIsLoadingWorkers(false);
    }
  };

  const handleAddWorker = async () => {
    if (!newWorkerName.trim()) return;

    try {
      const newWorker: Worker = {
        id: `worker-${Date.now()}`,
        name: newWorkerName.trim(),
        employeeId: `EMP${Date.now()}`,
        gender: Gender.MALE, // Default gender
        isPacker: false,
        isActive: true,
        createdAt: new Date().toISOString()
      };
      const success = await saveWorker(newWorker);
      if (success) {
        setWorkers(prev => [...prev, newWorker]);
        setNewWorkerName("");
      } else {
        setError('Failed to add worker');
      }
    } catch (error) {
      console.error('Error adding worker:', error);
      setError('Failed to add worker');
    }
  };

  const handleDeleteWorker = async (workerId: string) => {
    try {
      const success = await deleteWorker(workerId);
      if (success) {
        setWorkers(prev => prev.filter(w => w.id !== workerId));
        // Remove from assignments
        setWorkerAssignments(prev => prev.filter(wa => wa.worker !== workers.find(w => w.id === workerId)?.name));
      } else {
        setError('Failed to delete worker');
      }
    } catch (error) {
      console.error('Error deleting worker:', error);
      setError('Failed to delete worker');
    }
  };

  const distributeEqually = () => {
    if (workers.length === 0) {
      setWorkerAssignments([]);
      return;
    }

    const baseCount = Math.floor(count / workers.length);
    const remainder = count % workers.length;

    const assignments: WorkerAssignment[] = workers.map((worker, index) => ({
      worker: worker.name,
      count: baseCount + (index === workers.length - 1 ? remainder : 0)
    }));

    setWorkerAssignments(assignments);
  };

  const handleWorkerAssignmentChange = (workerName: string, newCount: number) => {
    setWorkerAssignments(prev =>
      prev.map(wa =>
        wa.worker === workerName
          ? { ...wa, count: Math.max(0, Math.floor(newCount)) }
          : wa
      )
    );
  };

  const getTotalAssigned = () => {
    return workerAssignments.reduce((sum, wa) => sum + wa.count, 0);
  };

  const handleGenerateBulk = async () => {
    if (count <= 0 || count > 100) {
      setError("Please enter a number between 1 and 100");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Get current date in YYMMDD format for serial numbering
      const today = new Date();
      const year = today.getFullYear().toString().slice(-2);
      const month = (today.getMonth() + 1).toString().padStart(2, '0');
      const day = today.getDate().toString().padStart(2, '0');
      const dateStr = `${year}${month}${day}`;

      // Get existing barcodes count for today to start serial numbering correctly
      const existingBarcodes = await getAllBarcodes();
      const todayBarcodes = existingBarcodes.filter(barcode =>
        barcode.code.startsWith(dateStr)
      );
      let currentSerial = todayBarcodes.length;

      // Generate codes with sequential serial numbers
      const codes: string[] = [];
      for (let i = 0; i < count; i++) {
        currentSerial += 1;
        const serialStr = currentSerial.toString().padStart(5, '0');
        const code = `${dateStr}${serialStr}`;
        codes.push(code);
      }

      // Assign codes to workers
      let codeIndex = 0;
      const assignments: { barcode_code: string, worker_name: string }[] = [];

      // Generate QR codes with worker assignments
      const printableCodes: PrintableQrCode[] = [];
      const barcodesToSave: Barcode[] = [];

      for (const code of codes) {
        try {
          const qrCodeImage = await generateQRCodeDataURL(code);

          // Determine assigned worker
          let assignedWorker = '';
          if (workerAssignments.length > 0) {
            // Find which worker this code should be assigned to
            let currentIndex = 0;
            for (const assignment of workerAssignments) {
              if (codeIndex >= currentIndex && codeIndex < currentIndex + assignment.count) {
                assignedWorker = assignment.worker;
                assignments.push({ barcode_code: code, worker_name: assignment.worker });
                console.log(`[BulkBarcodeGenerator] Assigned ${code} to worker: ${assignment.worker}`);
                break;
              }
              currentIndex += assignment.count;
            }
          } else {
            console.log(`[BulkBarcodeGenerator] No worker assignments configured for code ${code}`);
          }

          // Add to printable codes
          printableCodes.push({
            code,
            dataUrl: qrCodeImage,
            assignedWorker
          });

          // Add to barcodes to save in storage
          barcodesToSave.push({
            id: crypto.randomUUID(),
            code,
            description: description || `${prefix} Package`,
            createdAt: new Date().toISOString(),
            qrCodeImage,
            status: PackingStatus.PENDING
          });

          codeIndex++;
        } catch (error) {
          console.error(`Error generating QR code for ${code}:`, error);
        }
      }

      // Save barcodes to storage
      if (barcodesToSave.length > 0) {
        await saveBarcodes(barcodesToSave);
      }

      // Save worker assignments to Supabase if any (BEFORE triggering refresh)
      if (assignments.length > 0) {
        try {
          console.log('[BulkBarcodeGenerator] Saving worker assignments:', assignments);
          console.log(`[BulkBarcodeGenerator] Total assignments to save: ${assignments.length}`);
          console.log('[BulkBarcodeGenerator] Assignment details:', assignments.map(a => `${a.barcode_code} -> ${a.worker_name}`));
          
          await saveBarcodeAssignments(assignments);
          console.log('[BulkBarcodeGenerator] Worker assignments saved successfully to Supabase');
          
          // Small delay to ensure Supabase has processed the insert
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error: any) {
          console.error('[BulkBarcodeGenerator] ERROR: Failed to save barcode assignments:', error);
          console.error('[BulkBarcodeGenerator] Error details:', error?.message || JSON.stringify(error));
          // Show user-friendly error but don't fail the whole operation
          alert(`Warning: Worker assignments could not be saved to database. Error: ${error?.message || 'Unknown error'}. Please check browser console for details.`);
        }
      } else {
        console.log('[BulkBarcodeGenerator] No worker assignments to save (assignments array is empty)');
        console.log('[BulkBarcodeGenerator] Worker assignments state:', workerAssignments);
        console.log('[BulkBarcodeGenerator] Workers count:', workers.length);
      }

      // Trigger refresh AFTER assignments are saved
      onBarcodeCreated();

      // Set generated codes for display/printing
      setGeneratedCodes(printableCodes);
    } catch (error) {
      console.error("Error generating bulk codes:", error);
      setError("Failed to generate QR codes. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBulkCreateAndPrint = async () => {
    await handleGenerateBulk();
    // Wait briefly for the codes to be generated
    setTimeout(() => {
      if (generatedCodes.length > 0) {
        handlePrint();
      }
    }, 500);
  };

  const handlePrint = () => {
    if (!generatedCodes.length) return;

    // Create a new window for printing
    const printWindow = window.open('', '_blank');

    if (!printWindow) {
      alert("Could not open print window. Please check if pop-ups are blocked.");
      return;
    }

    // Create HTML content for printing
    let printContent = `
      <html>
      <head>
        <title>Print QR Codes</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 10px;
          }
          .qr-container {
            display: inline-block;
            margin: 10px;
            padding: 15px;
            border: 1px dashed #ccc;
            page-break-inside: avoid;
            text-align: center;
          }
          .qr-image {
            max-width: 200px;
            height: auto;
          }
          .qr-code {
            margin-top: 5px;
            font-size: 12px;
            color: #333;
          }
          @media print {
            .no-print {
              display: none;
            }
            body {
              padding: 0;
            }
            .qr-container {
              border: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 20px; text-align: center;">
          <button onclick="window.print();" style="padding: 10px 20px; font-size: 16px;">Print QR Codes</button>
        </div>
    `;

    // Add each QR code to the print content
    generatedCodes.forEach(qrCode => {
      printContent += `
        <div class="qr-container">
          <img class="qr-image" src="${qrCode.dataUrl}" alt="QR Code: ${qrCode.code}" />
          <div class="qr-code">${qrCode.code}</div>
        </div>
      `;
    });

    // Close the HTML content
    printContent += `
      </body>
      </html>
    `;

    // Write to the print window
    printWindow.document.open();
    printWindow.document.write(printContent);
    printWindow.document.close();

    // Focus the window for printing
    printWindow.focus();
  };

  const handleClear = () => {
    setGeneratedCodes([]);
  };

  const handleExportToExcel = async () => {
    try {
      // Get all barcodes from storage
      const allBarcodes = await getAllBarcodes();

      // Filter to only include the recently generated codes if any
      let barcodesToExport = allBarcodes;
      if (generatedCodes.length > 0) {
        const generatedCodeStrings = generatedCodes.map(gc => gc.code);
        barcodesToExport = allBarcodes.filter(barcode =>
          generatedCodeStrings.includes(barcode.code)
        );
      }

      // If no recent codes, export all barcodes
      if (barcodesToExport.length === 0) {
        barcodesToExport = allBarcodes;
      }

      // Get worker assignments for the exported barcodes using getWorkerForBarcode
      const assignments: { [key: string]: string } = {};
      try {
        for (const barcode of barcodesToExport) {
          const workerName = await getWorkerForBarcode(barcode.code);
          if (workerName) {
            assignments[barcode.code] = workerName;
          }
        }
      } catch (error) {
        console.error('Error loading assignments:', error);
      }

      // Prepare data for Excel export
      const exportData = barcodesToExport.map(barcode => ({
        'QR Code': barcode.code,
        'Description': barcode.description || '',
        'Status': barcode.status,
        'Assigned Worker': assignments[barcode.code] || '',
        'Packer': barcode.packer || '',
        'Weight (kg)': barcode.weight || '',
        'Shipping Location': barcode.shippingLocation || '',
        'Created At': new Date(barcode.createdAt).toLocaleString(),
        'Packed At': barcode.packedAt ? new Date(barcode.packedAt).toLocaleString() : '',
        'Shipped At': barcode.shippedAt ? new Date(barcode.shippedAt).toLocaleString() : ''
      }));

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Auto-size columns
      const colWidth = [
        { wch: 15 }, // QR Code
        { wch: 30 }, // Description
        { wch: 12 }, // Status
        { wch: 15 }, // Assigned Worker
        { wch: 15 }, // Packer
        { wch: 12 }, // Weight
        { wch: 20 }, // Shipping Location
        { wch: 18 }, // Created At
        { wch: 18 }, // Packed At
        { wch: 18 }  // Shipped At
      ];
      ws['!cols'] = colWidth;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'QR Codes');

      // Generate filename with current date
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
      const filename = `qr-codes-${dateStr}-${timeStr}.xlsx`;

      // Save file
      XLSX.writeFile(wb, filename);

    } catch (error) {
      console.error('Error exporting to Excel:', error);
      setError('Failed to export to Excel. Please try again.');
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Bulk QR Code Generator</CardTitle>
        <CardDescription>Generate multiple QR codes at once</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="count">Number of QR Codes (1-100)</Label>
          <Input
            id="count"
            type="number"
            value={count}
            min={1}
            max={100}
            onChange={(e) => setCount(parseInt(e.target.value) || 0)}
            disabled={isGenerating}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="prefix">Prefix</Label>
          <Input
            id="prefix"
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
            disabled={isGenerating}
            maxLength={5}
            placeholder="PKG"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description (Optional)</Label>
          <Input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isGenerating}
            placeholder="Bulk generated packages"
          />
        </div>

        <Separator />

        {/* Worker Management Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <Label className="text-sm font-semibold">Labor Management</Label>
          </div>

          {/* Add new worker */}
          <div className="flex gap-2">
            <Input
              placeholder="Enter worker name"
              value={newWorkerName}
              onChange={(e) => setNewWorkerName(e.target.value)}
              disabled={isLoadingWorkers || isGenerating}
              onKeyPress={(e) => e.key === 'Enter' && handleAddWorker()}
            />
            <Button
              onClick={handleAddWorker}
              disabled={!newWorkerName.trim() || isLoadingWorkers || isGenerating}
              size="sm"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Workers list */}
          {workers.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Workers ({workers.length})</Label>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {workers.map((worker) => (
                  <div key={worker.id} className="flex items-center justify-between p-2 border rounded">
                    <span className="text-sm">{worker.name}</span>
                    <Button
                      onClick={() => handleDeleteWorker(worker.id)}
                      variant="ghost"
                      size="sm"
                      disabled={isGenerating}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Worker assignments */}
          {workers.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">QR Code Assignments</Label>
                <Button
                  onClick={() => setUseEqualDistribution(!useEqualDistribution)}
                  variant="ghost"
                  size="sm"
                  disabled={isGenerating}
                >
                  {useEqualDistribution ? 'Custom' : 'Equal'}
                </Button>
              </div>

              {useEqualDistribution ? (
                <div className="text-xs text-muted-foreground">
                  {count} codes will be distributed equally among {workers.length} workers
                </div>
              ) : (
                <div className="space-y-2 max-h-24 overflow-y-auto">
                  {workerAssignments.map((assignment) => (
                    <div key={assignment.worker} className="flex items-center justify-between">
                      <span className="text-sm">{assignment.worker}</span>
                      <Input
                        type="number"
                        min="0"
                        max={count}
                        value={assignment.count}
                        onChange={(e) => handleWorkerAssignmentChange(assignment.worker, parseInt(e.target.value) || 0)}
                        className="w-16 h-8"
                        disabled={isGenerating}
                      />
                    </div>
                  ))}
                  <div className="text-xs text-muted-foreground">
                    Total assigned: {getTotalAssigned()} / {count}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <Separator />

        {/* Always show Excel export button for all barcodes */}
        <div>
          <Button
            onClick={handleExportToExcel}
            variant="outline"
            className="w-full flex items-center gap-2"
            disabled={isGenerating}
          >
            <Download className="h-4 w-4" />
            Export All QR Codes to Excel
          </Button>
        </div>
      </CardContent>

      <CardFooter className="flex flex-wrap justify-between gap-2">
        <Button
          onClick={handleGenerateBulk}
          disabled={isGenerating}
          variant="outline"
        >
          {isGenerating ? "Generating..." : "Generate QR Codes"}
        </Button>

        <Button
          onClick={handleBulkCreateAndPrint}
          disabled={isGenerating}
        >
          Create & Print QR Codes
        </Button>

        {generatedCodes.length > 0 && (
          <>
            <Button
              variant="outline"
              onClick={handleClear}
              className="mr-auto"
            >
              Clear
            </Button>

            <Button
              onClick={handlePrint}
              variant="secondary"
            >
              Print {generatedCodes.length} QR Codes
            </Button>

            <Button
              onClick={handleExportToExcel}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export to Excel
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
}
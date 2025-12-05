import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Barcode, PackingStatus } from "@/types";
import { getAllBarcodes, deleteBarcode, deleteMultipleBarcodes } from "@/lib/storage";
import { getAllWorkers } from "@/lib/attendance-utils";
import { Worker } from "@/types";
import { getWorkerForBarcode } from "@/lib/supabase";
import { Search, Trash2, Printer, QrCode, CheckSquare, Trash, Users } from "lucide-react";

export function BarcodeList({ refreshTrigger }: { refreshTrigger: number }) {
  const [barcodes, setBarcodes] = useState<Barcode[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<PackingStatus | "all">("all");
  const [workerFilter, setWorkerFilter] = useState<string>("all");
  const [selectedBarcodes, setSelectedBarcodes] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [barcodeAssignments, setBarcodeAssignments] = useState<{ [key: string]: string }>({});
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);

  // Load barcodes, workers, and assignments
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoadingAssignments(true);

        // Load barcodes
        const barcodesData = await getAllBarcodes();
        barcodesData.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setBarcodes(barcodesData);

        // Load workers
        const workersData = await getAllWorkers();
        setWorkers(workersData);

        // Load barcode assignments using getWorkerForBarcode for each barcode
        const assignmentsMap: { [key: string]: string } = {};

        // Process barcodes in batches to avoid overwhelming the database
        const batchSize = 10;
        for (let i = 0; i < barcodesData.length; i += batchSize) {
          const batch = barcodesData.slice(i, i + batchSize);

          // Process batch in parallel
          const batchPromises = batch.map(async (barcode) => {
            try {
              const workerName = await getWorkerForBarcode(barcode.code);
              return { code: barcode.code, worker: workerName };
            } catch (error) {
              console.error(`Error getting worker for barcode ${barcode.code}:`, error);
              return { code: barcode.code, worker: null };
            }
          });

          const batchResults = await Promise.all(batchPromises);

          // Update assignments map
          batchResults.forEach(result => {
            if (result.worker) {
              assignmentsMap[result.code] = result.worker;
            }
          });
        }

        setBarcodeAssignments(assignmentsMap);

      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoadingAssignments(false);
      }
    };

    loadData();
  }, [refreshTrigger]);

  // Filter barcodes based on search, status, and worker
  const filteredBarcodes = barcodes.filter(barcode => {
    const assignedWorker = barcodeAssignments[barcode.code];

    const matchesSearch = searchTerm === "" ||
      barcode.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (barcode.description && barcode.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (barcode.packer && barcode.packer.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (assignedWorker && assignedWorker.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === "all" || barcode.status === statusFilter;

    const matchesWorker = workerFilter === "all" ||
      (workerFilter === "unassigned" && !assignedWorker) ||
      assignedWorker === workerFilter;

    return matchesSearch && matchesStatus && matchesWorker;
  });

  const handleDelete = async (code: string) => {
    if (window.confirm("Are you sure you want to delete this QR code?")) {
      const success = await deleteBarcode(code);
      if (success) {
        setBarcodes(prevBarcodes => prevBarcodes.filter(b => b.code !== code));
        // Also remove from assignments
        setBarcodeAssignments(prev => {
          const updated = { ...prev };
          delete updated[code];
          return updated;
        });
      } else {
        alert('Failed to delete QR code. Please try again.');
      }
    }
  };

  const handlePrint = (barcode: Barcode) => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');

    if (!printWindow) {
      alert("Could not open print window. Please check if pop-ups are blocked.");
      return;
    }

    // Create HTML content for printing
    const printContent = `
      <html>
      <head>
        <title>Print QR Code</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 10px;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
          }
          .qr-container {
            padding: 15px;
            border: 1px dashed #ccc;
            text-align: center;
          }
          .qr-image {
            max-width: 300px;
            height: auto;
          }
          .qr-code {
            margin-top: 10px;
            font-size: 16px;
            color: #333;
          }
          .qr-details {
            margin-top: 5px;
            font-size: 14px;
            color: #666;
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
        <div class="no-print" style="position: fixed; top: 10px; right: 10px;">
          <button onclick="window.print();" style="padding: 10px 20px; font-size: 16px;">Print QR Code</button>
        </div>
        
        <div class="qr-container">
          <img class="qr-image" src="${barcode.qrCodeImage}" alt="QR Code: ${barcode.code}" />
          <div class="qr-code">${barcode.code}</div>
          ${barcode.description ? `<div class="qr-details">Description: ${barcode.description}</div>` : ''}
          ${barcode.status ? `<div class="qr-details">Status: ${barcode.status}</div>` : ''}
          ${barcode.packer ? `<div class="qr-details">Packer: ${barcode.packer}</div>` : ''}
          ${barcode.weight ? `<div class="qr-details">Weight: ${barcode.weight}</div>` : ''}
        </div>
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

  const handleSelectAll = () => {
    if (selectedBarcodes.length === filteredBarcodes.length) {
      setSelectedBarcodes([]);
    } else {
      setSelectedBarcodes(filteredBarcodes.map(b => b.code));
    }
  };

  const handleSelectBarcode = (code: string) => {
    setSelectedBarcodes(prev =>
      prev.includes(code)
        ? prev.filter(c => c !== code)
        : [...prev, code]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedBarcodes.length === 0) return;

    if (confirm(`Are you sure you want to delete ${selectedBarcodes.length} selected QR codes?`)) {
      setIsDeleting(true);

      try {
        const success = await deleteMultipleBarcodes(selectedBarcodes);
        if (success) {
          // Update the displayed list
          setBarcodes(prev => prev.filter(b => !selectedBarcodes.includes(b.code)));
          // Also remove from assignments
          setBarcodeAssignments(prev => {
            const updated = { ...prev };
            selectedBarcodes.forEach(code => delete updated[code]);
            return updated;
          });
          setSelectedBarcodes([]);
        } else {
          alert('Failed to delete some QR codes. Please try again.');
        }
      } catch (error) {
        console.error('Error deleting barcodes:', error);
        alert('Error deleting QR codes. Please try again.');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleBulkPrint = () => {
    if (selectedBarcodes.length === 0) return;

    setIsPrinting(true);

    try {
      const selectedBarcodeObjects = barcodes.filter(b => selectedBarcodes.includes(b.code));
      const validBarcodes = selectedBarcodeObjects.filter(b => b.qrCodeImage);

      if (validBarcodes.length === 0) {
        alert("No valid QR codes found for printing");
        setIsPrinting(false);
        return;
      }

      // Create a new window for printing multiple QR codes
      const printWindow = window.open('', '_blank');

      if (!printWindow) {
        alert("Could not open print window. Please check if pop-ups are blocked.");
        setIsPrinting(false);
        return;
      }

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
            .qr-details {
              margin-top: 3px;
              font-size: 10px;
              color: #666;
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
            <button onclick="window.print();" style="padding: 10px 20px; font-size: 16px;">Print ${validBarcodes.length} QR Codes</button>
          </div>
      `;

      validBarcodes.forEach(barcode => {
        printContent += `
          <div class="qr-container">
            <img class="qr-image" src="${barcode.qrCodeImage}" alt="QR Code: ${barcode.code}" />
            <div class="qr-code">${barcode.code}</div>
            ${barcode.packer ? `<div class="qr-details">Packer: ${barcode.packer}</div>` : ''}
            ${barcode.status ? `<div class="qr-details">Status: ${barcode.status}</div>` : ''}
          </div>
        `;
      });

      printContent += `
        </body>
        </html>
      `;

      printWindow.document.open();
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();

    } catch (error) {
      console.error("Error printing barcodes:", error);
      alert("Failed to print selected QR codes");
    } finally {
      setIsPrinting(false);
    }
  };

  const getStatusBadgeVariant = (status: PackingStatus) => {
    switch (status) {
      case PackingStatus.PENDING:
        return "outline";
      case PackingStatus.PACKED:
        return "secondary";
      case PackingStatus.DISPATCHED:
        return "default";
      case PackingStatus.DELIVERED:
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            QR Code List
            {isLoadingAssignments && (
              <span className="ml-2 text-sm text-muted-foreground">(Loading assignments...)</span>
            )}
          </CardTitle>

          {filteredBarcodes.length > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="flex items-center gap-2"
              >
                <CheckSquare className="w-4 h-4" />
                {selectedBarcodes.length === filteredBarcodes.length ? 'Deselect All' : 'Select All'}
              </Button>

              {selectedBarcodes.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkPrint}
                    disabled={isPrinting}
                    className="flex items-center gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    {isPrinting ? 'Printing...' : `Print ${selectedBarcodes.length}`}
                  </Button>

                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleBulkDelete}
                    disabled={isDeleting}
                    className="flex items-center gap-2"
                  >
                    <Trash className="w-4 h-4" />
                    {isDeleting ? 'Deleting...' : `Delete ${selectedBarcodes.length}`}
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by code, description, packer, or worker..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>

          <div className="w-full sm:w-48">
            <Label htmlFor="status-filter" className="sr-only">Filter by Status</Label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as PackingStatus | "all")}
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="all">All Statuses</option>
              <option value={PackingStatus.PENDING}>Pending</option>
              <option value={PackingStatus.PACKED}>Packed</option>
              <option value={PackingStatus.DISPATCHED}>Dispatched</option>
              <option value={PackingStatus.DELIVERED}>Delivered</option>
            </select>
          </div>

          <div className="w-full sm:w-48">
            <Label htmlFor="worker-filter" className="sr-only">Filter by Worker</Label>
            <select
              id="worker-filter"
              value={workerFilter}
              onChange={(e) => setWorkerFilter(e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="all">All Workers</option>
              <option value="unassigned">Unassigned</option>
              {workers.map((worker) => (
                <option key={worker.id} value={worker.name}>
                  {worker.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedBarcodes.length === filteredBarcodes.length && filteredBarcodes.length > 0}
                    indeterminate={selectedBarcodes.length > 0 && selectedBarcodes.length < filteredBarcodes.length}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>QR Code</TableHead>
                <TableHead className="hidden md:table-cell">Assigned Worker</TableHead>
                <TableHead className="hidden lg:table-cell">Packer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Details</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBarcodes.length > 0 ? (
                filteredBarcodes.map((barcode) => {
                  const assignedWorker = barcodeAssignments[barcode.code];
                  return (
                    <TableRow key={barcode.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedBarcodes.includes(barcode.code)}
                          onCheckedChange={() => handleSelectBarcode(barcode.code)}
                        />
                      </TableCell>
                      <TableCell className="font-mono">{barcode.code}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">
                            {isLoadingAssignments ? "Loading..." : (assignedWorker || "Not assigned")}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-sm">
                          {barcode.packer || barcode.packerName || "Not packed"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(barcode.status || PackingStatus.PENDING)}>
                          {barcode.status || PackingStatus.PENDING}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs space-y-1">
                          {barcode.description && (
                            <div className="text-muted-foreground">{barcode.description}</div>
                          )}
                          {barcode.weight && <div>Weight: {barcode.weight}</div>}
                          {barcode.shippingLocation && (
                            <div>Location: {barcode.shippingLocation}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handlePrint(barcode)}
                            title="Print QR Code"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDelete(barcode.code)}
                            title="Delete QR Code"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <QrCode className="h-8 w-8 mb-2" />
                      {barcodes.length === 0 ? (
                        "No QR codes created yet. Create one to get started."
                      ) : (
                        "No QR codes match your search criteria."
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 text-sm text-muted-foreground">
          Total: {filteredBarcodes.length} QR code{filteredBarcodes.length !== 1 ? 's' : ''}
          {Object.keys(barcodeAssignments).length > 0 && (
            <span className="ml-4">
              Assigned: {Object.keys(barcodeAssignments).length}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
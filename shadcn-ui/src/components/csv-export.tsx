import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Barcode } from "@/types";
import { getBarcodesFromSupabaseByDateRange, isUserAuthenticated } from "@/lib/supabase-storage";
import { getAllBarcodesSync } from "@/lib/storage";
import { Download, Calendar, FileSpreadsheet } from "lucide-react";

export function CSVExport() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const convertToCSV = (data: Barcode[]): string => {
    const headers = [
      "QR Code",
      "Description", 
      "Packer Name",
      "Weight",
      "Status",
      "Created Date",
      "Created Time"
    ];

    const csvContent = [
      headers.join(","),
      ...data.map(barcode => [
        `"${barcode.code}"`,
        `"${barcode.description || ''}"`,
        `"${barcode.packerName || ''}"`,
        `"${barcode.weight || ''}"`,
        `"${barcode.status}"`,
        `"${new Date(barcode.createdAt).toLocaleDateString()}"`,
        `"${new Date(barcode.createdAt).toLocaleTimeString()}"`,
      ].join(","))
    ].join("\n");

    return csvContent;
  };

  const downloadCSV = (csvContent: string, filename: string) => {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportDateRange = async () => {
    if (!startDate || !endDate) {
      alert("Please select both start and end dates");
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Include the full end date

    if (start > end) {
      alert("Start date must be before end date");
      return;
    }

    setIsExporting(true);

    try {
      let barcodes: Barcode[] = [];

      // Try to get data from Supabase if authenticated
      const isAuth = await isUserAuthenticated();
      if (isAuth) {
        barcodes = await getBarcodesFromSupabaseByDateRange(start, end);
      } else {
        // Filter localStorage data by date range
        const allBarcodes = getAllBarcodesSync();
        barcodes = allBarcodes.filter(barcode => {
          const barcodeDate = new Date(barcode.createdAt);
          return barcodeDate >= start && barcodeDate <= end;
        });
      }

      if (barcodes.length === 0) {
        alert("No QR codes found in the selected date range");
        return;
      }

      const csvContent = convertToCSV(barcodes);
      const filename = `qr-codes-${startDate}-to-${endDate}.csv`;
      
      downloadCSV(csvContent, filename);
      
      // Show success message
      alert(`Successfully exported ${barcodes.length} QR codes to ${filename}`);
      
    } catch (error) {
      console.error("Error exporting CSV:", error);
      alert("Error exporting CSV. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportAll = async () => {
    setIsExporting(true);

    try {
      let barcodes: Barcode[] = [];

      // Try to get data from Supabase if authenticated
      const isAuth = await isUserAuthenticated();
      if (isAuth) {
        // Import the async function here to avoid circular dependency
        const { getAllBarcodesFromSupabase } = await import("@/lib/supabase-storage");
        barcodes = await getAllBarcodesFromSupabase();
      } else {
        barcodes = getAllBarcodesSync();
      }

      if (barcodes.length === 0) {
        alert("No QR codes found to export");
        return;
      }

      const csvContent = convertToCSV(barcodes);
      const filename = `all-qr-codes-${new Date().toISOString().split('T')[0]}.csv`;
      
      downloadCSV(csvContent, filename);
      
      // Show success message
      alert(`Successfully exported ${barcodes.length} QR codes to ${filename}`);
      
    } catch (error) {
      console.error("Error exporting CSV:", error);
      alert("Error exporting CSV. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5" />
          Export QR Codes to CSV
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Export All Button */}
        <div>
          <Button
            onClick={handleExportAll}
            disabled={isExporting}
            className="w-full flex items-center gap-2"
            variant="outline"
          >
            <Download className="w-4 h-4" />
            {isExporting ? "Exporting..." : "Export All QR Codes"}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <hr className="flex-1" />
          <span className="text-sm text-muted-foreground">OR</span>
          <hr className="flex-1" />
        </div>

        {/* Date Range Export */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Calendar className="w-4 h-4" />
            Export by Date Range
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                min={startDate}
              />
            </div>
          </div>

          <Button
            onClick={handleExportDateRange}
            disabled={!startDate || !endDate || isExporting}
            className="w-full flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            {isExporting ? "Exporting..." : "Export Date Range"}
          </Button>
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>CSV includes:</strong> QR Code, Description, Packer Name, Weight, Status, Created Date & Time</p>
          <p><strong>Format:</strong> Compatible with Excel, Google Sheets, and other spreadsheet applications</p>
        </div>
      </CardContent>
    </Card>
  );
}
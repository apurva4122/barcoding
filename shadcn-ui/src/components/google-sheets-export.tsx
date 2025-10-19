import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getBarcodes } from "@/lib/storage";
import { toast } from "sonner";
import { Barcode } from "@/types";
import { Download, FileSpreadsheet } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function GoogleSheetsExport() {
  const [isExporting, setIsExporting] = useState(false);
  
  // Export to CSV
  const exportToCSV = () => {
    try {
      setIsExporting(true);
      
      const barcodes = getBarcodes();
      
      if (barcodes.length === 0) {
        toast.error("No barcodes to export");
        return;
      }
      
      // Create CSV content
      const csvHeader = "Barcode Code,Weight,Packer Name,Dispatch Ready,Created At,Updated At";
      
      const csvRows = barcodes.map(barcode => {
        const createdDate = new Date(barcode.createdAt).toLocaleString();
        const updatedDate = new Date(barcode.updatedAt).toLocaleString();
        
        return [
          `"${barcode.code}"`,
          `"${barcode.weight}"`,
          `"${barcode.packerName}"`,
          barcode.isDispatchReady ? "Yes" : "No",
          `"${createdDate}"`,
          `"${updatedDate}"`
        ].join(",");
      });
      
      const csvContent = [csvHeader, ...csvRows].join("\n");
      
      // Create a blob and download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `barcode-export-${new Date().toISOString().slice(0, 10)}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      
      link.click();
      document.body.removeChild(link);
      
      toast.success("Barcodes exported to CSV successfully");
    } catch (error) {
      console.error("Error exporting to CSV:", error);
      toast.error("Error exporting to CSV");
    } finally {
      setIsExporting(false);
    }
  };
  
  // Export to Google Sheets
  const exportToGoogleSheets = () => {
    try {
      const barcodes = getBarcodes();
      
      if (barcodes.length === 0) {
        toast.error("No barcodes to export");
        return;
      }
      
      // Create the Google Sheets URL with prepopulated data
      const baseUrl = "https://docs.google.com/spreadsheets/d/1YFCum-3lw7PGLUWvzzY31Za2sMRv_uQyXaVoYK1cNzM/copy";
      
      // Open Google Sheets in a new tab
      window.open(baseUrl, '_blank');
      
      toast.success("Google Sheets template opened. You can now paste your exported CSV data.");
    } catch (error) {
      console.error("Error opening Google Sheets template:", error);
      toast.error("Error opening Google Sheets template");
    }
  };
  
  // Format barcodes data for display
  const formatBarcodesForDisplay = (barcodes: Barcode[]): string => {
    if (barcodes.length === 0) {
      return "No barcodes to export";
    }
    
    return `
      Total barcodes: ${barcodes.length}
      Ready for dispatch: ${barcodes.filter(b => b.isDispatchReady).length}
      Not ready: ${barcodes.filter(b => !b.isDispatchReady).length}
    `;
  };
  
  const barcodes = getBarcodes();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Export Barcodes</CardTitle>
        <CardDescription>
          Export your barcode data to CSV or Google Sheets
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="csv">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="csv">CSV Export</TabsTrigger>
            <TabsTrigger value="sheets">Google Sheets</TabsTrigger>
          </TabsList>
          
          <TabsContent value="csv" className="space-y-4 pt-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Export to CSV</h3>
              <p className="text-sm text-muted-foreground">
                Download your barcode data as a CSV file that can be opened in Excel or other spreadsheet applications.
              </p>
            </div>
            
            <Button 
              onClick={exportToCSV} 
              disabled={isExporting || barcodes.length === 0}
              className="w-full"
            >
              <Download className="mr-2 h-4 w-4" /> 
              Export to CSV
            </Button>
          </TabsContent>
          
          <TabsContent value="sheets" className="space-y-4 pt-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Export to Google Sheets</h3>
              <p className="text-sm text-muted-foreground">
                Open a Google Sheets template where you can paste your exported data.
              </p>
              <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1 mt-2">
                <li>Click "Open Google Sheets" below</li>
                <li>Make a copy of the template</li>
                <li>Export to CSV using the CSV tab</li>
                <li>Import the CSV into Google Sheets</li>
              </ol>
            </div>
            
            <Button 
              onClick={exportToGoogleSheets} 
              disabled={barcodes.length === 0}
              variant="secondary"
              className="w-full"
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" /> 
              Open Google Sheets
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter>
        <p className="text-xs text-muted-foreground">
          {formatBarcodesForDisplay(barcodes)}
        </p>
      </CardFooter>
    </Card>
  );
}
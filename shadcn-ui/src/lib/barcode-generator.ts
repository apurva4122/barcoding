/**
 * Generate a unique barcode code with a specified prefix
 */
import { getAllBarcodes } from './storage';

export async function generateBarcodeCode(prefix: string = "PKG"): Promise<string> {
  // Get current date in YYMMDD format
  const today = new Date();
  const year = today.getFullYear().toString().slice(-2); // Last 2 digits of year
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const day = today.getDate().toString().padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  
  try {
    // Get existing barcodes for today to determine next serial number
    const existingBarcodes = await getAllBarcodes();
    const todayBarcodes = existingBarcodes.filter((barcode: { code: string }) => 
      barcode.code.startsWith(dateStr)
    );
    
    // Calculate next serial number (starting from 1)
    const nextSerial = todayBarcodes.length + 1;
    const serialStr = nextSerial.toString().padStart(5, '0');
    
    return `${dateStr}${serialStr}`;
  } catch (error) {
    console.error('Error generating barcode code:', error);
    // Fallback: generate with timestamp if database fails
    const timestamp = Date.now().toString().slice(-5);
    return `${dateStr}${timestamp}`;
  }
}

/**
 * Print a barcode
 * @param barcodeImage The barcode image URL or data URL
 * @param barcodeText The text of the barcode
 */
export function printBarcode(barcodeImage: string, barcodeText: string, description?: string): void {
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
      <title>Print Barcode</title>
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
        .barcode-container {
          padding: 15px;
          border: 1px dashed #ccc;
          text-align: center;
        }
        .barcode-image {
          max-width: 300px;
          height: auto;
        }
        .barcode-text {
          margin-top: 10px;
          font-size: 16px;
          color: #333;
        }
        .barcode-description {
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
          .barcode-container {
            border: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="position: fixed; top: 10px; right: 10px;">
        <button onclick="window.print();" style="padding: 10px 20px; font-size: 16px;">Print Barcode</button>
      </div>
      
      <div class="barcode-container">
        <img class="barcode-image" src="${barcodeImage}" alt="Barcode: ${barcodeText}" />
        <div class="barcode-text">${barcodeText}</div>
        ${description ? `<div class="barcode-description">${description}</div>` : ''}
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
}
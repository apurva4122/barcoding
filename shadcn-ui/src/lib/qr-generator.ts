import QRCode from 'qrcode';

/**
 * Generates a QR code data URL for a given text
 * 
 * @param text The text to encode in the QR code
 * @returns A promise that resolves to the data URL of the QR code
 */
export async function generateQRCodeDataURL(text: string): Promise<string> {
  try {
    const options = {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 300,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    };
    
    return await QRCode.toDataURL(text, options);
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Generates a QR code canvas element for a given text
 * 
 * @param text The text to encode in the QR code
 * @param canvas The canvas element to draw the QR code on
 * @returns A promise that resolves when the QR code is drawn
 */
export async function generateQRCodeOnCanvas(text: string, canvas: HTMLCanvasElement): Promise<void> {
  try {
    const options = {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 300,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    };
    
    await QRCode.toCanvas(canvas, text, options);
  } catch (error) {
    console.error('Error generating QR code on canvas:', error);
    throw new Error('Failed to generate QR code on canvas');
  }
}

/**
 * Generates a QR code SVG string for a given text
 * 
 * @param text The text to encode in the QR code
 * @returns A promise that resolves to the SVG string of the QR code
 */
export async function generateQRCodeSVG(text: string): Promise<string> {
  try {
    const options = {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 300,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    };
    
    return await QRCode.toString(text, {
      ...options,
      type: 'svg'
    });
  } catch (error) {
    console.error('Error generating QR code SVG:', error);
    throw new Error('Failed to generate QR code SVG');
  }
}
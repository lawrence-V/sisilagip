export type UsbPrinterDevice = {
  deviceId: number;
  deviceName: string;
  vendorId: number;
  productId: number;
  manufacturerName: string | null;
  productName: string | null;
  hasPermission: boolean;
  isLikelyPrinter: boolean;
};

export type UsbPrintResult = {
  deviceId: number;
  deviceName: string;
  copies: number;
};

export type UsbPrintTone = 'balanced' | 'contrast' | 'light';

export type UsbReceiptPrintOptions = {
  photoBase64s: string[];
  columns: number;
  eventName: string;
  footer: string;
  copies: number;
  tone: UsbPrintTone;
};

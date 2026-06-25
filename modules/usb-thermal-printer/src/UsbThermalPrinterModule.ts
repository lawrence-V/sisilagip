import { NativeModule, requireNativeModule } from 'expo';

import type {
  UsbPrinterDevice,
  UsbPrintResult,
  UsbReceiptPrintOptions,
} from './UsbThermalPrinter.types';

declare class UsbThermalPrinterModule extends NativeModule<Record<never, never>> {
  listDevicesAsync(): Promise<UsbPrinterDevice[]>;
  printReceiptAsync(
    deviceId: number,
    options: {
      photoBase64s: string[];
      columns: number;
      eventName: string;
      footer: string;
      copies: number;
      tone: string;
      printerWidth: number;
      largePhotos: boolean;
    },
  ): Promise<UsbPrintResult>;
}

export default requireNativeModule<UsbThermalPrinterModule>('UsbThermalPrinter');

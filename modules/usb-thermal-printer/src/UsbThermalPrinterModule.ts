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
    photoBase64s: string[],
    columns: number,
    eventName: string,
    footer: string,
    copies: number,
    tone: string,
  ): Promise<UsbPrintResult>;
}

export default requireNativeModule<UsbThermalPrinterModule>('UsbThermalPrinter');

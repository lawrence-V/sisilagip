import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

import type {
  UsbPrinterDevice,
  UsbPrintResult,
  UsbReceiptPrintOptions,
} from '@/types/UsbPrinter';

const UNSUPPORTED_MESSAGE =
  'Direct USB printing is available only in an Android development or production build.';

type UsbThermalPrinterNativeModule = {
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
};

function getNativeModule(): UsbThermalPrinterNativeModule {
  if (Platform.OS !== 'android') {
    throw new Error(UNSUPPORTED_MESSAGE);
  }

  const nativeModule =
    requireOptionalNativeModule<UsbThermalPrinterNativeModule>('UsbThermalPrinter');

  if (!nativeModule) {
    throw new Error(
      'The USB printer native module is missing. Install the latest Android APK instead of using Expo Go.',
    );
  }

  return nativeModule;
}

export async function getUsbPrinterDevices(): Promise<UsbPrinterDevice[]> {
  return getNativeModule().listDevicesAsync();
}

export async function printUsbReceipt(
  deviceId: number,
  options: UsbReceiptPrintOptions,
): Promise<UsbPrintResult> {
  return getNativeModule().printReceiptAsync(
    deviceId,
    options.photoBase64s,
    options.columns,
    options.eventName,
    options.footer,
    options.copies,
    options.tone,
  );
}

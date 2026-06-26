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
  generateReceiptPreviewAsync(options: {
    photoBase64s: string[];
    columns: number;
    eventName: string;
    footer: string;
    tone: string;
    printerWidth: number;
    largePhotos: boolean;
  }): Promise<string>;
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

export async function generateUsbReceiptPreview(
  options: Omit<UsbReceiptPrintOptions, 'copies'>,
): Promise<string> {
  return getNativeModule().generateReceiptPreviewAsync({
    photoBase64s: options.photoBase64s,
    columns: options.columns,
    eventName: options.eventName,
    footer: options.footer,
    tone: options.tone,
    printerWidth: options.printerWidth,
    largePhotos: options.largePhotos,
  });
}

export async function printUsbReceipt(
  deviceId: number,
  options: UsbReceiptPrintOptions,
): Promise<UsbPrintResult> {
  return getNativeModule().printReceiptAsync(
    deviceId,
    {
      photoBase64s: options.photoBase64s,
      columns: options.columns,
      eventName: options.eventName,
      footer: options.footer,
      copies: options.copies,
      tone: options.tone,
      printerWidth: options.printerWidth,
      largePhotos: options.largePhotos,
    },
  );
}

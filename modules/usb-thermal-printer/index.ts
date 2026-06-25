// Re-export the native module. On web, it will be resolved to UsbThermalPrinterModule.web.ts
// and on native platforms to UsbThermalPrinterModule.ts
export { default } from './src/UsbThermalPrinterModule';
export * from './src/UsbThermalPrinter.types';

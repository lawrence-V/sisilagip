import { registerWebModule, NativeModule } from 'expo';

// UsbThermalPrinterModule is not available on the web platform.
class UsbThermalPrinterModule extends NativeModule<{}> {}

export default registerWebModule(UsbThermalPrinterModule, 'UsbThermalPrinterModule');

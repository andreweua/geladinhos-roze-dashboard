import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.geladinhosroze.app",
  appName: "Roze Gourmet",
  webDir: "dist",
  server: {
    androidScheme: "https",
    cleartext: true,
  },
  plugins: {
    BarcodeScanner: {
      // Configurações do Google ML Kit Barcode Scanner
    },
  },
};

export default config;

import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.geladinhosroze.app",
  appName: "PereiraLabs PDV - Foods",
  webDir: "dist",
  server: {
    url: "https://andreweua.github.io/geladinhos-roze-dashboard/",
    allowNavigation: ["andreweua.github.io"],
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

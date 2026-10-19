/**
 * ============================================================================
 * ARQUIVO CENTRAL DE CONFIGURAÇÃO WHITE-LABEL (REPLICÁVEL)
 * ============================================================================
 * Para replicar este dashboard para outro cliente ou nicho no futuro,
 * basta alterar os valores abaixo e as variáveis de tema em `src/index.css`.
 */

export interface BrandConfig {
  appVersion: string;
  companyName: string;
  shortName: string;
  tagline: string;
  niche: string;
  locale: string;
  currency: string;
  lowStockThreshold: number;
  defaultIfoodFeePct: number;
  storagePrefix: string;
  userProfile: {
    name: string;
    role: string;
    avatarInitials: string;
  };
  labels: {
    productSingular: string;
    productPlural: string;
    unitName: string;
    unitsSoldTitle: string;
    topProductsChartTitle: string;
    stockChartTitle: string;
  };
  paymentFeeRates: {
    Pix: number; // % fee
    Dinheiro: number;
    Cartao_Debito: number;
    Cartao_Credito: number;
  };
  chartColors: {
    revenue: string;
    cost: string;
    profit: string;
    primaryBar: string;
    stockNormal: string;
    stockLow: string;
    paymentMethods: {
      Pix: string;
      Dinheiro: string;
      Cartao_Credito: string;
      Cartao_Debito: string;
    };
  };
  developerCredit: {
    studio: string;
    company: string;
    fullText: string;
  };
}

export const BRAND_CONFIG: BrandConfig = {
  appVersion: "1.6.0",
  companyName: "Geladinhos Gourmet da Roze",
  shortName: "Roze Gourmet",
  tagline: "Confeitaria Gelada & Sobremesas Artesanais",
  niche: "Gourmet Popsicles / Dessert Confectionery",
  locale: "pt-BR",
  currency: "BRL",
  lowStockThreshold: 10,
  defaultIfoodFeePct: 26.2, // Taxa padrão iFood (23% + 3,2% = 26,2% -> Fator divisor 0,738)
  storagePrefix: "roze_gourmet_v1",
  userProfile: {
    name: "Rozana",
    role: "Administradora",
    avatarInitials: "RZ",
  },
  labels: {
    productSingular: "Sabor",
    productPlural: "Sabores",
    unitName: "Geladinhos",
    unitsSoldTitle: "Total de Geladinhos Vendidos",
    topProductsChartTitle: "Top 5 Sabores Mais Vendidos",
    stockChartTitle: "Nível de Estoque por Sabor",
  },
  // Taxas médias de maquininha/meios de pagamento (%) para apuração da DRE por Produto
  paymentFeeRates: {
    Pix: 0.0,
    Dinheiro: 0.0,
    Cartao_Debito: 1.99,
    Cartao_Credito: 3.99,
  },
  chartColors: {
    revenue: "#2563eb", // Royal Indigo / Blue 600
    cost: "#64748b", // Neutral Slate 500
    profit: "#10b981", // Clean Emerald 500
    primaryBar: "#3b82f6", // Blue 500
    stockNormal: "#0284c7", // Sky 600
    stockLow: "#d97706", // Amber 600 (Alert)
    paymentMethods: {
      Pix: "#2563eb", // Indigo
      Cartao_Credito: "#0ea5e9", // Sky Blue
      Cartao_Debito: "#6366f1", // Indigo Violet
      Dinheiro: "#10b981", // Clean Emerald
    },
  },
  developerCredit: {
    studio: "PereiraLabs - Divisão de Tecnologia e IA",
    company: "Louzada & Pereira - Soluções Digitais",
    fullText:
      "Desenvolvido por PereiraLabs - Divisão de Tecnologia e IA | Louzada & Pereira - Soluções Digitais",
  },
};

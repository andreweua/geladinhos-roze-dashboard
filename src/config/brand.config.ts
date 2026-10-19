/**
 * ============================================================================
 * ARQUIVO CENTRAL DE CONFIGURAÇÃO WHITE-LABEL (REPLICÁVEL)
 * ============================================================================
 * Para replicar este dashboard para outro cliente ou nicho no futuro,
 * basta alterar os valores abaixo e as variáveis de tema em `src/index.css`.
 */

export interface BrandConfig {
  companyName: string;
  shortName: string;
  tagline: string;
  niche: string;
  locale: string;
  currency: string;
  lowStockThreshold: number;
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
  companyName: "Geladinhos Gourmet da Roze",
  shortName: "Roze Gourmet",
  tagline: "Confeitaria Gelada & Sobremesas Artesanais",
  niche: "Gourmet Popsicles / Dessert Confectionery",
  locale: "pt-BR",
  currency: "BRL",
  lowStockThreshold: 10,
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
  chartColors: {
    revenue: "#e11d48", // Rose 600
    cost: "#f59e0b", // Amber 500
    profit: "#10b981", // Emerald 500
    primaryBar: "#fb7185", // Rose 400
    stockNormal: "#f43f5e", // Rose 500
    stockLow: "#d97706", // Amber 600 (Alert)
    paymentMethods: {
      Pix: "#e11d48", // Rose / Berry
      Cartao_Credito: "#fb923c", // Soft Peach / Orange
      Cartao_Debito: "#f59e0b", // Amber Gold
      Dinheiro: "#10b981", // Mint Emerald
    },
  },
  developerCredit: {
    studio: "PereiraLabs - Divisão de tecnologia e IA",
    company: "Louzada & Pereira - soluções digitais",
    fullText:
      "Desenvolvido por PereiraLabs - Divisão de tecnologia e IA | Louzada & Pereira - soluções digitais",
  },
};

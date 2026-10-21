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
  tonConfig: {
    pixKey: string;
    pixKeyType: "telefone" | "email" | "cpf_cnpj" | "aleatoria";
    merchantName: string;
    merchantCity: string;
    whatsappNumber: string; // ex: 5531999999999
    txIdPrefix: string;
    rates: {
      Pix: number; // Ton Pix: 0.99%
      Dinheiro: number; // 0.00%
      Cartao_Debito: number; // Ton Débito: 1.99%
      Cartao_Credito: number; // Ton Crédito: 3.50%
    };
  };
  stoneConfig?: {
    environment: "sandbox" | "production";
    apiUrl: string;
    clientId: string;
    clientSecret: string;
    accountId: string;
    webhookSecret?: string;
  };
  basesOperacionais: {
    jau: {
      responsavel: string;
      cidade: string;
      cep: string;
      logradouro: string;
      bairro: string;
      tipoPolo: string;
      telefone: string;
    };
    tresPontas: {
      responsavel: string;
      cidade: string;
      cep: string;
      logradouro: string;
      bairro: string;
      tipoPolo: string;
    };
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
  appVersion: "2.0.0",
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
    name: "Rozana Helena Miguel",
    role: "Administradora",
    avatarInitials: "RH",
  },
  labels: {
    productSingular: "Sabor",
    productPlural: "Sabores",
    unitName: "Geladinhos",
    unitsSoldTitle: "Total de Geladinhos Vendidos",
    topProductsChartTitle: "Top 5 Sabores Mais Vendidos",
    stockChartTitle: "Nível de Estoque por Sabor",
  },
  // Taxas médias por meio de pagamento (Ton Stone / Mercado Pago / Maquininha)
  paymentFeeRates: {
    Pix: 0.99, // Taxa Ton Pix
    Dinheiro: 0.0,
    Cartao_Debito: 1.99, // Taxa Ton Débito
    Cartao_Credito: 3.5, // Taxa Ton Crédito à vista
  },
  tonConfig: {
    pixKey: "+5514988183327", // Chave Pix TON oficial da lojista (Telefone formato internacional BACEN)
    pixKeyType: "telefone",
    merchantName: "ROZANA HELENA MIGUEL",
    merchantCity: "JAU",
    whatsappNumber: "5514988183327",
    txIdPrefix: "ROZE",
    rates: {
      Pix: 0.99,
      Dinheiro: 0.0,
      Cartao_Debito: 1.99,
      Cartao_Credito: 3.5,
    },
  },
  stoneConfig: {
    environment: "sandbox",
    apiUrl: "https://sandbox-api.openbank.stone.com.br",
    clientId: "",
    clientSecret: "",
    accountId: "",
    webhookSecret: "",
  },
  basesOperacionais: {
    jau: {
      responsavel: "Rozana Helena Miguel",
      cidade: "Jaú - SP",
      cep: "17205-210",
      logradouro: "Rua Ângelo Perlatti, Jardim São Caetano",
      bairro: "Jardim São Caetano",
      tipoPolo: "Matriz de Produção Artesanal & Confeitaria Gelada",
      telefone: "(14) 98818-3327",
    },
    tresPontas: {
      responsavel: "Andrew Pereira",
      cidade: "Três Pontas - MG",
      cep: "37187-016",
      logradouro: "Rua Aristides Botrel de Figueiredo, Bairro Santana",
      bairro: "Santana",
      tipoPolo: "Polo de Pesquisa de Mercado, Inteligência & Suporte Operacional",
    },
  },
  chartColors: {
    revenue: "#be123c", // Berry Rose 700
    cost: "#64748b", // Slate 500
    profit: "#059669", // Emerald 600
    primaryBar: "#e11d48", // Rose 600
    stockNormal: "#be123c", // Berry Rose
    stockLow: "#d97706", // Amber 600 (Alerta)
    paymentMethods: {
      Pix: "#be123c", // Berry Pix
      Cartao_Credito: "#ea580c", // Warm Peach / Coral
      Cartao_Debito: "#d97706", // Amber Gold
      Dinheiro: "#059669", // Mint Emerald
    },
  },
  developerCredit: {
    studio: "PereiraLabs - Divisão de Tecnologia e IA",
    company: "Louzada & Pereira - Soluções Digitais",
    fullText:
      "Desenvolvido por PereiraLabs - Divisão de Tecnologia e IA | Louzada & Pereira - Soluções Digitais",
  },
};

export const COMPANY_CONFIG_STORAGE_KEY = `${BRAND_CONFIG.storagePrefix}_company_settings_v1`;

export function getCustomBrandConfig(): BrandConfig {
  try {
    const raw = localStorage.getItem(COMPANY_CONFIG_STORAGE_KEY);
    if (raw) {
      const overrides = JSON.parse(raw) as Partial<BrandConfig>;
      return {
        ...BRAND_CONFIG,
        ...overrides,
        tonConfig: {
          ...BRAND_CONFIG.tonConfig,
          ...(overrides.tonConfig || {}),
          rates: {
            ...BRAND_CONFIG.tonConfig.rates,
            ...(overrides.tonConfig?.rates || {}),
          },
        },
        stoneConfig: {
          ...BRAND_CONFIG.stoneConfig!,
          ...(overrides.stoneConfig || {}),
        },
        basesOperacionais: {
          jau: {
            ...BRAND_CONFIG.basesOperacionais.jau,
            ...(overrides.basesOperacionais?.jau || {}),
          },
          tresPontas: {
            ...BRAND_CONFIG.basesOperacionais.tresPontas,
            ...(overrides.basesOperacionais?.tresPontas || {}),
          },
        },
      };
    }
  } catch (e) {
    console.warn("Erro ao carregar configurações salvas:", e);
  }
  return BRAND_CONFIG;
}

export function saveCustomBrandConfig(config: Partial<BrandConfig>): void {
  try {
    localStorage.setItem(COMPANY_CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.warn("Erro ao salvar configurações personalizadas:", e);
  }
}

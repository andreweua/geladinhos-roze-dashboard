# Geladinhos Gourmet da Roze — Dashboard Gerencial (PWA & White-Label)

Dashboard financeiro e operacional desenvolvido em **React + Vite + TypeScript + Tailwind CSS + Shadcn/UI + Recharts + Supabase**, projetado para hospedagem gratuita no **GitHub Pages**, instalação como **PWA (Progressive Web App)** e fácil **replicação (White-Label)** para futuros clientes.

---

## Como rodar localmente

```bash
npm install
npm run dev
```

---

## Como replicar este Dashboard para outro negócio no futuro (White-Label)

Toda a identidade da marca, nomenclatura dos produtos, limites de estoque e cores dos gráficos estão centralizados em **2 arquivos**:

1. **`src/config/brand.config.ts`**:
   - Altere `companyName`, `tagline`, `lowStockThreshold` (ex: `10`), `userProfile` e `labels` (ex: trocar `"Geladinhos"` / `"Sabores"` por `"Açaís"`, `"Bolos de Pote"`, `"Produtos"` etc.).
2. **`src/index.css`**:
   - Ajuste as variáveis CSS HSL (`--primary`, `--secondary`, `--accent`) para mudar instantaneamente o tema claro e escuro.

---

## Modo Híbrido de Dados (Demo LocalStorage + Supabase)

- **Sem `.env` configurado (Padrão)**: O dashboard funciona 100% interativo no navegador (inclusive no GitHub Pages!) usando dados realistas dos últimos 90 dias e salvando novas vendas e reposições de estoque no `localStorage`.
- **Com Supabase conectado**:
  1. Crie um projeto gratuito no [Supabase](https://supabase.com).
  2. No **SQL Editor** do Supabase, execute o conteúdo do arquivo [`supabase/schema_and_seed.sql`](./supabase/schema_and_seed.sql).
  3. Copie `.env.example` para `.env` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
  4. O badge no topo mudará automaticamente de **"Modo Demo Ativo"** para **"Supabase Online"**.

---

## Deploy Automático no GitHub Pages

O projeto já possui:
- `base: './'` configurado no [`vite.config.ts`](./vite.config.ts) (funciona em qualquer subdiretório `usuario.github.io/nome-do-repo/`).
- Workflow pronto em [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml). Basta ativar **Settings > Pages > Build and deployment > Source: GitHub Actions** no seu repositório GitHub.

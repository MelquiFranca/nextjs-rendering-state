<div align="center">

# 🕵️ Stale Data Detective

### Um laboratório visual sobre dados obsoletos, concorrência e consistência no Next.js

**Duas abas. Um único estoque. Duas versões diferentes da verdade.**

<br />

![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Atomic_Update-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![TanStack Query](https://img.shields.io/badge/TanStack_Query-Server_State-FF4154?style=for-the-badge&logo=reactquery&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand-Client_State-443E38?style=for-the-badge)

![Build](https://img.shields.io/badge/build-passing-2EA44F?style=flat-square)
![TypeScript](https://img.shields.io/badge/typecheck-passing-2EA44F?style=flat-square)
![Production Audit](https://img.shields.io/badge/production_audit-0_vulnerabilities-2EA44F?style=flat-square)
![Purpose](https://img.shields.io/badge/purpose-portfolio_POC-8A2BE2?style=flat-square)

<br />

[O problema](#-o-problema) · [Demonstração](#-demonstração-em-60-segundos) · [Arquitetura](#-arquitetura) · [Executar](#-executando-localmente) · [Testes](#-estratégia-de-testes)

</div>

---

## 🎯 O problema

O Operador A abre o painel quando existem **12 unidades**. O Operador B reserva **5 unidades**, mas a primeira aba continua exibindo o snapshot antigo.

```text
┌─────────────────────────────┐       ┌─────────────────────────────┐
│  OPERADOR A                 │       │  OPERADOR B                 │
│                             │       │                             │
│  Estoque exibido       12   │       │  Estoque disponível     7   │
│  Versão 41 · snapshot local │       │  Versão 42 · confirmado     │
│                             │       │                             │
│  ⚠ POSSIVELMENTE STALE      │       │  ✓ CONFIRMADO PELO SERVIDOR │
└─────────────────────────────┘       └─────────────────────────────┘
                 duas interfaces · um único PostgreSQL
```

Se o frontend tratar o número `12` como verdade de negócio, poderá prometer uma reserva impossível. Esta POC torna a divergência visível e prova uma regra essencial:

> [!IMPORTANT]
> **Consistência visual melhora a experiência. Integridade no backend protege o negócio.**

### O que esta POC prova

| Risco real | Experimento | Proteção aplicada |
|:---|:---|:---|
| Snapshot de servidor envelhece | leitura `cached` por 60 segundos | origem e idade do dado visíveis |
| Estado remoto é duplicado no cliente | modo vulnerável copia o estoque para Zustand | isolamento explícito do antipadrão |
| Duas abas divergem | A preserva 12 enquanto B confirma 7 | BroadcastChannel no modo corrigido |
| Mutação otimista é rejeitada | UI antecipa a reserva | rollback para o snapshot anterior |
| Duas reservas disputam a última unidade | chamadas concorrentes reais | `UPDATE` condicional atômico |

---

## ⚔️ O mesmo cenário, dois modos

| | ⚠️ Modo vulnerável | ✅ Modo corrigido |
|:---|:---|:---|
| **Server state** | copiado intencionalmente para Zustand | controlado pelo TanStack Query |
| **Reserva local** | atualiza somente a própria cópia | atualização otimista |
| **Falha da API** | interface pode continuar enganosa | rollback automático |
| **Outra aba mudou** | snapshot permanece stale | query invalidada via BroadcastChannel |
| **Regra de estoque** | protegida no PostgreSQL | protegida no PostgreSQL |

```mermaid
flowchart LR
    classDef danger fill:#2b1616,stroke:#ff7777,color:#ffffff
    classDef safe fill:#10241a,stroke:#5bdd94,color:#ffffff
    classDef data fill:#132238,stroke:#66a3ff,color:#ffffff

    API[(PostgreSQL<br/>7 unidades)]:::data

    subgraph V[Modo vulnerável]
        VQ[Leitura inicial] --> VZ[Zustand<br/>12 unidades]
        VZ --> VUI[Interface<br/>continua em 12]:::danger
    end

    subgraph F[Modo corrigido]
        BC[BroadcastChannel] --> IQ[Invalidate query]
        IQ --> TQ[TanStack Query<br/>7 unidades]
        TQ --> FUI[Interface<br/>atualizada para 7]:::safe
    end

    API -. mudança externa não aplicada .-> VZ
    API --> TQ
```

---

## 🎬 Demonstração em 60 segundos

### 1. Provoque a inconsistência

1. Abra os atalhos **Operador A** e **Operador B**.
2. Nas duas abas, selecione `Vulnerável` + `client`.
3. Restaure a demo: ambos visualizam **12 scanners**.
4. No Operador B, reserve **5 unidades**.
5. B passa a exibir **7**; A continua em **12**.
6. Em A, clique em **Verificar servidor** para revelar a divergência entre as versões 41 e 42.

### 2. Teste a garantia real

Tente reservar, em A, mais unidades do que o banco ainda possui. Mesmo com uma interface desatualizada sugerindo disponibilidade, a API responde:

```json
{
  "code": "INSUFFICIENT_STOCK",
  "message": "Reserva rejeitada: restam apenas 7 unidades.",
  "currentItem": {
    "available": 7,
    "version": 42
  }
}
```

### 3. Aplique a correção

Troque as duas abas para `Corrigido`, restaure o cenário e repita. A reserva é aplicada otimisticamente, confirmada pelo servidor e propagada para a outra aba.

```mermaid
sequenceDiagram
    autonumber
    participant A as Operador A
    participant B as Operador B
    participant Q as TanStack Query
    participant API as Route Handler
    participant DB as PostgreSQL

    B->>Q: reservar 5
    Q-->>B: UI otimista: 12 → 7
    Q->>API: POST /api/reservations
    API->>DB: UPDATE ... WHERE available >= 5
    DB-->>API: available 7 · version 42
    API-->>Q: 201 Created
    Q-->>A: BroadcastChannel → invalidate
    A->>API: GET /api/inventory
    API-->>A: 7 unidades · version 42
```

---

## 🧭 Arquitetura

```mermaid
flowchart TB
    classDef browser fill:#171b19,stroke:#5bdd94,color:#f1f5f2
    classDef next fill:#171b19,stroke:#929b96,color:#f1f5f2
    classDef database fill:#132238,stroke:#66a3ff,color:#f1f5f2

    subgraph Browser[Browser · cada aba tem seu próprio estado]
        UI[InventoryLab]:::browser
        TQ[TanStack Query<br/>server state]:::browser
        Z[Zustand<br/>UI + snapshot vulnerável]:::browser
        URL[Search Params<br/>estado compartilhável]:::browser
        BC[BroadcastChannel<br/>sincronização entre abas]:::browser
        UI --> TQ
        UI --> Z
        URL --> UI
        BC --> TQ
    end

    subgraph Next[Next.js App Router]
        SC[Server Components<br/>cached · dynamic]:::next
        RH[Route Handlers<br/>GET · POST · reset]:::next
    end

    DB[(PostgreSQL<br/>inventory + version)]:::database

    SC --> DB
    TQ --> RH
    RH --> DB
```

### Três estados, três responsabilidades

| Tipo de estado | Tecnologia | Responsabilidade |
|:---|:---|:---|
| **Server state** | TanStack Query | estoque remoto, cache, mutações e invalidação |
| **Client state** | Zustand | quantidades digitadas, preferência do diagnóstico e experimento vulnerável |
| **URL state** | Search Params | operador, modo, estratégia, produto e filtro compartilháveis |

### Estratégias de leitura

```text
cached   ── Server Component ── snapshot com revalidate: 60s
dynamic  ── Server Component ── consulta atual por requisição
client   ── Client Component ── shell + TanStack Query
```

Todas exibem no diagnóstico:

- origem (`server cache`, `dynamic`, `query cache` ou `local snapshot`);
- versão persistida;
- horário da última leitura;
- idade do dado;
- estado `atualizado`, `possivelmente desatualizado` ou `conflito rejeitado`.

---

## 🛡️ A garantia de integridade

Os dois modos chegam ao mesmo comando atômico. O backend não recebe nem confia no estoque mostrado pela interface:

```sql
UPDATE inventory
SET available = available - $1,
    version = version + 1,
    updated_at = NOW()
WHERE product_id = $2
  AND available >= $1
RETURNING product_id, name, available, version, updated_at;
```

```mermaid
flowchart LR
    R[Reserva recebida] --> V{Quantidade válida?}
    V -->|não| E400[400<br/>INVALID_REQUEST]
    V -->|sim| U[UPDATE atômico]
    U -->|1 linha| E201[201<br/>reserva confirmada]
    U -->|0 linhas| F{Produto existe?}
    F -->|não| E404[404<br/>PRODUCT_NOT_FOUND]
    F -->|sim| E409[409<br/>INSUFFICIENT_STOCK]
```

Além da condição no `UPDATE`, a tabela possui `CHECK (available >= 0)`. A correção visual não é uma pré-condição para preservar o estoque.

---

## 🚀 Executando localmente

### Pré-requisitos

- Node.js **22 ou superior**;
- npm;
- Docker com Compose.

### Inicialização

```bash
cd nextjs-rendering-state

cp .env.example .env
docker compose up -d --wait
npm install
npm run db:migrate
npm run dev
```

Abra [`http://localhost:3000/inventory`](http://localhost:3000/inventory).

<details>
<summary><strong>Comandos úteis</strong></summary>

```bash
npm run dev          # servidor de desenvolvimento
npm run db:migrate   # cria a tabela e aplica o seed inicial
npm run db:reset     # restaura os três produtos
npm run build        # build de produção
npm run typecheck    # TypeScript estrito
npm run lint         # análise estática
npm test             # testes unitários + integração quando configurada
npm run test:e2e     # cenários reais em duas abas
```

</details>

---

## 🧪 Estratégia de testes

| Camada | Cenário | Invariante esperada |
|:---|:---|:---|
| Unitário | atualização otimista | altera a projeção sem modificar o snapshot de rollback |
| Unitário | snapshot vulnerável | ignora um valor remoto posterior até sincronização explícita |
| Integração | duas reservas para a última unidade | 1 sucesso, 1 rejeição, estoque `0`, versão `+1` |
| E2E | duas abas no modo vulnerável | A permanece em `12` depois que B chega a `7` |
| E2E | duas abas no modo corrigido | BroadcastChannel faz A chegar a `7` |
| E2E | reserva otimista rejeitada | interface retorna a `12` e informa o rollback |

```bash
# Qualidade estática e testes rápidos
npm run typecheck
npm run lint
npm test
npm run build

# Integração real com o banco de testes do Compose
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5434/stale_data_detective_test npm test

# Fluxos completos em duas abas
npm run test:e2e
```

> [!NOTE]
> Sem `TEST_DATABASE_URL`, a suíte de concorrência é ignorada de forma explícita. Os testes unitários continuam sendo executados normalmente.

---

## 🗂️ Estrutura do projeto

```text
src/
├── app/
│   ├── api/                 # inventory, reservations e reset
│   └── inventory/           # rota pública e streaming
├── components/
│   ├── atoms/               # Button e StatusBadge
│   ├── molecules/           # ProductCard e DiagnosticPanel
│   ├── organisms/           # InventoryLab
│   └── providers/           # QueryClient por sessão
├── lib/                     # PostgreSQL, loaders e cliente HTTP
├── store/                   # estado local Zustand
└── types/                   # contratos compartilhados

tests/
├── unit/                    # projeção otimista e snapshot stale
├── integration/             # concorrência real no PostgreSQL
└── e2e/                     # duas abas com Playwright
```

---

## 🧠 Decisões e trade-offs

- **A falha é visual, não transacional.** O modo vulnerável demonstra stale data sem implementar overselling deliberado.
- **BroadcastChannel cobre somente a mesma origem no mesmo navegador.** SSE é a evolução natural para usuários em navegadores ou máquinas diferentes.
- **Zustand não substitui o cache remoto.** A duplicação existe apenas no experimento que precisa demonstrar por que ela é perigosa.
- **A rota é única e compartilhável.** `operator`, `mode`, `strategy`, `product` e `availability` vivem na URL.
- **A versão é evidência, não autorização.** A reserva é protegida pela condição de disponibilidade no banco.

### Fora do escopo da v1

`autenticação` · `histórico de reservas` · `múltiplos depósitos` · `SSE/WebSocket` · `deploy em cloud`

---

## 🔭 Próximas evoluções

- [ ] SSE com reconexão para sincronizar navegadores distintos;
- [ ] gravação/GIF da demonstração em duas janelas;
- [ ] GitHub Actions com PostgreSQL de serviço e Playwright;
- [ ] métricas de conflitos, idade média do cache e taxa de rollback.

---

<div align="center">

### A interface pode estar atrasada. O banco não pode estar errado.

Construído para demonstrar os limites do estado no frontend e as garantias de consistência entre camadas.

[`docs/spec.md`](docs/spec.md) · [`database/schema.sql`](database/schema.sql) · [`tests/e2e`](tests/e2e)

</div>

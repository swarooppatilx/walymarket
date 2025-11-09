# Walymarket
![Walymarket Screenshot](/assets/screenshot.png)

## Overview

Walymarket is a decentralized prediction market that enforces verifiable, on‑chain resolution of outcomes. By integrating verifiable data provenance from Walrus, market results are resolved against immutable, auditable sources rather than centralized arbiters. This implementation was developed for the Provably Authentic (Truth Engine + Trust Oracle) track of the Road to Haulout: Walrus Buildathon.

## Technical Architecture

The codebase is organized as a `pnpm` monorepo separating on‑chain logic and the client.

### Tech stack

- Languages: Move (on‑chain), TypeScript (frontend)
- Frontend: React, Vite
- Package manager / monorepo: pnpm
- Blockchain / runtime: Sui, Suibase (localnet tooling)
- Wallet & SDKs: @mysten/dapp-kit, @suiware/kit
- State & data fetching: React Query
- On‑chain tooling: Move modules, Sui CLI / localnet
- Oracle / verification: Walrus proofs, WalrusOracleAdapter.move

### On‑chain (packages/backend)

The backend is implemented as modular Move modules. Core responsibilities and modules:

- `MarketFactory.move`  
    Entry point for market creation. Provides a `create_permissionless` function that instantiates a shared `Market` object and mints an `AdminCap` at deployment for permissioned operations.

- `Market.move`  
    Encapsulates a single market as a shared object with:
    - Metadata: `title`, `description`, `image_url`
    - LMSR state: `q_yes`, `q_no`, `b`
    - Resolution state: `resolved`, `resolution`
    - Embedded `CollateralVault` for collateral management

- `Lmsr.move`  
    Deterministic pricing math using fixed‑point arithmetic (`SCALE = 1_000_000`) with a 5th‑degree Taylor approximation of `exp(x)` to compute `price_yes`, `price_no`, and `estimate_cost`.

- `CollateralVault.move`  
    Holds market liquidity as a `Balance<SUI>`.

- `OutcomeToken.move`  
    Represents user shares as fungible tokens; each token records `market_id`, `outcome`, and `amount`.

- `WalrusOracleAdapter.move`  
    Adapter that verifies a `Proof` from Walrus and invokes `market::resolve`, decoupling verification from market logic.

### Frontend (packages/frontend)

Single‑page application built with React, Vite, and TypeScript. Key components:

- State & data fetching
    - React Query for server state, caching, and refetching
    - `useGetMarkets`: finds `MarketCreated` events, then uses `multiGetObjects` to batch fetch market objects
    - `usePriceHistory`: reconstructs price history by replaying `Traded` events and reapplying LMSR state changes

- Sui integration
    - `@mysten/dapp-kit` and `@suiware/kit` for wallet connectivity and transactions
    - `useTransact` abstracts transaction construction, signing, and execution with lifecycle callbacks

- Transaction helpers
    - UI components call helpers (e.g., `prepareTradeV2Tx`) to construct `Transaction` blocks, keeping UI logic separate from transaction building

## Prerequisites

- Suibase: https://suibase.io/how-to/install.html  
- Node.js >= 20: https://nodejs.org/en/download/  
- pnpm >= 9: https://pnpm.io/installation

## Local Development

1. Start a local Sui network and explorer (available at http://localhost:9001):
```bash
pnpm localnet:start
```

2. Compile and deploy Move modules to the local network. The deployment script updates the frontend `.env.local` with the package ID:
```bash
pnpm localnet:deploy
```

3. Run the frontend (available at http://localhost:5173):
```bash
pnpm run dev
```

## References

- Sui dApp Starter Docs: https://sui-dapp-starter.dev/docs  
- Suibase Docs: https://suibase.io/intro.html  
- Move Book: https://move-book.com/  

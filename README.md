# Base Activity Hub

> GitHub publishing guide (Ukrainian): [GITHUB_PUBLISH_UA.md](GITHUB_PUBLISH_UA.md). This repository is development software; Base Mainnet deployments and paid functions are not yet enabled.

**Light, responsive Web3 activity dashboard for Base.** This is a working development project with browser wallet integration, genuine EIP-1193 transaction flows, transparent USDC-paid mint/deploy contracts, an optional onchain analytics server, and a deployable website shell.

## Quick start (Windows, macOS, Linux)

1. Install **Node.js 20+** from https://nodejs.org/.
2. Unzip the project and open a terminal in the `base-activity-hub` directory.
3. Run `npm start` (no `npm install` is necessary: there are zero package dependencies).
4. Open **http://localhost:4173** in your browser. MetaMask / Coinbase Wallet extension or a wallet browser is needed for real transactions.
5. For a first visual review, open `desktop-preview.png` or `mobile-preview.png`.

`npm test` runs local ABI, amount parsing, Keccak and ERC-8021 test cases.

## Included features

| Feature | Implementation | Limitations |
|---|---|---|
| Light single-page responsive dashboard | ✅ Complete | Desktop, tablet, mobile |
| English/Ukrainian toggle | ✅ Main navigation, labels and actions | Some secondary text remains English |
| Connect injected EIP-1193 wallet | ✅ | WalletConnect QR / passkey are not integrated |
| Base Mainnet / Base Sepolia selection | ✅ | User must authorize the chain switch |
| ETH and USDC live balances | ✅ With connected wallet | Sepolia uses explicitly configured test token |
| GM / Daily Check-in / Onchain message | ✅ Real onchain transactions | Uses the user’s own address if ActivityBoard isn't deployed |
| Send ETH / USDC | ✅ Real transfers | Recipient/amount are provided and confirmed by user |
| NFT mint | ✅ Transaction flow + Solidity contract | Requires deployed verified NFT contract + proper metadata URLs |
| Deploy Counter/Guestbook/Storage/ERC20/ERC721 | ✅ Transaction flow + Solidity factory | Requires deployed verified factory contract |
| 0.10 USDC fee to your treasury | ✅ Contract source implements exact atomic payment | Fee applies only after contract deployment; user approves exact amount separately |
| Transaction confirmation / explorer link | ✅ | Requires wallet and network |
| Daily tasks / achievements | ✅ UI and confirmed local history | Local history saved per device; not a universal score |
| Historical Base wallet stats | ✅ Optional Etherscan V2 backend | Requires API key and Base tier access; truncated samples flagged |
| Dune hook | 🟡 Parameterized query execution endpoint | Needs your own query ID/API key; linked dashboard alone isn't a wallet API |
| ERC-8021 Builder Code | ✅ Schema-0 suffix generation & inclusion | Add code from Base Dashboard; test attribution after launch |
| Token swap | 🟡 Safe outbound link to Uniswap Base | No integrated swap quotation/transaction API yet |
| x402 micropayment | 🟡 Clearly labeled future integration | Real facilitator/resource/payment verification not configured |
| Base App / Mini App registration | 🟡 Manifest template + instructions | Requires real domain, owner signature and Base Dashboard submission |

**All current live money actions require explicit wallet signatures.** The site never asks for secret phrases/private keys. Fees in the UI are estimates; gas can exceed cents, particularly with contract deployments. Onchain activity does not confer official Base status or guarantee airdrops.

## Fee receiver configured for this build

Minting an NFT and deploying a contract are set up to send the fixed 0.10 USDC service fee to **`0x5F5d8B3Cf23368b9B5fab4e4A391A998803c292F`**. This is your public wallet address, and **must also be provided as the `treasury` constructor argument** when deploying BOTH NFT and Factory contracts; editing `config.js` alone cannot reroute already-deployed contracts. The app checks the onchain `treasury()`, `usdc()` and fee amount before granting payment approval and blocks mismatches. Fees are NOT active until those contracts have been deployed/verified.

## Configuration

Edit `config.js`. Public contract addresses and `baseBuilderCode` are safe to expose; private keys and API keys are not.

- `chains[84532].activityBoard`, `nftContract`, `factoryContract`, `usdc`: testnet contract addresses to deploy first.
- `chains[8453].activityBoard`, `nftContract`, `factoryContract`: mainnet contracts to deploy **only after security review**. Real Base USDC is preconfigured as a public chain address.
- `baseBuilderCode`: enter your short Builder Code from [Base Dashboard](https://dashboard.base.org/) after registering. The app appends its ERC-8021 schema-0 suffix to transactions.
- `nftItems`: collection assets and names.

Copy `.env.example` to `.env` if enabling backend analytics:

```env
ETHERSCAN_API_KEY=your_server_only_key
DUNE_API_KEY=your_server_only_key
DUNE_QUERY_ID=your_own_parameterized_query_id
```

**Never put these secrets in `config.js`.** Etherscan V2 requires the `chainid` parameter (8453 or 84532). Base API access may require a paid plan. If it is unavailable the interface displays accurate RPC-only values and `—` instead of fake historical numbers.

### Contract deployment

See [contracts/DEPLOY.md](contracts/DEPLOY.md). The Solidity sources include:

- `ActivityBoard`: `gm()`, `dailyCheckIn()`, `postMessage(string)`.
- `BaseActivityNFT`: ERC-721 with three artwork kinds and a fixed mint cost of 100,000 USDC base units (0.10 USD at 6 decimals) paid directly to the deployment-time treasury.
- `BaseActivityFactory`: accepts exact 0.10 USDC and deploys user-owned Counter, Guestbook, Storage, Token and NFT Collection instances.
- `TestOnlySixDecimalToken`: **testnet-only** mock, not USDC.

**Important:** Solidity contracts have been authored but could not be compiled with `forge`/`solc` in this environment, and have NOT been audited or deployed on a real chain. Do not use them with real funds until they have been compiled, unit/integration tested, independently reviewed, deployed on Base Sepolia and verified on BaseScan.

### Production hosting

The Node server serves the frontend and proxies analytics API credentials. For deployment of this exact architecture use **Render, Railway, Fly.io or your own Docker VPS**. A static-only host (including a basic Vercel static build) will show the UI and wallet flows but not `/api/profile` unless you port the server to its serverless runtime.

Run `docker build -t base-activity-hub .` and expose `PORT=4173`, or use the `Dockerfile` on a provider that supports it. HTTPS is required for some wallet APIs and for production best practices.

The **Base Dashboard is an app registration / attribution service, not a web-hosting service.** Prepare your production URL, icon, screenshots, signed account association, and Builder Code. See `BASE_APP_SETUP_UA.md`.

## References

- https://docs.base.org/
- https://github.com/base/skills/tree/master/skills/build-on-base
- https://basescan.org/api
- https://docs.etherscan.io/etherscan-v2
- https://dune.com/nvthao/base-network-analytics-dashboard
- https://dune.mintlify.app/api-reference/executions/endpoint/execute-query

## Safety decisions

- Never store a wallet private key or seed phrase.
- Do not silently pay the owner. The only owner earnings implemented are explicitly disclosed paid NFT mint and paid factory deployment.
- No infinite USDC approvals: the UI requests approval only for exactly 0.10 USDC per action.
- External swaps are sent to the official Uniswap website, not an unknown embedded contract.
- Wallet profile values that cannot be established are shown as unavailable, not fabricated.
- NFT art/brand is community-made and explicitly not affiliated with Base or Coinbase.

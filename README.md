# Base Activity Hub

**A light, responsive onchain activity dashboard for Base Mainnet.** Analyze an EVM wallet, send GM and check-ins, make transactions, discover contract and NFT features, and share wallet statistics as an image or an X post.

- **Live app:** https://base-activity-hub.onrender.com/
- **Network:** Base Mainnet (chain ID `8453`) only
- **Language:** English
- **Appearance:** Light and dark themes, with the user's preference saved in the browser
- **Chain transaction fees:** Shown by the user's wallet before confirmation
- **Maintainer:** [Verdigo93](https://github.com/Verdigo93)

This is an **independent community tool**, not an official Base/Coinbase app. Onchain activity is **not** proof of airdrop eligibility or a promise of rewards.

## What works and what still needs deployment

| Feature | Production status |
|---|---|
| English-only dashboard, dark/light themes, responsive UI | Implemented |
| MetaMask/Coinbase injected-wallet connection | Implemented; requests Base Mainnet when connecting |
| Live ETH/USDC balances and outgoing transaction count | Implemented via wallet/RPC |
| Historical wallet statistics and activity heatmap | Available when indexed API data is provided; sampled histories are labeled incomplete |
| GM, Daily Check-in, Onchain Message | Configured for [Mainnet ActivityBoard](https://basescan.org/address/0x050A046E37947bb8DAF2b2A1a3C00c191EB92942); live transactions require user approval |
| ETH and native USDC transfers | Implemented; recipient and fee must be reviewed in the wallet |
| Swap | Opens Uniswap; the swap is executed separately on Uniswap |
| Share-card PNG | 1200 × 675 branded design generated in-browser; optional download |
| Share to X | Opens a prefilled X composer with real available wallet stats and the app link |
| NFT mint ($0.10 USDC service fee) | **Not live**: NFT contract needs deployment, verification, and testing |
| Contract factory / ERC-20 creation ($0.10 USDC service fee) | **Not live**: factory contract needs deployment, verification, and testing |
| x402 micropayments | **Not live on Mainnet**; testnet payment flow is not exposed through the production UI |

Only connect a wallet you control. Never enter a seed phrase or private key. The website never needs custody of wallet keys.

## Wallet activity rating: four 0–100 scores

All four individual criteria display a **0–100** rating, not different denominators such as 30/30 or 20/20. Overall score also ranges **0–100**, calculated as a weighted average:

| Criterion | Threshold for 100/100 | Weight |
|---|---|---|
| Transactions | 3,000 outgoing transactions | 30% |
| Wallet age | First observed activity from Base Mainnet public launch (August 9, 2023) | 25% |
| Contract destinations | 50 distinct call destinations | 25% |
| Active days | 20 active days within the past 30 days | 20% |

Formula: `round(tx × .30 + age × .25 + destinations × .25 + activeDays × .20)`.

Individual values are linearly normalized up to 100. If an input is unavailable, no overall rating is invented. Wallet age and contract activity derived from Alchemy transfer history may be **sample-based** and do not necessarily cover a wallet's complete history. Contract destinations are not verified unique dApps. This is an independent engagement metric, not an official Base rank.

## Share My Base Activity

The Share Card module generates a high-contrast 1200×675 image with wallet address, overall score (when available), outgoing transactions, days on Base, active days, contract destinations, and a prominent link to the website.

- **Download PNG** saves the image locally if the user wants it.
- **Share to X** opens the official X compose intent with an English post filled with the wallet's current values and `https://base-activity-hub.onrender.com/`.
- **Copy text** copies the same post text.
- Automatic image attachment/posting is intentionally not promised: the user may attach the PNG manually and publishes only after confirming in X.

## Development

Node.js 20+ is required. The project uses no runtime npm dependencies.

```bash
npm test
npm start
```

Open `http://localhost:4173` after starting the server. Contract compiler tests, EIP-1193 utilities, scoring behavior, and the X share URL are checked in the repository's automated test suite.

Render deploys the repository from `main`. The server includes `/api/health` and `/api/profile`. Optional variables should be kept in **Render Environment**, never in committed `.env` files:

- `ALCHEMY_API_KEY` for sampled indexed transfer analytics on Base;
- `ETHERSCAN_API_KEY` for supported explorer history;
- `DUNE_API_KEY` and `DUNE_QUERY_ID` for your own parametrized Dune query.

## Smart contracts and payout

Contract source: [contracts/BaseActivity.sol](contracts/BaseActivity.sol). Read the contract source and review the constructor parameters **before** spending Mainnet ETH.

- Mainnet ActivityBoard: `0x050A046E37947bb8DAF2b2A1a3C00c191EB92942`
- Native Base Mainnet USDC: `0x833589fCD6EDB6E08f4c7C32D4f71b54bdA02913`
- Intended service-fee recipient: `0x5F5d8B3Cf23368b9B5fab4e4A391A998803c292F`
- Proposed NFT/factory service fee: `0.10 USDC` per successful paid action **plus gas**

**NFT and Factory contract addresses are not yet configured.** Solidity compilation and automated tests do **not** replace independent review, deployment, transaction simulation, and verifying fee receiver / USDC token addresses onchain. Paid actions remain disabled until those steps are complete.

## Development roadmap

1. Verify ActivityBoard runtime on Mainnet through an actual wallet-initiated GM and Check-in.
2. Audit/review NFT and factory contracts, deploy and verify them, then test a small real USDC mint and factory deployment.
3. Implement and verify a **Mainnet** x402 paid resource. No Sepolia switching or test-USDC payments in the production UI.
4. Improve analytics quality and cache/rate-limiting before promoting the app to a larger audience.
5. Register the app / Builder Code in the Base developer dashboard after deployment and transaction checks.

Project files and instructions are provided as development artifacts. Report incorrect data rather than interpreting sampled numbers as a guaranteed wallet ranking.

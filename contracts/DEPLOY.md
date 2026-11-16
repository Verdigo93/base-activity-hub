# Deploying on Base

⚠️ Review, test and independently audit these contracts before Base Mainnet. Neither a Solidity compiler nor a real wallet/private key is bundled in this project. This is source code, **not deployed contracts**.

**Configured treasury:** `0x5F5d8B3Cf23368b9B5fab4e4A391A998803c292F`. Pass this same address as `treasuryAddress` to both paid contracts on testnet and mainnet. This is a publicly visible wallet address, not a signing key. Note: on Sepolia, test USDC has no dollar value.

## First: Base Sepolia (chain ID 84532)

1. Install Foundry from https://book.getfoundry.sh/ and create a local keystore with `cast wallet import` (never commit/export a private key into a website).
2. Compile: `forge build` after adding a `foundry.toml` or placing sources in a Foundry project. Solidity version ^0.8.24.
3. Deploy `TestOnlySixDecimalToken`; call `claim()` from your test wallet to get test units. **Do not use real money for this token.**
4. Deploy `ActivityBoard` (no constructor arguments).
5. Deploy `BaseActivityNFT` with: `(testTokenAddress, treasuryAddress, ["https://your-domain/metadata/genesis.json","https://your-domain/metadata/explorer.json","https://your-domain/metadata/diamond.json"])`.
6. Deploy `BaseActivityFactory` with `(testTokenAddress, treasuryAddress)`.
7. Add the **public addresses** under `chains[84532]` in `config.js`. Check each address carefully and verify contract source on Sepolia BaseScan.
8. Run tests: mint requires exact test-token approval first, mint transfers 0.10 to treasury, deployed contract owner is the user, revert rolls back payment.

## Then: Base Mainnet (chain ID 8453)

1. Use canonical native Base USDC: `0x833589fCD6EDB6E08f4c7C32D4f71b54bdA02913` (verify independently before deployment).
2. Choose a secure receiving treasury **controlled by you**, preferably a multisig or separate operations wallet.
3. Host metadata/images on the production domain and replace placeholder URLs in `/metadata/*.json`.
4. Deploy and verify contracts with BaseScan. Update mainnet contract addresses in `config.js`.
5. Test the real purchase & deploy flows with **small amounts** from a separate wallet.
6. Register your app and Builder Code on base.dev. Enter your Builder Code in `config.js`: the app will append a schema-0 ERC-8021 suffix to its EIP-1193 transactions. Verify a real transaction on BaseScan and base.dev.

**USDC fee:** each NFT mint and factory deployment transfers exactly 100,000 base units of a 6-decimal token (= 0.10 USDC) from user to your treasury in the same transaction as the action. This is in addition to network gas. First use generally requires a separate, explicitly approved allowance transaction.

**Security:** no `delegatecall`, proxy upgrades, arbitrary recipient collection, admin asset seizure, or wallet permissions beyond exact approvals. Audit and standard wallet simulation remain necessary before mainnet.

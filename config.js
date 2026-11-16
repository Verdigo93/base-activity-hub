/* Public configuration. NEVER put private keys or API secrets in this file. */
export const CONFIG = {
  appName: "Base Activity Hub",
  // Deploy contracts from contracts/BaseActivity.sol, then paste the verified public addresses here.
  chains: {
    8453: {
      name: "Base Mainnet", rpcUrl: "https://mainnet.base.org", explorer: "https://basescan.org",
      usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      // Deployed by the project owner on Base Mainnet. The UI checks bytecode and read methods before sending GM/check-in/message calls.
      activityBoard: "0x050A046E37947bb8DAF2b2A1a3C00c191EB92942", nftContract: "0xFBec66a66F3fdEb4675F2035CB5B7B6a6A536e9d", factoryContract: "",
    },

  },
  // Treasury is configured INSIDE NFT and factory contracts at deployment time.
  // This optional direct-pay address is used ONLY for the explicitly labelled voluntary tip.
  treasuryReceiver: "0x5F5d8B3Cf23368b9B5fab4e4A391A998803c292F", // Your public USDC fee receiver; baked into NFT/factory contract at deployment.
  tipReceiver: "0x5F5d8B3Cf23368b9B5fab4e4A391A998803c292F",
  baseBuilderCode: "", // Register on base.dev; the app encodes its Schema-0 ERC-8021 suffix automatically.
  // NFT prices are checked against onchain mintPrice(tier) before USDC approval.
  deployPriceUsdc: 0.1,
  nftItems: [
    { id: 0, name: "Base Genesis", rarity: "Common", image: "/assets/genesis.jpg", priceUsdc: "0.10", priceUnits: 100000, maxSupply: 10000 },
    { id: 1, name: "Base Ember", rarity: "Rare", image: "/assets/ember.jpg", priceUsdc: "0.50", priceUnits: 500000, maxSupply: 1000 },
    { id: 2, name: "Base Crown", rarity: "Legendary", image: "/assets/crown.jpg", priceUsdc: "1.00", priceUnits: 1000000, maxSupply: 100 },
  ],
};

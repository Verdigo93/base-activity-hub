/* Public configuration. NEVER put private keys or API secrets in this file. */
export const CONFIG = {
  appName: "Base Activity Hub",
  // Deploy contracts from contracts/BaseActivity.sol, then paste the verified public addresses here.
  chains: {
    8453: {
      name: "Base Mainnet", rpcUrl: "https://mainnet.base.org", explorer: "https://basescan.org",
      usdc: "0x833589fCD6EDB6E08f4c7C32D4f71b54bdA02913",
      activityBoard: "", nftContract: "", factoryContract: "",
    },
    84532: {
      name: "Base Sepolia", rpcUrl: "https://sepolia.base.org", explorer: "https://sepolia.basescan.org",
      // Circle official USDC on Base Sepolia (test tokens have no monetary value).
      usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", activityBoard: "", nftContract: "", factoryContract: "",
    },
  },
  // Treasury is configured INSIDE NFT and factory contracts at deployment time.
  // This optional direct-pay address is used ONLY for the explicitly labelled voluntary tip.
  treasuryReceiver: "0x5F5d8B3Cf23368b9B5fab4e4A391A998803c292F", // Your public USDC fee receiver; baked into NFT/factory contract at deployment.
  tipReceiver: "0x5F5d8B3Cf23368b9B5fab4e4A391A998803c292F",
  baseBuilderCode: "", // Register on base.dev; the app encodes its Schema-0 ERC-8021 suffix automatically.
  nftPriceUsdc: 0.1,
  deployPriceUsdc: 0.1,
  nftItems: [
    { id: 0, name: "Base Genesis", image: "/assets/genesis.png" },
    { id: 1, name: "Base Explorer", image: "/assets/explorer.png" },
    { id: 2, name: "Base Diamond", image: "/assets/diamond.png" },
  ],
};

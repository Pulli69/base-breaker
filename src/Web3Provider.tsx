import { http, createConfig } from 'wagmi';
// @ts-ignore
import { base } from 'viem/chains';
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors';

const projectId = 'b29a279dc4130089e9240409a8342416'; // WalletConnect project ID

// ── Wagmi config for Base Mainnet (Chain ID 8453) ──
export const wagmiConfig = createConfig({
  chains: [base],
  connectors: [
    injected(),                                         // Generic injected (MetaMask, Rabby, etc.)
    coinbaseWallet({ appName: 'Base Brick Breaker' }),  // Base Wallet / Coinbase Wallet
    walletConnect({ projectId }),                        // WalletConnect (scan QR)
  ],
  transports: {
    [base.id]: http(),
  },
});

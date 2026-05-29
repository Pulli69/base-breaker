import { http, createConfig } from 'wagmi';
// @ts-ignore
import { base } from 'viem/chains';
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors';

const projectId = 'b29a279dc4130089e9240409a8342416'; // WalletConnect project ID

// ── Base Builder Code Attribution ──
// Encoded String: 0x62635f7879377677756f690b0080218021802180218021802180218021
const BUILDER_CODE = '0x62635f7879377677756f690b0080218021802180218021802180218021' as const;

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
  dataSuffix: BUILDER_CODE,
});

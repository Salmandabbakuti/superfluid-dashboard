"use client";
import { useState, useEffect } from "react";
import {
  ThirdwebProvider,
  metamaskWallet,
  coinbaseWallet,
  walletConnect,
  rainbowWallet,
  trustWallet
} from "@thirdweb-dev/react";
import {
  Ethereum,
  Polygon,
  Mumbai,
} from "@thirdweb-dev/chains";
import { chainId } from "@/utils/constants";

const supportedWallets = [
  metamaskWallet({ recommended: true }),
  coinbaseWallet({ recommended: true }),
  walletConnect(),
  rainbowWallet(),
  trustWallet()
];

const supportedChains = [
  Ethereum,
  Polygon,
  Mumbai
];
const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;

export default function Web3Provider({ children }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <ThirdwebProvider
      activeChain={chainId}
      supportedChains={supportedChains}
      supportedWallets={supportedWallets}
      autoConnect={true}
      clientId={clientId}
      dAppMeta={{
        name: "Web3 Dapp Starter",
        description: "Web3 Dapp Starter",
        logoUrl: "https://example.com/logo.png",
        url: "https://example.com",
        isDarkMode: true
      }}
    >
      {mounted && children}
    </ThirdwebProvider>
  );
}
"use client";
import { Divider, Layout } from "antd";
import { ConnectWallet } from "@thirdweb-dev/react";
import { fDAIxAddress } from "@/utils/constants";
import NotificationDrawer from "./NotificationDrawer";
import { tokens } from "@/utils";
import "antd/dist/reset.css";

const { Header, Footer, Content } = Layout;

export default function SiteLayout({ children }) {
  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 99,
          padding: 0,
          color: "#fff",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}
      >
        <h3>Superfluid Dashboard</h3>
        <div style={{ display: "flex", alignItems: "center" }}>
          <NotificationDrawer />
          <ConnectWallet
            theme={"light"} // light | dark
            switchToActiveChain={true}
            hideTestnetFaucet={false}
            modalSize={"wide"} // compact | wide
            supportedTokens={{
              80001: tokens
            }}
            displayBalanceToken={{
              80001: fDAIxAddress
            }}
            termsOfServiceUrl="https://example.com/terms"
            privacyPolicyUrl="https://example.com/privacy"
          />
        </div>
      </Header>

      <Content
        style={{
          margin: "12px 8px",
          padding: 12,
          minHeight: "100%",
          color: "black",
          maxHeight: "100%"
        }}
      >
        {children}
      </Content>
      <Divider plain />
      <Footer style={{ textAlign: "center" }}>
        <a
          href="https://github.com/Salmandabbakuti"
          target="_blank"
          rel="noopener noreferrer"
        >
          ©{new Date().getFullYear()} Salman Dabbakuti. Powered by Superfluid &
          Push Protocol
        </a>
        <p style={{ fontSize: "12px" }}>v0.0.2</p>
      </Footer>
    </Layout>
  );
}

import detectEthereumProvider from "@metamask/detect-provider";
import React, { createContext, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import DefaultAxonBridge from "../light-godwoken/axonBridge";
import DefaultAxonBridgeProvider from "../light-godwoken/axonBridgeProvider";
import AxonBridge from "../light-godwoken/axonBridge";

export const AxonBridgeContext = createContext<DefaultAxonBridge | undefined>(undefined);
AxonBridgeContext.displayName = "AxonBridgeContext";

export const Provider: React.FC = (props) => {
  const [axonBridge, setAxonBridge] = useState<DefaultAxonBridge>();
  const location = useLocation();
  useEffect(() => {
    detectEthereumProvider().then((ethereum: any) => {
      if (ethereum) {
        ethereum.request({ method: "eth_accounts" }).then((accounts: string[]) => {
          if (!accounts || !accounts[0]) return;

          let instance: DefaultAxonBridge = new AxonBridge(new DefaultAxonBridgeProvider(accounts[0], ethereum));
          setAxonBridge(instance);
        });

        ethereum.on("accountsChanged", (accounts: string[] | undefined) => {
          if (!accounts || !accounts[0]) return setAxonBridge(undefined);

          let instance: DefaultAxonBridge = new AxonBridge(new DefaultAxonBridgeProvider(accounts[0], ethereum));
          setAxonBridge(instance);
        });
      } else {
        alert("Please install MetaMask to use Godwoken Bridge!");
      }
    });
  }, [axonBridge, location.pathname]);

  return <AxonBridgeContext.Provider value={axonBridge || undefined}>{props.children}</AxonBridgeContext.Provider>;
};

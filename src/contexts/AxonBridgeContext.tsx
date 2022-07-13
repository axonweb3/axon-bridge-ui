import detectEthereumProvider from "@metamask/detect-provider";
import React, { createContext, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import DefaultDefaultAxonBridgeProvider from "../light-godwoken/axonBridgeProvider";
import DefaultAxonBridge from "../light-godwoken/axonBridge";

export const AxonBridgeContext = createContext<DefaultAxonBridge | undefined>(undefined);
AxonBridgeContext.displayName = "AxonBridgeContext";

export const Provider: React.FC = (props) => {
  const [axonBridge, setDefaultAxonBridge] = useState<DefaultAxonBridge>();
  const location = useLocation();
  useEffect(() => {
    detectEthereumProvider().then((ethereum: any) => {
      if (ethereum) {
        ethereum.request({ method: "eth_accounts" }).then((accounts: string[]) => {
          if (!accounts || !accounts[0]) return;

          let instance: DefaultAxonBridge = new DefaultAxonBridge(new DefaultDefaultAxonBridgeProvider(accounts[0], ethereum));;
          setDefaultAxonBridge(instance);
        });

        ethereum.on("accountsChanged", (accounts: string[] | undefined) => {
          if (!accounts || !accounts[0]) return setDefaultAxonBridge(undefined);

          let instance: DefaultAxonBridge = new DefaultAxonBridge(new DefaultDefaultAxonBridgeProvider(accounts[0], ethereum));;
          setDefaultAxonBridge(instance);
        });
      } else {
        alert("Please install MetaMask to use Godwoken Bridge!");
      }
    });
  }, [axonBridge, location.pathname]);

  return (
    <AxonBridgeContext.Provider value={axonBridge || undefined}>{props.children}</AxonBridgeContext.Provider>
  );
};

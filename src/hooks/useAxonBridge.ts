import { useContext } from "react";
import { AxonBridgeContext } from "../contexts/AxonBridgeContext";
import DefaultAxonBridge from "../light-godwoken/axonBridge";
export const useAxonBridge = (): DefaultAxonBridge | undefined => {
  const axonBridge = useContext(AxonBridgeContext);
  return axonBridge;
};

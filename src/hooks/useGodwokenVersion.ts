import { GodwokenVersion } from "../light-godwoken/constants/configTypes";
import { useAxonBridge } from "./useAxonBridge";

export const useGodwokenVersion = (): GodwokenVersion | undefined => {
  const axonBridge = useAxonBridge();
  return axonBridge?.getVersion();
};

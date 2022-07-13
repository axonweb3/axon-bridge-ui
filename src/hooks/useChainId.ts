import { useQuery, UseQueryResult } from "react-query";
import { axonBridgeV1 } from "../light-godwoken";
import { useAxonBridge } from "./useAxonBridge";

export const useChainId = (): UseQueryResult<string> => {
  const axonBridge = useAxonBridge();

  return useQuery(
    ["queryChainId"],
    () => {
      if (!lightGodwoken) {
        throw new Error("LightGodwokenV1 not found");
      }
      if (lightGodwoken instanceof axonBridgeV1) {
        return axonBridge.getChainId();
      }
      return "";
    },
    {
      enabled: !!lightGodwoken,
    },
  );
};

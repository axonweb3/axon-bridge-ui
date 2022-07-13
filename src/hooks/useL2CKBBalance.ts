import { useQuery, UseQueryResult } from "react-query";
import { useAxonBridge } from "./useAxonBridge";

export const useL2CKBBalance = (): UseQueryResult<string> => {
  const axonBridge = useAxonBridge();

  return useQuery(
    ["queryL2CKBBalance", { version: axonBridge?.getVersion(), l2Address: axonBridge?.provider.getL2Address() }],
    () => {
      return axonBridge?.getL2CkbBalance();
    },
    {
      enabled: !!lightGodwoken,
    },
  );
};

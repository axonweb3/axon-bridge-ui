import { useQuery, UseQueryResult } from "react-query";
import { useAxonBridge } from "./useAxonBridge";

export const useL1CKBBalance = (): UseQueryResult<string> => {
  const axonBridge = useAxonBridge();

  return useQuery(
    ["queryL1CKBBalance", { version: axonBridge?.getVersion(), l2Address: axonBridge?.provider.getL2Address() }],
    () => {
      return axonBridge?.getL1CkbBalance();
    },
    {
      enabled: !!lightGodwoken,
    },
  );
};

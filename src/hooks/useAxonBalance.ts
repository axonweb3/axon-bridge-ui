import { useQuery, UseQueryResult } from "react-query";
import { useAxonBridge } from "./useAxonBridge";

export const useAxonBalance = (): UseQueryResult<string> => {
  const axonBridge = useAxonBridge();

  return useQuery(
    ["queryAxonBalance", { axonAddress: axonBridge?.provider.getAxonAddress() }],
    () => {
      return axonBridge?.getATBalance();
    },
    {
      enabled: !!axonBridge,
    },
  );
};

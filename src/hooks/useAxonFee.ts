import { useQuery, UseQueryResult } from "react-query";
import { useAxonBridge } from "./useAxonBridge";

export const useAxonFee = (): UseQueryResult<string> => {
  const axonBridge = useAxonBridge();

  return useQuery(
    ["queryAxonFee", {}],
    () => {
      return axonBridge?.getAxonFee();
    },
    {
      enabled: !!axonBridge,
    },
  );
};

import { QueryObserverResult, useQuery } from 'react-query';
import { ForceBridgeContainer } from 'containers/ForceBridgeContainer';

export function useMinWCKBQuery(): QueryObserverResult<string, Error> {
  const { api } = ForceBridgeContainer.useContainer();

  return useQuery(
    ['getWCKBMin', {}],
    () => {
      return api.getWCKBMin();
    },
    {
      enabled: true,
      refetchInterval: false,
      retry: false,
    },
  );
}

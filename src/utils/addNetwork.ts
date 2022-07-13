import { axonBridgeV1 } from "../light-godwoken";

export const addNetwork = async (ethereum: any, axonBridgeV1: axonBridgeV1) => {
  const chainId = await axonBridgeV1.getChainId();
  const layer2Config = axonBridgeV1.getConfig().layer2Config;
  const nativeToken = axonBridgeV1.getNativeAsset();

  const params = [
    {
      chainId: chainId,
      chainName: layer2Config.CHAIN_NAME,
      nativeCurrency: {
        name: nativeToken.name,
        symbol: nativeToken.symbol,
        decimals: nativeToken.decimals,
      },
      rpcUrls: [layer2Config.GW_POLYJUICE_RPC_URL],
      blockExplorerUrls: [layer2Config.SCANNER_URL],
    },
  ];
  ethereum
    .request({ method: "wallet_addEthereumChain", params })
    .catch((error: Error) => console.log("Error", error.message));
};

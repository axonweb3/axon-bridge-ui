import { ethers } from 'ethers';
import { JSONRPCClient, JSONRPCRequest } from 'json-rpc-2.0';
import fetch from 'node-fetch';
import CrossChain from '../../src/abi/CrossChain.json';
import ERC20 from '../../src/abi/ERC20.json';
import { API, AssetType, NetworkBase, NetworkTypes, RequiredAsset } from '../types';
import { GetBalanceResponse } from '../types/apiv1';
import { stringToUint8Array } from '../utils/index';

export class AxonApiHandler implements API.ForceBridgeAPIV1 {
  provider: ethers.providers.JsonRpcProvider;
  crossChainAddress: string;
  crossChainContract: ethers.Contract;

  constructor(axonRpcUrl: string) {
    this.provider = new ethers.providers.JsonRpcProvider(axonRpcUrl);
    this.crossChainAddress = '0xf67bc4e50d1df92b0e4c61794a4517af6a995cb2';
    this.crossChainContract = new ethers.Contract(this.crossChainAddress, CrossChain.abi, this.provider);
    // eslint-disable-next-line no-console
    console.log(`crossChainContract: ${this.crossChainContract}`);
  }

  // constructor(forceBridgeUrl: string) {
  //   this.client = new JSONRPCClient((jsonRPCRequest: JSONRPCRequest) =>
  //     fetch(forceBridgeUrl, {
  //       method: 'POST',
  //       headers: {
  //         'content-type': 'application/json',
  //       },
  //       body: JSON.stringify(jsonRPCRequest),
  //     }).then((response) => {
  //       if (response.status === 200) {
  //         Use client.receive when you received a JSON-RPC response.
  // return response.json().then((jsonRPCResponse) => this.client.receive(jsonRPCResponse));
  // } else if (jsonRPCRequest.id !== undefined) {
  //   return Promise.reject(new Error(response.statusText));
  // } else {
  //   return Promise.reject(new Error('request id undefined'));
  // }
  // }),
  // );
  // }

  getMinimalBridgeAmount(payload: API.GetMinimalBridgeAmountPayload): Promise<API.GetMinimalBridgeAmountResponse> {
    // return Promise.resolve(this.client.request('getMinimalBridgeAmount', payload));
    return (async () => {
      const TokenContract = new ethers.Contract(this.crossChainAddress, CrossChain.abi, this.provider);
      // const erc20_amount = await TokenContract.getWCKBMin();
      const erc20_amount = await TokenContract.fee(payload.xchainAssetIdent, payload.amount);
      const minimalAmount = erc20_amount.toString();
      return { minimalAmount };
    })();
  }

  getBridgeInNervosBridgeFee(
    payload: API.GetBridgeInNervosBridgeFeePayload,
  ): Promise<API.GetBridgeInNervosBridgeFeeResponse> {
    // return Promise.resolve(this.client.request('getBridgeInNervosBridgeFee', payload));
    // eslint-disable-next-line no-console
    console.log(`getBridgeInNervosBridgeFee: ${JSON.stringify(payload)}`);
    return (async () => {
      const fee_amount = await this.crossChainContract.fee(payload.xchainAssetIdent, payload.amount);
      const fee = fee_amount.toString();
      console.log(`getBridgeInNervosBridgeFee: ${JSON.stringify(payload)}, ${fee}`);
      return { fee };
    })();
  }

  getBridgeOutNervosBridgeFee(
    payload: API.GetBridgeOutNervosBridgeFeePayload,
  ): Promise<API.GetBridgeOutNervosBridgeFeeResponse> {
    // return Promise.resolve(Promise.resolve(this.client.request('getBridgeOutNervosBridgeFee', payload)));
    return Promise.reject(new Error('not implementation'));
  }

  async generateBridgeInNervosTransaction<T extends NetworkTypes>(
    payload: API.GenerateBridgeInTransactionPayload,
  ): Promise<API.GenerateTransactionResponse<T>> {
    // eslint-disable-next-line no-console
    console.log(`generateBridgeInNervosTransaction, payload: ${JSON.stringify(payload)}`);

    let tx;
    switch (payload.asset.network) {
      case 'Ethereum': {
        const sudtExtraData = '0x';
        const ethAmount = ethers.utils.parseUnits(payload.asset.amount, 0);
        const recipient = stringToUint8Array(payload.recipient);

        switch (payload.asset.ident) {
          case '0x0000000000000000000000000000000000000000':
            tx = await this.crossChainContract.populateTransaction.lockAT(payload?.recipient, {
              value: ethAmount,
            });
            break;
          default:
            // TODO lock other tokens
            tx = await this.crossChainContract.populateTransaction.lockToken(
              payload.asset.ident,
              ethAmount,
              recipient,
              sudtExtraData,
            );
            break;
        }
        tx.value = ethers.BigNumber.from(tx.value?._hex ?? 0);
        return {
          network: payload.asset.ident,
          rawTransaction: tx,
        };
        break;
      }
      default:
        throw new Error('invalid chain type');
    }
  }

  async generateBridgeOutNervosTransaction<T extends NetworkTypes>(
    payload: API.GenerateBridgeOutNervosTransactionPayload,
  ): Promise<API.GenerateTransactionResponse<T>> {
    // return this.client.request('generateBridgeOutNervosTransaction', payload);
    return Promise.reject(new Error('not implementation'));
  }

  async sendSignedTransaction<T extends NetworkBase>(
    payload: API.SignedTransactionPayload<T>,
  ): Promise<API.TransactionIdent> {
    // return this.client.request('sendSignedTransaction', payload);
    return Promise.reject(new Error('not implementation'));
  }

  async getBridgeTransactionStatus(
    payload: API.GetBridgeTransactionStatusPayload,
  ): Promise<API.GetBridgeTransactionStatusResponse> {
    // return this.client.request('getBridgeTransactionStatus', payload);
    return Promise.reject(new Error('not implementation'));
  }

  async getBridgeTransactionSummaries(
    payload: API.GetBridgeTransactionSummariesPayload,
  ): Promise<API.TransactionSummaryWithStatus[]> {
    // return await this.client.request('getBridgeTransactionSummaries', payload);
    return Promise.resolve([]);
  }

  async getAssetList(name?: string): Promise<RequiredAsset<'info'>[]> {
    let param = { asset: name };
    if (name == undefined) {
      param = { asset: 'all' };
    }
    // return this.client.request('getAssetList', param);
    return Promise.resolve([
      {
        network: 'Ethereum',
        ident: '0x0000000000000000000000000000000000000000',
        info: {
          decimals: 18,
          name: 'AT',
          symbol: 'AT',
          logoURI: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg?v=002',
          shadow: { network: 'Nervos', ident: '0xb3fdbe0ddaf0b8d3e427fd56968a1eaefa7b57acb36cce34bafebeae22e0ebef' },
        },
      },
      // {
      //   network: 'Ethereum',
      //   ident: '0x7Af456bf0065aADAB2E6BEc6DaD3731899550b84',
      //   info: {
      //     decimals: 18,
      //     name: 'DAI',
      //     symbol: 'DAI',
      //     logoURI: 'https://cryptologos.cc/logos/single-collateral-dai-sai-logo.svg?v=002',
      //     shadow: { network: 'Nervos', ident: '0x98e2067365e9a3eaaeb0313c8da717892d6ae635734db43b543d082930c31c6b' },
      //   },
      // },
    ]);
  }

  async getBalance(payload: API.GetBalancePayload): Promise<API.GetBalanceResponse> {
    // return this.client.request('getBalance', payload);
    const balanceFutures: Promise<AssetType>[] = payload.map(async (p) => {
      let balance: string;
      const tokenAddress = p.assetIdent;
      const userAddress = p.userIdent;
      switch (p.network) {
        case 'Axon':
        case 'Ethereum':
          if (tokenAddress === '0x0000000000000000000000000000000000000000') {
            const eth_amount = await this.provider.getBalance(userAddress);
            balance = eth_amount.toString();
          } else {
            const TokenContract = new ethers.Contract(tokenAddress, ERC20.abi, this.provider);
            const erc20_amount = await TokenContract.balanceOf(userAddress);
            balance = erc20_amount.toString();
          }
          break;
        case 'Nervos': {
          /*
          const userScript = parseAddress(value.userIdent);
          const sudtType = {
            code_hash: ForceBridgeCore.config.ckb.deps.sudtType.script.codeHash,
            hash_type: ForceBridgeCore.config.ckb.deps.sudtType.script.hashType,
            args: value.assetIdent,
          };
          const collector = new IndexerCollector(ForceBridgeCore.ckbIndexer);
          const sudt_amount = await collector.getSUDTBalance(sudtType, userScript);
          balance = sudt_amount.toString();
          break;
           */
          balance = '0';
          break;
        }
        default:
          throw new Error('invalid chain type');
      }
      return {
        network: p.network as 'Nervos' | 'Axon',
        ident: p.assetIdent,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        amount: balance!,
      };
    });
    // return Promise.resolve([
    //   {
    //     network: 'AT',
    //     ident: '0x0000000000000000000000000000000000000000',
    //     amount: '4525094745388951945',
    //   },
    // ]);
    return (await Promise.all(balanceFutures)) as unknown as Promise<GetBalanceResponse>;
  }

  async getBridgeConfig(): Promise<API.GetConfigResponse> {
    // return this.client.request('getBridgeConfig');
    return Promise.resolve({
      nervos: {
        network: 'testnet',
        confirmNumber: 15,
        omniLockCodeHash: '0xea5d73e46455979b498e7c6eb4eb88af285ad474c3a7eab98d16e0d9210d56f1',
        omniLockHashType: 'data',
      },
      xchains: { Ethereum: { contractAddress: '0xf67bc4e50d1df92b0e4c61794a4517af6a995cb2', confirmNumber: 12 } },
    });
  }
}

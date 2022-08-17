/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable-next-line no-console */

import CrossChain from '../abi/CrossChain.json';
import ERC20 from '../abi/ERC20.json';
import { ethers } from 'ethers';
import { CkbTxGenerator } from './ckb';
import { API, AssetType, NetworkBase, NetworkTypes, RequiredAsset } from '../types';
import { GetBalanceResponse } from '../types/apiv1';
import { stringToUint8Array } from '../utils/index';
import { parseAddress } from '@ckb-lumos/helpers';
import { Script } from '@ckb-lumos/base';
import { initializeConfig, predefined } from '@ckb-lumos/config-manager';

export class AxonApiHandler implements API.ForceBridgeAPIV1 {
  provider: ethers.providers.JsonRpcProvider;
  crossChainAddress: string;
  crossChainContract: ethers.Contract;
  wCkbAddress: string;
  wCkbContract: ethers.Contract;
  generator: CkbTxGenerator;

  constructor(axonRpcUrl: string) {
    // this.provider = new ethers.providers.JsonRpcProvider(axonRpcUrl);
    this.provider = new ethers.providers.Web3Provider(window.ethereum);
    this.provider.send('eth_requestAccounts', []);
    this.crossChainAddress = '0xf67bc4e50d1df92b0e4c61794a4517af6a995cb2';
    this.crossChainContract = new ethers.Contract(this.crossChainAddress, CrossChain.abi, this.provider.getSigner());
    this.wCkbAddress = '0x4af5ec5e3d29d9ddd7f4bf91a022131c41b72352';
    this.wCkbContract = new ethers.Contract(this.wCkbAddress, ERC20.abi, this.provider.getSigner());
    this.generator = new CkbTxGenerator(process.env.REACT_APP_CKB_RPC_URL, process.env.REACT_APP_CKB_INDEXER_RPC_URL);
    initializeConfig(predefined.AGGRON4);
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
      // const erc20_amount = await TokenContract.getWCKBMin();
      const erc20_amount = await this.crossChainContract.fee(payload.xchainAssetIdent, payload.amount);
      const minimalAmount = erc20_amount.toString();
      return { minimalAmount };
    })();
  }

  getMinimalBridgeWCKBAmount(): Promise<API.GetMinimalBridgeAmountResponse> {
    // return Promise.resolve(this.client.request('getMinimalBridgeAmount', payload));
    return (async () => {
      // const erc20_amount = await TokenContract.getWCKBMin();
      const min_wckb_amount = await this.crossChainContract.getWCKBMin();
      const minimalAmount = min_wckb_amount.toString();
      return { minimalAmount };
    })();
  }

  getTokenAddressWhiteList(): Promise<API.getTokenAddressWhiteListResponse> {
    return (async () => {
      const tokenAddressWhitelist = await this.crossChainContract.whitelist();
      return { tokenAddressWhitelist };
    })();
  }

  getTokenNameAndDecimals(tokenAddress: string): Promise<API.getTokenNameAndDecimalsResponse> {
    return (async () => {
      const tokenContract = new ethers.Contract(tokenAddress, ERC20.abi, this.provider.getSigner());
      const name = await tokenContract.name();
      const decimals = await tokenContract.decimals();
      return { name, decimals };
    })();
  }

  async getBridgeInNervosBridgeFee(
    payload: API.GetBridgeInNervosBridgeFeePayload,
  ): Promise<API.GetBridgeInNervosBridgeFeeResponse> {
    // return Promise.resolve(this.client.request('getBridgeInNervosBridgeFee', payload));
    // eslint-disable-next-line no-console
    console.log(`getBridgeInNervosBridgeFee: ${JSON.stringify(payload)}`);
    const fee_amount = await this.crossChainContract.fee(payload.xchainAssetIdent, payload.amount);
    const fee = fee_amount.toString();
    console.log(`fee = ${fee}`);
    return { fee };
  }

  async getBridgeOutNervosBridgeFee(
    payload: API.GetBridgeOutNervosBridgeFeePayload,
  ): Promise<API.GetBridgeOutNervosBridgeFeeResponse> {
    // return Promise.resolve(Promise.resolve(this.client.request('getBridgeOutNervosBridgeFee', payload)));
    const fee = await this.generator.fetch_crosschain_fee();
    return { fee };
  }

  async generateBridgeInNervosTransaction<T extends NetworkTypes>(
    payload: API.GenerateBridgeInTransactionPayload,
  ): Promise<API.GenerateTransactionResponse<T>> {
    // eslint-disable-next-line no-console
    const nonce = await this.provider.getSigner().getTransactionCount();
    console.log(`generateBridgeInNervosTransaction, payload: ${JSON.stringify(payload)}, nonce: ${nonce}`);

    // check allowance of wCKB
    const allowance = await this.wCkbContract.allowance(payload.sender, this.crossChainAddress);
    if (!allowance.eq(ethers.constants.MaxUint256)) {
      const result = await this.wCkbContract.approve(this.crossChainAddress, ethers.constants.MaxUint256);
      console.log('set allowance of wCKB:', await result.wait());
    }

    let tx;
    switch (payload.asset.network) {
      case 'Ethereum': {
        const transferAmount = ethers.utils.parseUnits(payload.asset.amount, 0);
        const recipient = stringToUint8Array(payload.recipient);

        switch (payload.asset.ident) {
          case '0x0000000000000000000000000000000000000000': {
            tx = await this.crossChainContract.populateTransaction.lockAT(payload?.recipient, {
              value: transferAmount,
            });
            break;
          }
          default: {
            // check allowance of crossing erc20 token
            const tokenContract = new ethers.Contract(payload.asset.ident, ERC20.abi, this.provider.getSigner());
            const allowance = await tokenContract.allowance(payload.sender, this.crossChainAddress);
            if (!allowance.eq(ethers.constants.MaxUint256)) {
              const result = await tokenContract.approve(this.crossChainAddress, ethers.constants.MaxUint256);
              console.log('set allowance of cross token:', await result.wait());
            }
            tx = await this.crossChainContract.populateTransaction.crossTokenToCKB(
              recipient,
              payload.asset.ident,
              transferAmount,
            );
            break;
          }
        }
        tx.value = ethers.BigNumber.from(tx.value?._hex ?? 0);
        return {
          network: payload.asset.ident,
          rawTransaction: tx,
        };
      }
      default:
        throw new Error('invalid chain type');
    }
  }

  async generateBridgeOutNervosTransaction<T extends NetworkTypes>(
    payload: API.GenerateBridgeOutNervosTransactionPayload,
  ): Promise<API.GenerateTransactionResponse<T>> {
    // return this.client.request('generateBridgeOutNervosTransaction', payload);
    const tx = this.generator.generate_crosschain_tx(
      payload.sender,
      payload.recipient,
      BigInt(payload.amount),
      payload.asset,
    );
    return {
      network: payload.network,
      rawTransaction: tx,
    };
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
    if (name === undefined) {
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
          shadow: {
            network: 'Nervos',
            ident: '0xb3fdbe0ddaf0b8d3e427fd56968a1eaefa7b57acb36cce34bafebeae22e0ebef',
          },
        },
      },
      {
        network: 'Ethereum',
        ident: '0x4Af5eC5E3d29d9dDD7f4BF91a022131C41b72352',
        info: {
          decimals: 8,
          name: 'wCKB',
          symbol: 'wCKB',
          logoURI: 'https://cryptologos.cc/logos/nervos-network-ckb-logo.svg?v=023',
          shadow: {
            network: 'Nervos',
            ident: '0x0000000000000000000000000000000000000000000000000000000000000000',
          },
        },
      },
    ]);
  }

  async getBalance(payload: API.GetBalancePayload): Promise<API.GetBalanceResponse> {
    // return this.client.request('getBalance', payload);
    const balanceFutures: Promise<AssetType>[] = payload.map(async (p) => {
      let balance: string;
      const userAddress = p.userIdent;
      switch (p.network) {
        case 'Axon':
        case 'Ethereum': {
          const tokenAddress = p.assetIdent;
          if (tokenAddress === '0x0000000000000000000000000000000000000000') {
            const eth_amount = await this.provider.getBalance(userAddress);
            balance = eth_amount.toString();
          } else {
            const TokenContract = new ethers.Contract(tokenAddress, ERC20.abi, this.provider);
            const erc20_amount = await TokenContract.balanceOf(userAddress);
            balance = erc20_amount.toString();
          }
          break;
        }
        case 'Nervos': {
          const sudtArgs = p.assetIdent;
          const userScript = parseAddress(userAddress);
          if (sudtArgs === '0x0000000000000000000000000000000000000000000000000000000000000000') {
            const ckb_amount = await this.generator.getIndexerCollector().getBalance(userScript);
            balance = ckb_amount.toString();
          } else {
            const sudtType = {
              code_hash: process.env.REACT_SUDT_CODE_HASH || process.env.REACT_APP_PWLOCK_CODE_HASH,
              hash_type: 'type',
              args: p.assetIdent,
            } as Script;
            const sudt_amount = await this.generator.getIndexerCollector().getSUDTBalance(sudtType, userScript);
            balance = sudt_amount.toString();
          }
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
      xchains: {
        Ethereum: {
          contractAddress: '0xf67bc4e50d1df92b0e4c61794a4517af6a995cb2',
          confirmNumber: 12,
        },
      },
    });
  }
}

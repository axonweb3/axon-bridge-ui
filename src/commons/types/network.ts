// network types, all types arr plain JSON object

// types naming conventions:
// XIdent: the ident of the X resource, e.g. type ERC20Ident = { address: '0x...' }
// XInfo: the ident with network e.g. type type ERC20Info = { network: 'Ethereum', address: '0x...' }

import { helpers } from '@ckb-lumos/lumos';
import { ethers } from 'ethers';
import { NetworkKeyNervos } from '../constatns';

// number without decimals, e.g. 0x123aaa(Hex), 12547(Decimal)
// do NOT use such values like, 1.225, 0.22
export type AmountWithoutDecimals = string;

export type NetworkBase = {
  Network: string;
  UserIdent: string;
  DerivedAssetIdent?: string;
  NativeAssetIdent?: string;
  RawTransaction?: unknown;
  // TODO maybe deprecated the SignedTransaction
  SignedTransaction?: unknown;
};

export type FungibleBaseInfo = {
  decimals: number;
  name: string;
  symbol: string;
  logoURI: string;
  shadow: { network: string; ident: string };
};

export type AssetType = {
  network: string;
  ident: string;
  amount?: AmountWithoutDecimals;
  info?: FungibleBaseInfo;
};

export type RequiredAsset<T extends keyof AssetType> = AssetType & Required<Pick<AssetType, T>>;

export type NetworkTypes<T extends NetworkBase = NetworkBase> = Required<T>;

export type NervosNetwork = NetworkTypes<{
  Network: NetworkKeyNervos;
  NativeAssetIdent: string;
  DerivedAssetIdent: string;
  UserIdent: string;
  RawTransaction: helpers.TransactionSkeletonObject;
  SignedTransaction: CKBComponents.RawTransaction;
}>;

export type EthereumNetwork = NetworkTypes<{
  Network: 'Ethereum';
  NativeAssetIdent: '0x0000000000000000000000000000000000000000';
  // address
  DerivedAssetIdent: string;
  // address
  UserIdent: string;
  RawTransaction: ethers.PopulatedTransaction;
  // TODO maybe deprecated the SignedTransaction
  SignedTransaction: string;
}>;

// export type AllNetworks = NervosNetwork | EthereumNetwork;
export type XChainNetwork = EthereumNetwork;

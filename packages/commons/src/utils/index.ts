import fs from 'fs';
import path from 'path';
import { parseAddress, TransactionSkeletonType } from '@ckb-lumos/helpers';

import * as utils from '@nervosnetwork/ckb-sdk-utils';
import { AddressPrefix } from '@nervosnetwork/ckb-sdk-utils';
import { ethers } from 'ethers';
import * as lodash from 'lodash';

export function hasProp<O, K extends string | number | symbol>(obj: O, key: K): obj is Record<K, unknown> & O {
  return obj != null && typeof obj === 'object' && key in obj;
}

interface Prop {
  <O, K extends string>(obj: O, key: K): O extends Record<K, unknown> ? O[K] : unknown;

  <O, K extends string, V>(obj: O, key: K, defaults: V): O extends Record<K, unknown> ? O[K] : V;
}

export const prop: Prop = <O, K extends string, V>(obj: O, key: K, defaults?: V) => {
  if (hasProp(obj, key)) {
    return obj[key] || defaults;
  }
  return defaults;
};

export function propEq<O, K extends string, V>(obj: O, key: K, v: V): obj is Record<K, V> & O {
  return prop(obj, key) === v;
}

export function blake2b(buffer: Uint8Array): Uint8Array {
  return utils.blake2b(32, null, null, utils.PERSONAL).update(buffer).digest('binary') as Uint8Array;
}

export function genRandomHex(size: number): string {
  return '0x' + [...Array(size)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
}

export const bigintToSudtAmount = (n: bigint): string => {
  return `0x${Buffer.from(n.toString(16).padStart(32, '0'), 'hex').reverse().toString('hex')}`;
};

export const toHexString = (bytes: Uint8Array): string =>
  bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');

export function uint8ArrayToString(data: Uint8Array): string {
  let dataString = '';
  for (let i = 0; i < data.length; i++) {
    dataString += String.fromCharCode(data[i]);
  }
  return dataString;
}

export function stringToUint8Array(str: string): Uint8Array {
  const arr: number[] = [];
  for (let i = 0, j = str.length; i < j; ++i) {
    arr.push(str.charCodeAt(i));
  }
  return new Uint8Array(arr);
}

export function isEmptyArray<T>(array: T[]): boolean {
  return !(array && array.length);
}

export function parsePrivateKey(path: string): string {
  if (fs.existsSync(path)) {
    const pk = `${fs.readFileSync(path)}`;
    return lodash.trim(pk);
  } else {
    return path;
  }
}

export function getFromEnv(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (value !== undefined) {
    return value;
  }
  if (defaultValue !== undefined) {
    return defaultValue;
  } else {
    throw new Error(`${key} not provided in ENV`);
  }
}

export function writeJsonToFile(obj: unknown, writePath: string): void {
  const data = JSON.stringify(obj, null, 2);
  const dir = path.dirname(writePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(writePath, data);
}

export function privateKeyToCkbPubkeyHash(privkey: string): string {
  const pubkey = utils.privateKeyToPublicKey(privkey);
  const hash = utils.blake160(pubkey, 'hex');
  return `0x${hash}`;
}

export function privateKeyToEthAddress(privkey: string): string {
  return ethers.utils.computeAddress(privkey);
}

export type ckbAddressPrefix = AddressPrefix | 'mainnet' | 'testnet' | 'ckb' | 'cbt';

export function privateKeyToCkbAddress(privkey: string, prefix: ckbAddressPrefix = AddressPrefix.Testnet): string {
  if (prefix === 'mainnet' || prefix === 'ckb') {
    prefix = AddressPrefix.Mainnet;
  } else if (prefix === 'testnet' || prefix === 'ckt') {
    prefix = AddressPrefix.Testnet;
  } else {
    throw new Error('invalid ckb address prefix');
  }
  return utils.privateKeyToAddress(privkey, { prefix: prefix as AddressPrefix });
}

// since there may be many different formats of ckb address for the same lockscript,
// we have to compare them after parsing to lockscript
// return true if they are the same lockscript
export function compareCkbAddress(address1: string, address2: string): boolean {
  const lockscript1 = parseAddress(address1);
  const lockscript2 = parseAddress(address2);
  return (
    lockscript1.code_hash === lockscript2.code_hash &&
    lockscript1.args === lockscript2.args &&
    lockscript1.hash_type === lockscript2.hash_type
  );
}

export function transactionSkeletonToJSON(txSkelton: TransactionSkeletonType): string {
  const obj = txSkelton.toJS();
  obj.cellProvider = undefined;
  return JSON.stringify(obj, null, 2);
}

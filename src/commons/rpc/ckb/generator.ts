import { Cell, CellDep, Script } from '@ckb-lumos/base';
import { computeScriptHash, toBigUInt128LE } from '@ckb-lumos/base/lib/utils';
import {
  minimalCellCapacity,
  parseAddress,
  TransactionSkeleton,
  TransactionSkeletonObject,
  transactionSkeletonToObject,
} from '@ckb-lumos/helpers';
import { config } from '@ckb-lumos/lumos';
import { CkbTxHelper } from './helper';
import { ScriptType, SearchKey } from './indexer';
import { get_crosschain_fee, get_erc20_address, make_crosschain_transfer } from './molecule';

const TYPE_ID_CODE_HASH = '0x00000000000000000000000000000000000000000000000000545950455f4944';
const SECP256K1 = config.predefined.AGGRON4.SCRIPTS.SECP256K1_BLAKE160;

export class CkbTxGenerator extends CkbTxHelper {
  sudtDep = {
    out_point: {
      tx_hash: process.env.REACT_APP_SUDT_OUTPOINT_TXHASH,
      index: '0x0',
    },
    dep_type: 'code',
  } as CellDep;

  omniLockDep = {
    out_point: {
      tx_hash: process.env.REACT_APP_PWLOCK_OUTPOINT_TXHASH,
      index: '0x0',
    },
    dep_type: 'code',
  } as CellDep;

  acsRequestDep = {
    out_point: {
      tx_hash: process.env.REACT_APP_ACS_REQUEST_OUTPOINT_TXHASH,
      index: '0x0',
    },
    dep_type: 'code',
  } as CellDep;

  acsMeatadataDep = {
    out_point: {
      tx_hash: process.env.REACT_APP_DEPLOY_METADATA_OUTPOINT_TXHASH,
      index: '0x0',
    },
    dep_type: 'code',
  } as CellDep;

  secp256k1Dep = {
    out_point: {
      tx_hash: SECP256K1.TX_HASH,
      index: SECP256K1.INDEX,
    },
    dep_type: SECP256K1.DEP_TYPE,
  };

  constructor(ckb_rpc: string, indexer_rpc: string) {
    super(ckb_rpc, indexer_rpc);
  }

  get_deployed_metadata_type_id(): string {
    const type_script = {
      code_hash: TYPE_ID_CODE_HASH,
      hash_type: 'type',
      args: process.env.REACT_APP_DEPLOY_METADATA_TYPE_ARGS,
    } as Script;
    return computeScriptHash(type_script);
  }

  async fetch_metadata(): Promise<string> {
    const deployed_metadata_typescript = <Script>{
      code_hash: TYPE_ID_CODE_HASH,
      hash_type: 'type',
      args: process.env.REACT_APP_DEPLOY_METADATA_TYPE_ARGS,
    };
    const search_key = <SearchKey>{
      script: deployed_metadata_typescript,
      script_type: ScriptType.type,
    };
    const metadata_cell = await this.indexer.getCells(search_key);
    if (metadata_cell.length == 0) {
      throw new Error('not found metadata');
    }
    return metadata_cell[0].data;
  }

  async fetch_crosschain_fee(sudt_owner_lockhash?: string): Promise<number> {
    const metadata_data = await this.fetch_metadata();
    const fee = get_crosschain_fee(metadata_data, sudt_owner_lockhash);
    if (fee == null) {
      throw new Error('Cannot search crosschain fee');
    }
    return fee;
  }

  async fetch_crosschain_erc20_address(sudt_owner_lockhash: string): Promise<string> {
    const metadata_data = await this.fetch_metadata();
    const address = get_erc20_address(metadata_data, sudt_owner_lockhash);
    if (address == null) {
      throw new Error('Cannot search erc20 address');
    }
    return address;
  }

  async generate_crosschain_tx(
    sender: string,
    recipient: string,
    amount: bigint,
    sudt_owner_lockhash?: string,
  ): Promise<TransactionSkeletonObject> {
    // make crosschain lock output cell
    const crosschan_lock_cell = <Cell>{
      cell_output: {
        capacity: '0x0',
        lock: {
          code_hash: process.env.REACT_APP_ACS_LOCK_TYPE_ID,
          hash_type: 'type',
          args: this.get_deployed_metadata_type_id(),
        },
      },
      data: '0x',
    };
    let transfer_args = '';
    const cross_fee = await this.fetch_crosschain_fee(sudt_owner_lockhash);
    console.log('cross_fee = ', cross_fee);
    if (sudt_owner_lockhash && sudt_owner_lockhash.startsWith('0x')) {
      crosschan_lock_cell.cell_output.type = {
        code_hash: process.env.REACT_APP_SUDT_CODE_HASH,
        hash_type: 'type',
        args: sudt_owner_lockhash,
      } as Script;
      crosschan_lock_cell.data = toBigUInt128LE(amount);
      const capacity = minimalCellCapacity(crosschan_lock_cell);
      crosschan_lock_cell.cell_output.capacity = `0x${capacity.toString(16)}`;
      const cross_sudt = (amount * BigInt(1000 - cross_fee)) / BigInt(1000);
      transfer_args = make_crosschain_transfer(recipient, capacity, {
        amount: cross_sudt,
        erc20_address: await this.fetch_crosschain_erc20_address(sudt_owner_lockhash),
      });
    } else {
      const capacity = minimalCellCapacity(crosschan_lock_cell);
      if (capacity > amount) {
        throw new Error('Insufficient minimal cell capacity');
      }
      crosschan_lock_cell.cell_output.capacity = `0x${amount.toString(16)}`;
      const cross_capacity = (amount * BigInt(1000 - cross_fee)) / BigInt(1000);
      transfer_args = make_crosschain_transfer(recipient, cross_capacity, {
        amount: BigInt(0),
        erc20_address: '0x' + '11'.repeat(20),
      });
    }

    // make request output cell
    const crosschain_request_cell = {
      cell_output: {
        capacity: '0x0',
        lock: parseAddress(sender),
        type: {
          code_hash: process.env.REACT_APP_ACS_REQUEST_TYPE_ID,
          hash_type: 'type',
          args: transfer_args,
        },
      },
      data: '0x',
    } as Cell;
    const capacity = minimalCellCapacity(crosschain_request_cell);
    crosschain_request_cell.cell_output.capacity = `0x${capacity.toString(16)}`;

    // make tx
    let txSkeleton = TransactionSkeleton({ cellProvider: this.indexer });
    txSkeleton = txSkeleton.update('cellDeps', (cellDeps) => {
      return cellDeps.concat([
        this.sudtDep,
        this.acsMeatadataDep,
        this.acsRequestDep,
        this.omniLockDep,
        this.secp256k1Dep,
      ]);
    });
    txSkeleton = txSkeleton.update('outputs', (outputs) => {
      return outputs.concat(crosschan_lock_cell, crosschain_request_cell);
    });
    txSkeleton = await this.completeTx(txSkeleton, sender);

    // to object
    return transactionSkeletonToObject(txSkeleton);
  }
}

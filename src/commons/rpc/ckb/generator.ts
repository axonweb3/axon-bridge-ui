import { Cell, CellDep, Script } from '@ckb-lumos/base';
import { computeScriptHash, toBigUInt128LE } from '@ckb-lumos/base/lib/utils';
import {
  minimalCellCapacity,
  parseAddress,
  TransactionSkeleton,
  TransactionSkeletonObject,
  transactionSkeletonToObject,
} from '@ckb-lumos/helpers';
import { common } from '@ckb-lumos/common-scripts';
import { CkbTxHelper } from './helper';
import { ScriptType, SearchKey } from './indexer';
import { get_crosschain_fee, get_erc20_address, make_crosschain_transfer } from './molecule';

const TYPE_ID_CODE_HASH = '0x00000000000000000000000000000000000000000000000000545950455f4944';

export class CkbTxGenerator extends CkbTxHelper {
  sudtDep = {
    out_point: {
      tx_hash: process.env.REACT_APP_SUDT_OUTPOINT_TXHASH,
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
    sudt_owner_lockhash: string,
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
    if (sudt_owner_lockhash.startsWith('0x')) {
      crosschan_lock_cell.cell_output.type = {
        code_hash: process.env.REACT_APP_SUDT_CODE_HASH,
        hash_type: 'type',
        args: sudt_owner_lockhash,
      } as Script;
      crosschan_lock_cell.data = toBigUInt128LE(amount);
      const capacity = minimalCellCapacity(crosschan_lock_cell);
      crosschan_lock_cell.cell_output.capacity = `0x${capacity.toString(16)}`;
      transfer_args = make_crosschain_transfer(recipient, capacity, {
        amount,
        erc20_address: await this.fetch_crosschain_erc20_address(sudt_owner_lockhash),
      });
    } else {
      const capacity = minimalCellCapacity(crosschan_lock_cell);
      if (capacity > amount) {
        throw new Error('Insufficient minimal cell capacity');
      }
      crosschan_lock_cell.cell_output.capacity = `0x${amount.toString(16)}`;
      transfer_args = make_crosschain_transfer(recipient, capacity, {
        amount,
        erc20_address: '0x' + '00'.repeat(20),
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
      return cellDeps.push(this.sudtDep).push(this.acsMeatadataDep).push(this.acsRequestDep);
    });
    txSkeleton = txSkeleton.update('outputs', (outputs) => {
      return outputs.push(crosschan_lock_cell).push(crosschain_request_cell);
    });
    txSkeleton = await this.completeTx(txSkeleton, sender);
    txSkeleton = common.prepareSigningEntries(txSkeleton);

    // to object
    return transactionSkeletonToObject(txSkeleton);
  }
}

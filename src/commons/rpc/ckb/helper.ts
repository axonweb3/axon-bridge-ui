import { Cell, Script, TransactionWithStatus, utils, core } from '@ckb-lumos/base';
import { Reader, normalizers } from 'ckb-js-toolkit';
import { BI, helpers } from '@ckb-lumos/lumos';
import { common } from '@ckb-lumos/common-scripts';
import { minimalCellCapacity, parseAddress, TransactionSkeletonType } from '@ckb-lumos/helpers';
import { RPC } from '@ckb-lumos/lumos';
import TransactionManager from '@ckb-lumos/transaction-manager';
import { IndexerCollector } from './collector';
import { SerializeRcLockWitnessLock } from '@ckitjs/rc-lock';
import { CkbIndexer, ScriptType, Terminator, asyncSleep } from './indexer';

// you have to initialize lumos config before use this generator
export class CkbTxHelper {
  ckbRpcUrl: string;
  ckbIndexerUrl: string;
  collector: IndexerCollector;
  indexer: CkbIndexer;
  ckb: RPC;
  transactionManager: TransactionManager;

  constructor(ckbRpcUrl: string, ckbIndexerUrl: string) {
    this.ckbRpcUrl = ckbRpcUrl;
    this.ckbIndexerUrl = ckbIndexerUrl;
    this.indexer = new CkbIndexer(ckbRpcUrl, ckbIndexerUrl);
    this.ckb = new RPC(ckbRpcUrl);
    this.collector = new IndexerCollector(this.indexer);
    // logger.debug('lumosConfig', this.lumosConfig);
    this.transactionManager = new TransactionManager(this.indexer);
  }

  getIndexerCollector(): IndexerCollector {
    return this.collector;
  }

  async getFromCells(lockscript: Script): Promise<Cell[]> {
    const searchKey = {
      script: lockscript,
      script_type: ScriptType.lock,
    };
    const terminator: Terminator = (index, c) => {
      const cell = c;
      if (cell.data.length / 2 - 1 > 0 || cell.cell_output.type) {
        return { stop: false, push: false };
      } else {
        return { stop: false, push: true };
      }
    };
    const fromCells = await this.indexer.getCells(searchKey, terminator);
    // logger.debug(`fromCells: ${JSON.stringify(fromCells)}`);
    return fromCells;
  }

  async calculateCapacityDiff(txSkeleton: TransactionSkeletonType): Promise<bigint> {
    const inputCapacity = txSkeleton
      .get('inputs')
      .map((c) => BigInt(c.cell_output.capacity))
      .reduce((a, b) => a + b, BI.from(0).toBigInt());
    const outputCapacity = txSkeleton
      .get('outputs')
      .map((c) => BigInt(c.cell_output.capacity))
      .reduce((a, b) => a + b, BI.from(0).toBigInt());
    return inputCapacity - outputCapacity;
  }

  // add capacity input, change output, pay fee
  async completeTx(
    txSkeleton: TransactionSkeletonType,
    fromAddress: string,
    feeRate = BI.from(1200).toBigInt(),
  ): Promise<TransactionSkeletonType> {
    // freeze outputs
    txSkeleton = txSkeleton.update('fixedEntries', (fixedEntries) => {
      return fixedEntries.push({
        field: 'outputs',
        index: txSkeleton.get('outputs').size - 1,
      });
    });
    // add change output
    const fromLockscript = parseAddress(fromAddress);
    const changeOutput: Cell = {
      cell_output: {
        capacity: '0x0',
        lock: fromLockscript,
      },
      data: '0x',
    };
    const minimalChangeCellCapacity = minimalCellCapacity(changeOutput);
    changeOutput.cell_output.capacity = `0x${minimalChangeCellCapacity.toString(16)}`;
    txSkeleton = txSkeleton.update('outputs', (outputs) => {
      return outputs.push(changeOutput);
    });
    const capacityDiff = await this.calculateCapacityDiff(txSkeleton);
    // logger.debug('injectCapacity params', {
    //   fromAddress,
    //   capacityDiff,
    // });
    if (capacityDiff < 0) {
      const fromCells = await this.collector.getCellsByLockscriptAndCapacity(fromLockscript, -capacityDiff);
      // logger.debug(`fromCells: ${JSON.stringify(fromCells, null, 2)}`);
      txSkeleton = txSkeleton.update('inputs', (inputs) => {
        return inputs.concat(fromCells);
      });
      const diff = await this.calculateCapacityDiff(txSkeleton);
      if (diff < 0) {
        const humanReadableCapacityDiff = -diff / BigInt(100000000);
        throw new Error(`fromAddress capacity insufficient, need ${humanReadableCapacityDiff.toString()} CKB more`);
      }
      txSkeleton = txSkeleton.update('outputs', (outputs) => {
        changeOutput.cell_output.capacity = `0x${(minimalChangeCellCapacity + diff).toString(16)}`;
        return outputs.set(outputs.size - 1, changeOutput);
      });
    } else {
      txSkeleton.update('outputs', (outputs) => {
        const before = BigInt(changeOutput.cell_output.capacity);
        const after = before + capacityDiff;
        changeOutput.cell_output.capacity = `0x${after.toString(16)}`;
        return outputs.set(outputs.size - 1, changeOutput);
      });
    }
    // logger.debug(`capacity diff: ${await this.calculateCapacityDiff(txSkeleton)}`);
    txSkeleton = await common.payFeeByFeeRate(txSkeleton, [fromAddress], feeRate);
    txSkeleton = this.signTransaction(txSkeleton);
    // logger.debug(`final fee: ${await this.calculateCapacityDiff(txSkeleton)}`);
    await asyncSleep(1000);
    return txSkeleton;
  }

  signTransaction(txSkeleton: TransactionSkeletonType): TransactionSkeletonType {
    const messageToSign = (() => {
      const hasher = new utils.CKBHasher();
      const rawTxHash = utils.ckbHash(
        core.SerializeRawTransaction(
          normalizers.NormalizeRawTransaction(helpers.createTransactionFromSkeleton(txSkeleton)),
        ),
      );
      // serialized unsigned witness
      const serializedWitness = core.SerializeWitnessArgs({
        lock: new Reader(
          '0x' +
            '00'.repeat(
              SerializeRcLockWitnessLock({
                signature: new Reader('0x' + '00'.repeat(65)),
              }).byteLength,
            ),
        ),
      });
      hasher.update(rawTxHash);
      const lengthBuffer = new ArrayBuffer(8);
      const view = new DataView(lengthBuffer);
      view.setBigUint64(0, BigInt(new Reader(serializedWitness).length()), true);

      hasher.update(lengthBuffer);
      hasher.update(serializedWitness);
      return hasher.digestHex();
    })();

    return txSkeleton.update('signingEntries', (signingEntries) => {
      return signingEntries.push({
        type: 'witness_args_lock',
        index: 0,
        message: messageToSign,
      });
    });
  }

  async waitUntilCommitted(txHash: string, timeout = 120): Promise<TransactionWithStatus | null> {
    let waitTime = 0;
    for (;;) {
      const txStatus = await this.ckb.get_transaction(txHash);
      if (txStatus !== null) {
        // logger.debug(`tx ${txHash}, status: ${txStatus.tx_status.status}, index: ${waitTime}`);
        if (txStatus.tx_status.status === 'committed') {
          return txStatus;
        }
      } else {
        throw new Error(`wait for ${txHash} until committed failed with null txStatus`);
      }
      waitTime += 1;
      if (waitTime > timeout) {
        // logger.warn('waitUntilCommitted timeout', { txHash, timeout, txStatus });
        throw new Error(`wait for ${txHash} until committed timeout after ${timeout} seconds`);
      }
      await asyncSleep(1000);
    }
  }
}

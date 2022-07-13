import {
  Cell,
  Hash,
  helpers,
  HexNumber,
  HexString,
  Script,
  toolkit,
  utils,
  BI,
  core,
  Transaction,
} from "@ckb-lumos/lumos";
import * as secp256k1 from "secp256k1";
import { getCellDep } from "./constants/configUtils";
import AxonBridgeProvider from "./axonBridgeProvider";
import {BigNumber, ethers} from "ethers";
import {
  GetL1CkbBalancePayload,
  GetSudtBalances,
  GetSudtBalancesResult,
  AxonBridgeBase, GetATBalancePayload,
} from "./axonBridgeType";
import CrossChain  from "../light-godwoken/constants/CrossChain.json"
import { debug } from "./debug";
import {AxonBridgeConfig, GodwokenVersion, axonBridgeConfig} from "./constants/configTypes";
import {
  NotEnoughCapacityError,
} from "./constants/error";
import { CellDep, CellWithStatus, DepType, OutPoint, Output, TransactionWithStatus } from "@ckb-lumos/base";
import { isSpecialWallet } from "./utils";

export default class DefaultAxonBridge implements AxonBridgeBase {
  provider: AxonBridgeProvider;
  constructor(provider: AxonBridgeProvider) {
    this.provider = provider;
    console.log('axon bridge constructor');
  }

  // in milliseconds
  getBlockProduceTime(): number {
    return this.provider.getConfig().axonConfig.BLOCK_PRODUCE_TIME * 1000;
  }

  getWithdrawalWaitBlock(): number {
    return this.provider.getConfig().axonConfig.FINALITY_BLOCKS;
  }

  getCkbBlockProduceTime(): number {
    return 7460;
  }

  async getCkbCurrentBlockNumber(): Promise<BI> {
    return BI.from((await this.provider.ckbIndexer.tip()).block_number);
  }

  async getPendingTransaction(txHash: Hash): Promise<TransactionWithStatus | null> {
    let tx: TransactionWithStatus | null = null;
    // retry 10 times, and sleep 1s
    for (let i = 0; i < 10; i++) {
      tx = await this.provider.ckbRpc.get_transaction(txHash);
      if (tx != null) {
        return tx;
      }
      await this.provider.asyncSleep(1000);
    }
    return null;
  }

  getConfig(): AxonBridgeConfig {
    return this.provider.getConfig();
  }

  async payTxFee(txSkeleton: helpers.TransactionSkeletonType): Promise<helpers.TransactionSkeletonType> {
    let signedTx = await this.provider.signL1TxSkeleton(txSkeleton, true);
    const txFee = await this.calculateTxFee(signedTx);
    txSkeleton = txSkeleton.update("outputs", (outputs) => {
      const exchagneOutput: Cell = outputs.get(outputs.size - 1)!;
      exchagneOutput.cell_output.capacity = BI.from(exchagneOutput.cell_output.capacity).sub(txFee).toHexString();
      return outputs;
    });
    return txSkeleton;
  }


  // subscribPendingWithdrawalTransactions(txHashList: Hash[]): WithdrawalEventEmitter {
  //   const eventEmitter = new EventEmitter();
  //   for (let index = 0; index < txHashList.length; index++) {
  //     const txHash = txHashList[index];
  //     this.waitForWithdrawalToComplete(txHash, eventEmitter);
  //   }
  //   return eventEmitter;
  // }

  async calculateTxFee(tx: Transaction): Promise<BI> {
    const feeRate = await this.provider.getMinFeeRate();
    const size = this.getTransactionSizeByTx(tx);
    const fee = this.calculateFeeCompatible(size, feeRate);
    debug(`tx size: ${size}, fee: ${fee}`);
    return fee;
  }

  calculateFeeCompatible(size: number, feeRate: BI): BI {
    const ratio = BI.from(1000);
    const base = BI.from(size).mul(feeRate);
    const fee = base.div(ratio);
    if (fee.mul(ratio).lt(base)) {
      return fee.add(1);
    }
    return BI.from(fee);
  }

  getTransactionSizeByTx(tx: Transaction): number {
    const serializedTx = core.SerializeTransaction(toolkit.normalizers.NormalizeTransaction(tx));
    // 4 is serialized offset bytesize
    const size = serializedTx.byteLength + 4;
    return size;
  }


  async signMessageMetamaskPersonalSign(message: Hash): Promise<HexString> {
    let signedMessage = await this.provider.ethereum.request({
      method: "personal_sign",
      params: isSpecialWallet() ? [message] : [this.provider.axonAddress, message],
    });
    let v = Number.parseInt(signedMessage.slice(-2), 16);
    if (v >= 27) v -= 27;
    signedMessage = "0x" + signedMessage.slice(2, -2) + v.toString(16).padStart(2, "0");
    return signedMessage;
  }

  async signMessageMetamaskEthSign(message: Hash): Promise<HexString> {
    let signedMessage = await this.provider.ethereum.request({
      method: "eth_sign",
      params: [this.provider.axonAddress, message],
    });
    let v = Number.parseInt(signedMessage.slice(-2), 16);
    if (v >= 27) v -= 27;
    signedMessage = "0x" + signedMessage.slice(2, -2) + v.toString(16).padStart(2, "0");
    return signedMessage;
  }

  signMessage(message: Hash, privateKey: HexString): HexString {
    const signObject = secp256k1.ecdsaSign(
      new Uint8Array(new toolkit.Reader(message).toArrayBuffer()),
      new Uint8Array(new toolkit.Reader(privateKey).toArrayBuffer()),
    );
    const signatureBuffer = new ArrayBuffer(65);
    const signatureArray = new Uint8Array(signatureBuffer);
    signatureArray.set(signObject.signature, 0);
    let v = signObject.recid;
    if (v >= 27) {
      v -= 27;
    }
    signatureArray.set([v], 64);

    const signature = new toolkit.Reader(signatureBuffer).serializeJson();
    return signature;
  }

  generateWithdrawalMessageToSign(serializedRawWithdrawalRequest: HexString, rollupTypeHash: Hash): Hash {
    const data = new toolkit.Reader(rollupTypeHash + serializedRawWithdrawalRequest.slice(2)).toArrayBuffer();
    const message = utils.ckbHash(data).serializeJson();
    return message;
  }

  minimalWithdrawalCapacity(isSudt: boolean): HexNumber {
    // fixed size, the specific value is not important.
    const dummyHash: Hash = "0x" + "00".repeat(32);
    const dummyHexNumber: HexNumber = "0x0";
    const dummyRollupTypeHash: Hash = dummyHash;
    // const dummyWithdrawalLockArgs: WithdrawalLockArgs = {//192
    //   account_script_hash: dummyHash,//32
    //   withdrawal_block_hash: dummyHash,//32
    //   withdrawal_block_number: dummyHexNumber,//8
    //   sudt_script_hash: dummyHash,//32
    //   sell_amount: dummyHexNumber,//16
    //   sell_capacity: dummyHexNumber,//8
    //   owner_lock_hash: dummyHash,//32
    //   payment_lock_hash: dummyHash,//32
    // };
    // const serialized: HexString = new toolkit.Reader(
    //   SerializeWithdrawalLockArgs(NormalizeWithdrawalLockArgs(dummyWithdrawalLockArgs)),
    // ).serializeJson();
    const dummyWithdrawalLockArgsByteLength = 192;
    // debug("serialized", serialized, serialized.length);
    const args = dummyRollupTypeHash + "00".repeat(dummyWithdrawalLockArgsByteLength);
    const lock: Script = {
      code_hash: dummyHash,
      hash_type: "data",
      args,
    };
    let type: Script | undefined = undefined;
    let data = "0x";
    if (isSudt) {
      type = {
        code_hash: dummyHash,
        hash_type: "data",
        args: dummyHash,
      };
      data = "0x" + "00".repeat(16);
    }
    const cell: Cell = {
      cell_output: {
        lock,
        type,
        capacity: dummyHexNumber,
      },
      data,
    };
    const capacity = helpers.minimalCellCapacity(cell);
    return "0x" + capacity.toString(16);
  }

  async getCkbBalance(payload?: GetL1CkbBalancePayload): Promise<HexNumber> {
    const collector = this.provider.ckbIndexer.collector({ lock: helpers.parseAddress(this.provider.ckbAddress) });
    let collectedSum = BI.from(0);
    for await (const cell of collector.collect()) {
      if (!cell.cell_output.type && (!cell.data || cell.data === "0x" || cell.data === "0x0")) {
        collectedSum = collectedSum.add(cell.cell_output.capacity);
      }
    }
    return "0x" + collectedSum.toString(16);
  }

  async getATBalance(payload?: GetATBalancePayload): Promise<HexNumber> {
    const balance = await this.provider.ethProvider.getBalance(payload?.axonAddress!);
    console.log(balance);
    return balance.toHexString();
  }

  async getAxonFee(): Promise<HexNumber> {
    const crossChainContract = new ethers.Contract(this.provider.getConfig().axonConfig.CROSS_CHAIN_ADDRESS, CrossChain.abi, this.provider.ethProvider);
    console.log(crossChainContract);
    const fee = (await crossChainContract.fee(this.provider.axonAddress)).toString();
    console.log(fee);
    return BigNumber.from(fee).toHexString();
  }

  async getSudtBalances(payload: GetSudtBalances): Promise<GetSudtBalancesResult> {
    const result: GetSudtBalancesResult = { balances: new Array(payload.types.length).fill("0x0") };
    const sudtTypeScript = payload.types[0]; // any sudt type script
    const collector = this.provider.ckbIndexer.collector({
      lock: helpers.parseAddress(this.provider.ckbAddress),
      type: {
        ...sudtTypeScript,
        args: "0x",
      },
    });

    // type hash list of all sudt that user want to query
    const typeScriptHashList = payload.types.map((typeScript) => utils.computeScriptHash(typeScript));

    for await (const cell of collector.collect()) {
      const currentCellTypeHash = utils.computeScriptHash(cell.cell_output.type!);
      const currentSudtIndex = typeScriptHashList.indexOf(currentCellTypeHash);
      if (currentSudtIndex !== -1) {
        let currentSudtSum = result.balances[currentSudtIndex];
        result.balances[currentSudtIndex] = BI.from(currentSudtSum)
          .add(utils.readBigUInt128LECompatible(cell.data))
          .toHexString();
      }
    }

    return result;
  }
}

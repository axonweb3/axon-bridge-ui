import { BI, HexString } from "@ckb-lumos/lumos";

export class axonBridgeError<T> extends Error {
  readonly metadata: T;
  constructor(metadata: T, message: string) {
    super(message);
    this.metadata = metadata;
  }
}

export class EthereumNotFoundError extends axonBridgeError<string> {}
export class axonBridgeConfigNotValidError extends axonBridgeError<string> {}
export class axonBridgeNotFoundError extends axonBridgeError<string> {}
export class NotEnoughCapacityError extends axonBridgeError<{ expected: BI; actual: BI }> {}
export class NotEnoughSudtError extends axonBridgeError<{ expected: BI; actual: BI }> {}

export class Layer1RpcError extends axonBridgeError<string> {}
export class Layer2RpcError extends axonBridgeError<string> {}

export class V1WithdrawTokenNotEnoughError extends axonBridgeError<string> {}
export class V0WithdrawTokenNotEnoughError extends axonBridgeError<string> {}

export class EthAddressFormatError extends axonBridgeError<{ address: string }> {}
export class Layer2AccountIdNotFoundError extends axonBridgeError<string> {}
export class ERC20TokenNotFoundError extends axonBridgeError<{ sudtScriptHash: HexString }> {}
export class TransactionSignError extends axonBridgeError<string> {}
export class EnvNotFoundError extends axonBridgeError<string> {}
export class SudtNotFoundError extends axonBridgeError<string> {}
export class Erc20NotFoundError extends axonBridgeError<string> {}

export class DepositTxNotFoundError extends axonBridgeError<string> {}
export class DepositCellNotFoundError extends axonBridgeError<string> {}
export class DepositTimeoutError extends axonBridgeError<string> {}
export class DepositRejectedError extends axonBridgeError<string> {}
export class DepositCanceledError extends axonBridgeError<string> {}
export class WithdrawalTimeoutError extends axonBridgeError<string> {}

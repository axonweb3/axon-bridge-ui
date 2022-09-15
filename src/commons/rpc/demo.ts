/* eslint-disable no-console */
import { AxonApiHandler } from './axon-client';
import { ethers } from 'ethers';
import CKB from '@nervosnetwork/ckb-sdk-core';

const client = new AxonApiHandler();

const ETH_NODE_URL = 'http://127.0.0.1:8545';
const ETH_WALLET_PRIV = '0xc4ad657963930fbff2e9de3404b30a4e21432c89952ed430b56bf802945ed37a';

const CKB_NODE_URL = 'http://47.111.84.118:81/';
const CKB_PRI_KEY = '0xf2462a5b1eb08885ce66c41dfcd76d0fb339ee7c92f8143992e0b88d5345cec6';

async function mint() {
  const mintPayload = {
    sender: '0x0',
    recipient: 'ckt1qyqyph8v9mclls35p6snlaxajeca97tc062sa5gahk',
    asset: {
      network: 'Ethereum',
      ident: '0x0000000000000000000000000000000000000000',
      amount: '1',
    },
  };
  const mintTx = await client.generateBridgeInNervosTransaction(mintPayload);

  // metamask will provide nonce, gasLimit and gasPrice.
  const provider = new ethers.providers.JsonRpcProvider(ETH_NODE_URL);
  const wallet = new ethers.Wallet(ETH_WALLET_PRIV, provider);

  const unsignedTx = <ethers.PopulatedTransaction>mintTx.rawTransaction;
  unsignedTx.nonce = await wallet.getTransactionCount();
  unsignedTx.gasLimit = ethers.BigNumber.from(1000000);
  unsignedTx.gasPrice = ethers.BigNumber.from(0);

  // use metamask to sign and send tx.
  const signedTx = await wallet.signTransaction(unsignedTx);
  const mintTxHash = (await provider.sendTransaction(signedTx)).hash;
  console.log('mint tx hash', mintTxHash);
  return mintTxHash;
}

async function burn() {
  const burnPayload = {
    network: 'Nervos',
    sender: 'ckt1qyqy76t2hhemukpjsa6aue37q7fyzgkneuhswnd2pa',
    recipient: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    asset: '',
    amount: '1',
  };

  const burnTx = await client.generateBridgeOutNervosTransaction(burnPayload);
  console.log('tx = ', JSON.stringify(burnTx.rawTransaction));

  const ckb = new CKB(CKB_NODE_URL);
  const signedTx = ckb.signTransaction(CKB_PRI_KEY)(<CKBComponents.RawTransactionToSign>burnTx.rawTransaction);
  const burnTxHash = await ckb.rpc.sendTransaction(signedTx);
  console.log('burn tx hash', burnTxHash);
  return burnTxHash;
}

async function getTransaction() {
  const getTxPayload = {
    network: 'Ethereum',
    xchainAssetIdent: '0x0000000000000000000000000000000000000000',
    user: {
      network: 'Nervos',
      ident: 'ckt1q3vvtay34wndv9nckl8hah6fzzcltcqwcrx79apwp2a5lkd07fdx87332akjsjjw4j5ez3rsh0gt6gp2skq86ga0nqt',
    },
  };

  const txs = await client.getBridgeTransactionSummaries(getTxPayload);
  console.log('txs', JSON.stringify(txs));
  return txs;
}

async function checkTransaction(txId: string) {
  let find = false;
  for (let i = 0; i < 100; i++) {
    await asyncSleep(3000);
    const txs = await getTransaction();
    for (const tx of txs) {
      if (tx.status == 'Successful' && tx.txSummary.fromTransaction.txId == txId) {
        console.log(tx);
        find = true;
        break;
      }
    }
    if (find) {
      break;
    }
  }
  if (!find) {
    throw new Error(`rpc test failed, can not find record ${txId}`);
  }
}

function asyncSleep(ms = 0) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  // const mintTxId = await mint();
  // await checkTransaction(mintTxId);

  const burnTxId = await burn();
  console.log('tx = ', burnTxId);
  // await checkTransaction(burnTxId);
}

main();

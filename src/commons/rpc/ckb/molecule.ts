import { toJSBI, BI } from '@ckb-lumos/bi';
import { molecule, number } from '@ckb-lumos/codec';

const MOL_ADDRESS = molecule.array(number.Uint8, 20);
const MOL_HASH = molecule.array(number.Uint8, 32);

const MOL_TRANSFER = molecule.table(
  {
    axon_address: MOL_ADDRESS,
    ckb_amount: number.Uint64,
    sUDT_amount: number.Uint128,
    ERC20_address: MOL_ADDRESS,
  },
  ['axon_address', 'ckb_amount', 'sUDT_amount', 'ERC20_address'],
);

const MOL_TOKEN = molecule.table(
  {
    ERC20_address: MOL_ADDRESS,
    sUDT_typehash: MOL_HASH,
    fee_rate: number.Uint32,
  },
  ['ERC20_address', 'sUDT_typehash', 'fee_rate'],
);

const MOL_TOKENCONFIG = molecule.vector(MOL_TOKEN);

const MOL_METADATA = molecule.table(
  {
    chain_id: number.Uint16,
    token_config: MOL_TOKENCONFIG,
    ckb_fee_rate: number.Uint32,
    stake_typehash: MOL_HASH,
  },
  ['chain_id', 'token_config', 'ckb_fee_rate', 'stake_typehash'],
);

function hexify(hash_or_address: number[] | Uint8Array): string {
  let hex_string = '0x';
  hash_or_address.forEach((byte) => (hex_string += byte.toString(16)));
  return hex_string;
}

function flatten(hex_string: string): number[] {
  if (hex_string.startsWith('0x')) {
    hex_string = hex_string.substring('0x'.length);
  }
  const array = [];
  while (hex_string.length > 0) {
    const value = hex_string.substring(0, 2);
    array.push(parseInt(value, 16));
    hex_string = hex_string.substring(2);
  }
  return array;
}

export function get_crosschain_fee(buffer: string, owner_lockhash?: string): number | null {
  const metadata = MOL_METADATA.unpack(buffer);
  if (owner_lockhash) {
    let fee = null;
    metadata.token_config.forEach((token) => {
      if (hexify(token.sUDT_typehash) == owner_lockhash) {
        fee = token.fee_rate;
      }
    });
    return fee;
  } else {
    return metadata.ckb_fee_rate;
  }
}

export function get_erc20_address(buffer: string, owner_lockhash: string): string | null {
  const metadata = MOL_METADATA.unpack(buffer);
  let address = null;
  metadata.token_config.forEach((token) => {
    if (hexify(token.sUDT_typehash) == owner_lockhash) {
      address = hexify(token.ERC20_address);
    }
  });
  return address;
}

export function make_crosschain_transfer(
  recipient: string,
  ckb_amount: bigint,
  sudt?: { amount: bigint; erc20_address: string },
): string {
  const transfer = MOL_TRANSFER.pack({
    axon_address: flatten(recipient),
    ckb_amount: new BI(toJSBI(ckb_amount)),
    sUDT_amount: new BI(toJSBI(sudt ? sudt.amount : 0)),
    ERC20_address: sudt ? flatten(sudt.erc20_address) : Array<number>(20),
  });
  return hexify(transfer);
}

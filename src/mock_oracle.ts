import * as token from '@solana/spl-token';
import { PublicKey, Connection, Transaction, Keypair, LAMPORTS_PER_SOL, SystemProgram, TransactionInstruction } from "@solana/web3.js";

const BufferLayout = require('buffer-layout');

import path from "path";
import os from "os";
import fs from "fs";
import BN from "bn.js";
import { CreateMetadataV2, DataV2 } from "@renec-foundation/mpl-token-metadata";
import { getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import { delay } from './utils';


export class Layout {
  /**
   * Layout for a public key
   */
  static publicKey = (property = "publicKey"): unknown => {
    const publicKeyLayout = BufferLayout.blob(32, property)

    const _decode = publicKeyLayout.decode.bind(publicKeyLayout)
    const _encode = publicKeyLayout.encode.bind(publicKeyLayout)

    publicKeyLayout.decode = (buffer: Buffer, offset: number) => {
      const data = _decode(buffer, offset)
      return new PublicKey(data)
    }

    publicKeyLayout.encode = (key: PublicKey, buffer: Buffer, offset: number) => _encode(key.toBuffer(), buffer, offset)

    return publicKeyLayout
  }

  /**
   * Layout for a 64bit unsigned value
   */
  static uint64 = (property = "uint64"): unknown => {
    const layout = BufferLayout.blob(8, property)

    const _decode = layout.decode.bind(layout)
    const _encode = layout.encode.bind(layout)

    layout.decode = (buffer: Buffer, offset: number) => {
      const data = _decode(buffer, offset)
      return new BN(
        [...data]
          .reverse()
          .map((i) => `00${i.toString(16)}`.slice(-2))
          .join(""),
        16,
      )
    }

    layout.encode = (num: BN, buffer: Buffer, offset: number) => {
      const a = num.toArray().reverse()
      let b = Buffer.from(a)
      if (b.length !== 8) {
        const zeroPad = Buffer.alloc(8)
        b.copy(zeroPad)
        b = zeroPad
      }
      return _encode(b, buffer, offset)
    }

    return layout
  }


  static uint128 = (property = "uint128"): unknown => {
    const layout = BufferLayout.blob(16, property)

    const _decode = layout.decode.bind(layout)
    const _encode = layout.encode.bind(layout)

    layout.decode = (buffer: Buffer, offset: number) => {
      const data = _decode(buffer, offset)
      return new BN(
        [...data]
          .reverse()
          .map((i) => `00${i.toString(16)}`.slice(-2))
          .join(""),
        16,
      )
    }

    layout.encode = (num: BN, buffer: Buffer, offset: number) => {
      const a = num.toArray().reverse()
      let b = Buffer.from(a)
      if (b.length !== 16) {
        const zeroPad = Buffer.alloc(16)
        b.copy(zeroPad)
        b = zeroPad
      }

      return _encode(b, buffer, offset)
    }

    return layout
  }

  /**
   * Layout for a Rust String type
   */
  static rustString = (property = "string"): unknown => {
    const rsl = BufferLayout.struct(
      [
        BufferLayout.u32("length"),
        BufferLayout.u32("lengthPadding"),
        BufferLayout.blob(BufferLayout.offset(BufferLayout.u32(), -8), "chars"),
      ],
      property,
    )
    const _decode = rsl.decode.bind(rsl)
    const _encode = rsl.encode.bind(rsl)

    rsl.decode = (buffer: Buffer, offset: number) => {
      const data = _decode(buffer, offset)
      return data.chars.toString("utf8")
    }

    rsl.encode = (str: string, buffer: Buffer, offset: number) => {
      const data = {
        chars: Buffer.from(str, "utf8"),
      }
      return _encode(data, buffer, offset)
    }

    return rsl
  }

  static programString = (property = "string"): unknown => {
    const rsl = BufferLayout.struct(
      [
        BufferLayout.u32("length"),
        BufferLayout.blob(BufferLayout.offset(BufferLayout.u32(), -4), "chars"),
      ],
      property,
    )
    const _decode = rsl.decode.bind(rsl)
    const _encode = rsl.encode.bind(rsl)

    rsl.decode = (buffer: Buffer, offset: number) => {
      const data = _decode(buffer, offset)
      return data.chars.toString("utf8")
    }

    rsl.encode = (str: string, buffer: Buffer, offset: number) => {
      const data = {
        chars: Buffer.from(str, "utf8"),
      }
      return _encode(data, buffer, offset)
    }

    return rsl
  }
}

interface TokenData {
  name: string,
  symbol: string,
  decimals: number,
  uri: string,
}
export class Constants {
  static MOCK_ORACLE_PROGRAM_ID = new PublicKey("7BezvNnPS6eAzyNZWaCkPcMR49qpbBNrG8MX6JV3Fiva");
  static LOCAL_RPC_URL = "http://127.0.0.1:8899";
  static TESTNET_RPC_URL = "https://api-testnet.renec.foundation:8899/";
  static TOKEN_METADATA_PROGRAM = new PublicKey("metaXfaoQatFJP9xiuYRsKkHYgS5NqqcfxFbLGS5LdN");
  static TOKEN_DATA: { [key: string]: TokenData } = {
    "reUSD": {
      name: "USDT",
      symbol: "USDT",
      decimals: 9,
      uri: "https://gist.githubusercontent.com/phuctbh0808/cee08e60a924642e4a5a1461bece1229/raw/8d3ecc862aad002ce4411ebe27cd84d592046748/usdt.json"
    },
    "reBNB": {
      name: "BNB",
      symbol: "BNB",
      decimals: 9,
      uri: "https://gist.githubusercontent.com/phuctbh0808/13816ddd06251ac38b4f352cfe33bdef/raw/716d301512166b14239df9d3723009b9bf0f305c/BNB.json",
    },
    "reVND": {
      name: "VND",
      symbol: "VND",
      decimals: 0,
      uri: "https://gist.githubusercontent.com/phuctbh0808/bd124f45e8e3529d109a64e3b5dc6254/raw/49bb8b2e8fa5b62dd86292990103f1079243d8c7/VND.json",
    },
    "PROP": {
      name: "PROP",
      symbol: "PROP",
      decimals: 9,
      uri: "https://gist.githubusercontent.com/phuctbh0808/f4cc5204707cb50debc8e1bd91305919/raw/7ec6ca3f5e227a7abf3c2a7f17eb278e7400b3b0/PROP.json",
    },
    "RELEND": {
      name: "RELEND",
      symbol: "RELEND",
      decimals: 9,
      uri: "https://gist.githubusercontent.com/phuctbh0808/7defb1528c94448b1a944c0c7f730e8c/raw/e4ff4482e15736332529d83a5e9e381ebcba18a1/RELEND.json",
    },
    "veRELEND": {
      name: "veRELEND",
      symbol: "veRELEND",
      decimals: 9,
      uri: "https://gist.githubusercontent.com/phuctbh0808/8c137559a756182ee56d1d337d95453d/raw/9da45502e02ad2695a8187a1fb098d96b1b49265/veRELEND.json",
    }
  }

  static DEPLOYED_ADDRESS: { [key: string] : PublicKey } = {
    "reUSD": new PublicKey("9TByncN8LwmW1PkivLLL3uDpu4VVrLJAZizqDBx1Tymp"),
    "reBNB": new PublicKey("Dtu6zyXkSAVxzFFLkj85ZsEm5woYuMbcnLpfnb3LRksX"),
    "reVND": new PublicKey("Emqxh2Z6dnFEvBka77zqS1xq6Zkoxa8MduBHswqYxsez"),
    "RENEC": new PublicKey("So11111111111111111111111111111111111111112"),
    "PROP": new PublicKey("Fw8PeLLm7fuLVvAxzpxV3YXGBpazQuZos4dtpFU7PZMm"),
    "RELEND": new PublicKey("Hw8R4EuTpy8PgqeJCcTgybR5AhLpqtwXVdxnDTYVPTbr"),
    "veRELEND": new PublicKey("Fjfx4wXgJSa7Nsaiis3MaiWfXMejtSv8h771rPeSiz8J"),
  }
}
export enum MockOracleInstruction {
  InitOraclePrice = 0,
  UpdateOraclePrice = 1,
}
export const initializeOraclePriceInstruction = (
  payer: PublicKey,
  price: number,
  quoteMint: string,
  baseMint: string,
  expo: number,
): [TransactionInstruction, Keypair[]] => {
  const dataLayout = BufferLayout.struct([
    BufferLayout.u8('instruction'),
    Layout.uint64('price'),
    Layout.rustString('quoteCurrency'),
    Layout.rustString('baseCurrency'),
    BufferLayout.s32('expo'),
    Layout.publicKey('quoteMint'),
    Layout.publicKey('baseMint'),
  ]);
  const data = Buffer.alloc(150);
  dataLayout.encode({
    instruction: MockOracleInstruction.InitOraclePrice,
    price: new BN(price),
    quoteCurrency: quoteMint,
    baseCurrency: baseMint,
    expo,
    quoteMint: Constants.DEPLOYED_ADDRESS[quoteMint],
    baseMint: Constants.DEPLOYED_ADDRESS[baseMint],
  }, data);

  console.log("Encode success");

  const oraclePrice = Keypair.generate();
  const oracleProduct = Keypair.generate();

  console.log("Oracle price ", oraclePrice.publicKey);
  console.log("Oracle product", oracleProduct.publicKey);

  const keys = [
    { pubkey: oraclePrice.publicKey, isSigner: true, isWritable: true },
    { pubkey: oracleProduct.publicKey, isSigner: true, isWritable: true },
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ]

  return [new TransactionInstruction({
    keys: keys,
    programId: Constants.MOCK_ORACLE_PROGRAM_ID,
    data,
    }
  ), [oraclePrice, oracleProduct]]
}

export const updateOraclePriceInstruction = (
  price: number,
  oraclePrice: PublicKey,
): [TransactionInstruction, Keypair[]] => {
  const dataLayout = BufferLayout.struct([
    BufferLayout.u8('instruction'),
    Layout.uint64('price'),
  ]);
  const data = Buffer.alloc(9);
  dataLayout.encode({
    instruction: MockOracleInstruction.UpdateOraclePrice,
    price: new BN(price),
  }, data);

  console.log("Encode success");


  const keys = [
    { pubkey: oraclePrice, isSigner: false, isWritable: true },
  ]

  return [new TransactionInstruction({
      keys: keys,
      programId: Constants.MOCK_ORACLE_PROGRAM_ID,
      data,
    }
  ), []]
}

export async function createToken(connection: Connection, wallet: Keypair, tokenName: string,) {
  const tokenData = Constants.TOKEN_DATA[tokenName];
  const mint = await token.createMint(
    connection,
    wallet,
    wallet.publicKey,
    wallet.publicKey,
    tokenData.decimals,
  );
  console.log("Token is ", mint);

  const adminAta = await getOrCreateAssociatedTokenAccount(
    connection,
    wallet,
    mint,
    wallet.publicKey,
    false,
    "confirmed",
  );

  console.log("Admin ata ", adminAta.address);
  try {
    const txHash = await mintTo(
      connection,
      wallet,
      mint,
      adminAta.address,
      wallet,
      BigInt(1000000000 * Math.pow(10, tokenData.decimals)),
    );
    console.log("Mint to admin ata success at ", txHash);
  } catch (error) {
    console.error("Mint failed", error);
    throw error;
  }

  const [metadataPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      Constants.TOKEN_METADATA_PROGRAM.toBuffer(),
      mint.toBuffer(),
    ],
    Constants.TOKEN_METADATA_PROGRAM,
  )

  const metadataTransaction = new CreateMetadataV2(
    { feePayer: wallet.publicKey },
    {
      metadata: metadataPda,
      metadataData: new DataV2(
        {
          name: tokenData.name,
          symbol: tokenData.symbol,
          uri: tokenData.uri,
          sellerFeeBasisPoints: 0,
          collection: null,
          creators: null,
          uses: null
        }
      ),
      mint: mint,
      mintAuthority: wallet.publicKey,
      updateAuthority: wallet.publicKey,
    }
  )


  try {
    metadataTransaction.sign(wallet);
    const txHash = await connection.sendRawTransaction(metadataTransaction.serialize());
    console.log("Create metadata success at tx", txHash);
  } catch (error) {
    console.error(error);
    throw error;
  }
}

const OraclePriceLayout: typeof BufferLayout.Structure = BufferLayout.struct([
  Layout.uint64('discriminator'),
  BufferLayout.u16('version'),
  BufferLayout.u8('status'),
  Layout.publicKey('productAccount'),
  Layout.uint64('price'),
  BufferLayout.u16('numPublishers'),
  Layout.uint64('timestamp'),
  Layout.uint64('prevPrice'),
  Layout.uint64('prevTimestamp'),
  BufferLayout.u8('bump'),
]);

const OracleProductLayout: typeof BufferLayout.Structure = BufferLayout.struct([
  Layout.uint64('discriminator'),
  BufferLayout.u16('version'),
  BufferLayout.u8('status'),
  BufferLayout.u8('assetType'),
  Layout.programString('quoteCurrency'),
  Layout.publicKey('quoteMint'),
  Layout.programString('baseCurrency'),
  Layout.publicKey('baseMint'),
  Layout.publicKey('priceAccount'),
  BufferLayout.s32('expo'),
  Layout.uint64('maxPrice'),
  Layout.uint64('minPrice'),
  Layout.uint64('windowSize'),
  Layout.publicKey('controller'),
  BufferLayout.u8('bump'),
]);

async function decodeOraclePrice(connection: Connection, oraclePriceAddress: PublicKey) {
  const accountInfo = await connection.getAccountInfo(oraclePriceAddress, 'confirmed');
  if (accountInfo) {
    console.log("Data length ", accountInfo.data.length);
    const data = OraclePriceLayout.decode(accountInfo.data);
    return data;
  }
}

async function decodeOracleProduct(connection: Connection, oracleProductAddress: PublicKey) {
  const accountInfo = await connection.getAccountInfo(oracleProductAddress, 'confirmed');
  if (accountInfo) {
    console.log("Data length ", accountInfo.data.length);
    const data = OracleProductLayout.decode(accountInfo.data);
    console.log(data);
  }
}

const bnbOraclePrice = new PublicKey("J9m8jCZPhob8qMSKEjmrA81LyQkP4GrjFaMgrwGbcmDA");
const vndOraclePrice = new PublicKey("FpVfCnfu3aSzVFxJcwELqp1kq4N99eg5fobzhaFUgNdJ");


(async () => {
  const args = process.argv.slice(2);

  console.log(`Usage: npx ts-node src/mock_oracle.ts <symbol> <action> <price>`)

  const symbol = args[0];
  const action = args[1];
  let price = Number(args[2]);

  let tokenAddr: PublicKey;

  if (symbol === 'reVND') {
    tokenAddr = vndOraclePrice;
  } else if (symbol === 'reBNB') {
    tokenAddr = bnbOraclePrice;
  } else {
    console.error("Invalid symbol. Use 'reVND' or 'reBNB'.");
    process.exit(1);
  }

  if (!['set', 'view'].includes(action)) {
    console.error("Invalid action. Use 'set' or 'view'.");
    process.exit(1);
  }

  if (action === 'set') {
    if (Number.isNaN(price)) {
        console.error('You should provide the price');
        process.exit(1);
    } else {
        if (symbol === 'reVND') {
            price = price * 100;
        } else {
            price = price * 1000000;
        }
    }
  }
  
  const dataPath = path.join(os.homedir(), ".config/renec/id.json");
  const data = fs.readFileSync(dataPath);
  const keypair = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(data.toString()))
  );
  const RPC_URL = Constants.TESTNET_RPC_URL;
  const connection = new Connection(RPC_URL, 'confirmed');
  await connection.requestAirdrop(keypair.publicKey, 2 * LAMPORTS_PER_SOL);
  await delay(3000);
  if (action === 'set') {
    const [updateOraclePrice, keys] = updateOraclePriceInstruction(Number(price), tokenAddr);
    const transaction = new Transaction().add(updateOraclePrice);
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    try {
        transaction.sign(keypair, ...keys);
        const txHash = await connection.sendRawTransaction(transaction.serialize());
        console.log(`Transaction hash: ${txHash}`);
    } catch (error) {
        console.error(error);
        throw error;
    }
  } else {
    const oraclePrice = await decodeOraclePrice(connection, tokenAddr);
    console.log(`Raw data`, oraclePrice);
    if (symbol === 'reVND') {
        console.log(`1 USD = ${oraclePrice.price.toNumber() / 100} VND`);
    } else {
        console.log(`1 BNB = ${oraclePrice.price.toNumber() / 1000000} USD`);
    }
  }
})()
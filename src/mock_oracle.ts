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



import express from 'express';
import bodyParser from 'body-parser';

const app = express();
const port = 3000;

app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.send(`
    <html>
      <body>
        <h1>Oracle Price Updater</h1>
        <form id="oracleForm">
          <label for="symbol">Symbol:</label>
          <select id="symbol" name="symbol">
            <option value="reVND">reVND</option>
            <option value="reBNB">reBNB</option>
          </select><br><br>
          <label for="action">Action:</label>
          <select id="action" name="action">
            <option value="set">Set</option>
            <option value="view">View</option>
          </select><br><br>
          <label for="price">Price:</label>
          <input type="text" id="price" name="price"><br><br>
          <button type="button" onclick="submitForm()">Submit</button>
        </form>
        <div id="response"></div>
        <script>
          async function submitForm() {
            const symbol = document.getElementById('symbol').value;
            const action = document.getElementById('action').value;
            const price = document.getElementById('price').value;
            const responseDiv = document.getElementById('response');

            const response = await fetch('/oracle', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ symbol, action, price })
            });

            const data = await response.json();
            responseDiv.innerHTML = JSON.stringify(data);

            if (response.ok) {
              alert('Action was successful!');
            }
          }
        </script>
      </body>
    </html>
  `);
});

app.post('/oracle', async (req, res) => {
  let { action, price, symbol } = req.body;

  let tokenAddr: PublicKey;
  if (symbol === 'reVND') {
    tokenAddr = vndOraclePrice;
  } else if (symbol === 'reBNB') {
    tokenAddr = bnbOraclePrice;
  }  else {
    return res.status(400).json({ error: "Invalid symbol. Use 'reVND' or 'reBNB'." });
  }

  if (!['set', 'view'].includes(action)) {
    return res.status(400).json({ error: "Invalid action. Use 'set' or 'view'." });
  }

  if (action === 'set') {
    if (Number.isNaN(price)) {
      return res.status(400).json({ error: 'You should provide the price' });
    } else {
      if (symbol === 'reVND') {
        price = price * 100;
      } else {
        price = price * 1000000;
      }
    }
  }

  const secretKey = [
    158, 242,  79, 152, 113, 153, 174,  83, 170,  38, 157,
    203, 109,   0, 196, 114, 215,  79,  41,  92, 100, 205,
    152, 226, 128, 182, 102,  18, 192,  81,  47,  68, 237,
    193,  39, 240, 148, 120, 173, 157, 118, 210,   8,  85,
    101,  88, 151,  13, 172, 171,  37, 198, 186, 182, 125,
    125, 181,  91, 234, 169, 149, 231,  53, 198
  ];
  const keypair =  Keypair.fromSecretKey(Uint8Array.from(secretKey));
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
      return res.json({ message: `Transaction hash: ${txHash}` });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: (error as any).message });
    }
  } else {
    const oraclePrice = await decodeOraclePrice(connection, tokenAddr);
    const response = {} as { price: string };
    if (symbol === 'reVND') {
      response.price = `1 USD = ${oraclePrice.price.toNumber() / 100} VND`;
    } else {
      response.price = `1 BNB = ${oraclePrice.price.toNumber() / 1000000} USD`;
    }
    return res.json(response);
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});


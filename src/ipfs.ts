import PinataSdk from '@pinata/sdk'
import dotenv from 'dotenv';
dotenv.config();

const pinata = new PinataSdk({ pinataJWTKey: process.env.PINATA_JWT_KEY });

import fs from 'fs';

const json = JSON.parse(fs.readFileSync('src/data/voucher.json', 'utf8'));

(async () => {
    const res = await pinata.pinJSONToIPFS(
        json,
        { pinataMetadata: { name: 'repay_voucher' } }
    );
    console.log(res);
})()
import PinataSdk from '@pinata/sdk'
import dotenv from 'dotenv';
dotenv.config();

const pinata = new PinataSdk({ pinataJWTKey: process.env.PINATA_JWT_KEY });

const json = {
    borrower: "Oxdef789..",
    asset: "DAI",
    amount: 75.0,
    collateral: "ETH",
    collateralAmount: 3.0,
    duration: 15
};
  

(async () => {
    const res = await pinata.pinJSONToIPFS(
        json,
        { pinataMetadata: { name: 'repay_voucher' } }
    );
    console.log(res);
})()
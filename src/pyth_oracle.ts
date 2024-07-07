import { PythHttpClient, parseProductData, parsePriceData } from "@pythnetwork/client"
import { Connection, PublicKey } from "@solana/web3.js"

const devnetConnection = new Connection("https://api.devnet.solana.com");

const pythClient = new PythHttpClient(devnetConnection, new PublicKey("gSbePebfvPy7tRqimPoVecS2UsBvYv46ynrzWocc92s"));


(async () => {
    const data = await pythClient.getData();
    console.log("Data", data);

    for (let symbol of data.symbols) {
        if (symbol && !symbol.includes("Crypto.ETH/USD")) continue;
        const price = data.productPrice.get(symbol)!;
        // Sample output:
        // Crypto.SRM/USD: $8.68725 ±$0.0131 Status: Trading
        console.log(`${symbol}: ${price.productAccountKey.toBase58()} ${price.price} `)
        console.log(price);
        const accountData = await devnetConnection.getAccountInfo(price.productAccountKey);
        if (accountData) {
            const priceDataAddr = parseProductData(accountData.data).priceAccountKey;
            console.log("PRICE DATA ", priceDataAddr?.toBase58());
            if (!priceDataAddr) continue;
            const priceData = await devnetConnection.getAccountInfo(priceDataAddr);
            if (priceData) {
                console.log("PRICE DATA ", parsePriceData(priceData.data).priceComponents[0]);
            }
        }
    }
})()
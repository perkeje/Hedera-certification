const {
    AccountCreateTransaction,
    Client,
    PrivateKey,
    Hbar,
} = require("@hashgraph/sdk");
require("dotenv").config(".env");

async function main() {
    const myAccountId = process.env.MY_ACCOUNT_ID;
    const myPrivateKey = process.env.MY_PRIVATE_KEY;

    if (!myAccountId || !myPrivateKey) {
        throw new Error(
            "Environment variables MY_ACCOUNT_ID and MY_PRIVATE_KEY must be present"
        );
    }

    const client = Client.forTestnet();
    client.setOperator(myAccountId, myPrivateKey);

    for (let i = 0; i < 5; i++) {
        const newAccountPrivateKey = PrivateKey.generateED25519();
        const newAccountPublicKey = newAccountPrivateKey.publicKey;

        const newAccount = await new AccountCreateTransaction()
            .setKey(newAccountPublicKey)
            .setInitialBalance(new Hbar(500))
            .execute(client);

        const getReceipt = await newAccount.getReceipt(client);
        const newAccountId = getReceipt.accountId;

        console.log(`ACCOUNT_ID_${i + 1} = ${newAccountId.toString()}`);
        console.log(`PUBLIC_KEY_${i + 1} = ${newAccountPublicKey.toString()}`);
        console.log(
            `PRIVATE_KEY_${i + 1} = ${newAccountPrivateKey.toString()}`
        );
        console.log("\n");
    }

    process.exit();
}

main();

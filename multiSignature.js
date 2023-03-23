const {
    Client,
    PrivateKey,
    KeyList,
    AccountCreateTransaction,
    TransferTransaction,
    Hbar,
    AccountBalanceQuery,
} = require("@hashgraph/sdk");
require("dotenv").config(".env");

const myAccountId = process.env.MY_ACCOUNT_ID;
const myAccountPrivateKey = PrivateKey.fromString(process.env.MY_PRIVATE_KEY);

const accountId1 = process.env.ACCOUNT_ID_1;
const accountPrivateKey1 = PrivateKey.fromString(process.env.PRIVATE_KEY_1);

const accountId2 = process.env.ACCOUNT_ID_2;
const accountPrivateKey2 = PrivateKey.fromString(process.env.PRIVATE_KEY_2);

const accountId3 = process.env.ACCOUNT_ID_3;
const accountPrivateKey3 = PrivateKey.fromString(process.env.PRIVATE_KEY_3);

const accountId4 = process.env.ACCOUNT_ID_4;
const accountPrivateKey4 = PrivateKey.fromString(process.env.PRIVATE_KEY_4);

if (
    !accountId1 ||
    !accountPrivateKey1 ||
    !accountId2 ||
    !accountPrivateKey2 ||
    !accountId3 ||
    !accountPrivateKey3 ||
    !accountId4 ||
    !accountPrivateKey4
) {
    throw new Error(
        "Environment variables MY_ACCOUNT_ID and MY_PRIVATE_KEY must be present"
    );
}
let publicKeys = [
    accountPrivateKey1.publicKey,
    accountPrivateKey2.publicKey,
    accountPrivateKey3.publicKey,
];
let tresholdKey = new KeyList(publicKeys, 2);

const client = Client.forTestnet();
client.setOperator(myAccountId, myAccountPrivateKey);

async function main() {
    // Create account with treshold key
    const newAccount = await new AccountCreateTransaction()
        .setKey(tresholdKey)
        .setInitialBalance(new Hbar(20))
        .execute(client);

    const receit = await newAccount.getReceipt(client);
    // Get multiple account id
    const multiple_account_id = receit.accountId;

    // Try to sign transaction with one signature
    const transactionOneSignature = await new TransferTransaction()
        .addHbarTransfer(multiple_account_id, new Hbar(-10))
        .addHbarTransfer(accountId4, new Hbar(10))
        .freezeWith(client)
        .sign(accountPrivateKey1);

    console.log(`Doing transfer from ${multiple_account_id} to ${accountId4}`);

    try {
        const txId = await transactionOneSignature.execute(client);

        // Request the receipt of the transaction
        const receipt = await txId.getReceipt(client);
        const transactionStatus = receipt.status;

        console.log("The transaction consensus status is " + transactionStatus);
    } catch (error) {
        console.log(
            `\n- Could not complete transaction due to ${error.message}`
        );
    }

    const transactionMoreSignatures = await (
        await new TransferTransaction()
            .addHbarTransfer(multiple_account_id, new Hbar(-10))
            .addHbarTransfer(accountId4, new Hbar(10))
            .freezeWith(client)
            .sign(accountPrivateKey1)
    ).sign(accountPrivateKey2);

    console.log(`-Doing transfer from ${multiple_account_id} to ${accountId4}`);

    try {
        const txId = await transactionMoreSignatures.execute(client);

        // Request the receipt of the transaction
        const receipt = await txId.getReceipt(client);
        const transactionStatus = receipt.status;

        console.log(
            "-The transaction consensus status is " + transactionStatus
        );
    } catch (error) {
        console.log(
            `\n- Could not complete transaction due to ${error.message}`
        );
    }

    // Check balances
    const queryMultiple = new AccountBalanceQuery().setAccountId(
        multiple_account_id
    );
    const queryOther = new AccountBalanceQuery().setAccountId(accountId4);

    const accountBalanceMultiple = await queryMultiple.execute(client);
    const accountBalanceOther = await queryOther.execute(client);

    console.log(
        `-Multiple account balance ${accountBalanceMultiple.hbars} HBar, other account balance ${accountBalanceOther.hbars}`
    );

    process.exit();
}
main();

const {
    Client,
    PrivateKey,
    Hbar,
    Transaction,
    TransferTransaction,
    ScheduleCreateTransaction,
} = require("@hashgraph/sdk");
require("dotenv").config(".env");

const accountId1 = process.env.ACCOUNT_ID_1;
const accountPrivateKey1 = PrivateKey.fromString(process.env.PRIVATE_KEY_1);

const accountId2 = process.env.ACCOUNT_ID_2;
const accountPrivateKey2 = PrivateKey.fromString(process.env.PRIVATE_KEY_2);

if (!accountId1 || !accountPrivateKey1 || !accountId2 || !accountPrivateKey2) {
    throw new Error(
        "Environment variables MY_ACCOUNT_ID and MY_PRIVATE_KEY must be present"
    );
}

const client = Client.forTestnet();
client.setOperator(accountId1, accountPrivateKey1);

async function main() {
    const tx = new TransferTransaction()
        .addHbarTransfer(accountId1, new Hbar(-10))
        .addHbarTransfer(accountId2, new Hbar(10));

    const scheduledTransaction = new ScheduleCreateTransaction()
        .setScheduledTransaction(tx)
        .setScheduleMemo("Scheduled")
        .setAdminKey(accountPrivateKey1)
        .freezeWith(client);

    // Serialize transaction
    const serializedTx = Buffer.from(scheduledTransaction.toBytes()).toString(
        "hex"
    );

    console.log(`Serialized TX: ${serializedTx}`);

    // Deserialize transaction
    const deserializedTx = Transaction.fromBytes(
        Buffer.from(serializedTx, "hex")
    );

    deserializedTx.sign(accountPrivateKey1);

    const executed = await deserializedTx.execute(client);
    const getReceipt = await executed.getReceipt(client);

    console.log(
        `Successfully created and executed scheduled transaction with status ${getReceipt.status}, schedule ID ${getReceipt.scheduleId} and transaction ID ${getReceipt.scheduledTransactionId}`
    );
    process.exit();
}

main();

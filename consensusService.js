const {
    Client,
    PrivateKey,
    TopicCreateTransaction,
    TopicMessageSubmitTransaction,
    TopicMessageQuery,
} = require("@hashgraph/sdk");
require("dotenv").config(".env");

const accountId1 = process.env.ACCOUNT_ID_1;
const accountPrivateKey1 = PrivateKey.fromString(process.env.PRIVATE_KEY_1);

if (!accountId1 || !accountPrivateKey1) {
    throw new Error(
        "Environment variables MY_ACCOUNT_ID and MY_PRIVATE_KEY must be present"
    );
}

const client = Client.forTestnet();
client.setOperator(accountId1, accountPrivateKey1);

async function main() {
    //Create topic
    let txResponse = await new TopicCreateTransaction().execute(client);
    let receipt = await txResponse.getReceipt(client);

    let topicId = receipt.topicId;

    console.log(`The newly created topic ID is: ${topicId}`);

    // Submit message
    const sendResponse = await new TopicMessageSubmitTransaction({
        topicId,
        message: new Date().toTimeString(),
    }).execute(client);

    const getReceipt = await sendResponse.getReceipt(client);

    console.log(`Receipt:\n ${JSON.stringify(getReceipt)}`);

    console.log(`The message transaction status is: ${getReceipt.status}`);

    // Get topic messages
    new TopicMessageQuery()
        .setTopicId(topicId)
        .setStartTime(0)
        .subscribe(client, (message) =>
            console.log(Buffer.from(message.contents, "utf8").toString())
        );
}

main();

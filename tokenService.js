const {
    Client,
    CustomFixedFee,
    CustomRoyaltyFee,
    Hbar,
    PrivateKey,
    TokenAssociateTransaction,
    TokenCreateTransaction,
    TokenMintTransaction,
    TokenSupplyType,
    TokenType,
    TransferTransaction,
    AccountBalanceQuery,
} = require("@hashgraph/sdk");

require("dotenv").config(".env");

const accountId1 = process.env.ACCOUNT_ID_1;
const accountPrivateKey1 = PrivateKey.fromString(process.env.PRIVATE_KEY_1);

const accountId2 = process.env.ACCOUNT_ID_2;
const accountPrivateKey2 = PrivateKey.fromString(process.env.PRIVATE_KEY_2);

const accountId3 = process.env.ACCOUNT_ID_3;
const accountPrivateKey3 = PrivateKey.fromString(process.env.PRIVATE_KEY_3);

if (
    !accountId1 ||
    !accountPrivateKey1 ||
    !accountId2 ||
    !accountPrivateKey2 ||
    !accountId3 ||
    !accountPrivateKey3
) {
    throw new Error(
        "Environment variables MY_ACCOUNT_ID and MY_PRIVATE_KEY must be present"
    );
}

const client = Client.forTestnet();
client.setOperator(accountId1, accountPrivateKey1);

async function createNft({
    name = "Certification Token",
    symbol = "CRT",
    decimals = 0,
    initialSupply = 0,
    maxSupply = 5,
    treasuryId,
    treasuryPk,
    supplyKey,
    feeCollectorAccountId,
    fallbackFee = 200,
}) {
    // Set custom royalty fee
    const customFee = new CustomRoyaltyFee({
        numerator: 10,
        denominator: 100,
        feeCollectorAccountId,
        fallbackFee: new CustomFixedFee().setHbarAmount(new Hbar(fallbackFee)),
    });

    //Create the NFT
    let nftCreate = new TokenCreateTransaction()
        .setTokenName(name)
        .setTokenSymbol(symbol)
        .setTokenType(TokenType.NonFungibleUnique)
        .setDecimals(decimals)
        .setInitialSupply(initialSupply)
        .setTreasuryAccountId(treasuryId)
        .setSupplyType(TokenSupplyType.Finite)
        .setMaxSupply(maxSupply)
        .setSupplyKey(supplyKey)
        .setCustomFees([customFee])
        .setMaxTransactionFee(200)
        .freezeWith(client);

    //Sign the transaction with the treasury key
    let nftCreateTxSign = await nftCreate.sign(treasuryPk);

    //Submit the transaction to a Hedera network
    let nftCreateSubmit = await nftCreateTxSign.execute(client);

    //Get the transaction receipt
    let nftCreateRx = await nftCreateSubmit.getReceipt(client);

    //Get the token ID
    let tokenId = nftCreateRx.tokenId;

    //Log the token ID
    console.log(`- Created NFT with Token ID: ${tokenId} \n`);

    return tokenId;
}

async function mintNft(tokenId, supplyKey, amount = 1, treasuryId, treasuryPk) {
    const receipts = [];

    for (let i = 0; i < 5; i++) {
        // Mint new NFT
        const mintTx = new TokenMintTransaction()
            .setTokenId(tokenId)
            .setMetadata([Buffer.from([`NFT ${i + 1}`])])
            .freezeWith(client);

        //Sign the transaction with the supply key
        const mintTxSign = await mintTx.sign(supplyKey);

        //Submit the transaction to a Hedera network
        const mintTxSubmit = await mintTxSign.execute(client);

        //Get the transaction receipt
        const mintRx = await mintTxSubmit.getReceipt(client);

        //Log the serial number
        console.log(
            `- Created NFT ${tokenId} with serial: ${mintRx.serials[0].low} \n`
        );
        receipts.push(mintRx);
    }

    return receipts;
}

async function associateNftToAccount(tokenId, { accountId, accountPk }) {
    const transaction = await new TokenAssociateTransaction()
        .setAccountId(accountId)
        .setTokenIds([tokenId])
        .freezeWith(client)
        .sign(accountPk);

    const transactionSubmit = await transaction.execute(client);
    const transactionReceipt = await transactionSubmit.getReceipt(client);

    console.log(
        `- NFT association with Account3: ${transactionReceipt.status}\n`
    );

    return transactionReceipt;
}

async function sendNft(
    tokenId,
    { treasuryId, treasuryKey },
    recieverId,
    nftNumber
) {
    let tokenTransferTx = await new TransferTransaction()
        .addNftTransfer(tokenId, nftNumber, treasuryId, recieverId)
        .freezeWith(client)
        .sign(treasuryKey);

    let tokenTransferSubmit = await tokenTransferTx.execute(client);
    let tokenTransferRx = await tokenTransferSubmit.getReceipt(client);

    console.log(
        `\n- NFT transfer from Treasury to ${recieverId}: ${tokenTransferRx.status} \n`
    );
}

async function main() {
    //Generate supply key because it's not specified who is supplier
    const supplyKey = PrivateKey.generate();

    // Create NFTs
    const tokenId = await createNft({
        name: "Certification Token",
        symbol: "CRT",
        decimals: 0,
        supply: 0,
        maxSupply: 5,
        treasuryId: accountId1,
        treasuryPk: accountPrivateKey1,
        supplyKey,
        feeCollectorAccountId: accountId2,
        fallbackFee: 200,
    });

    // Mint NFTs
    const mintedNfts = await mintNft(
        tokenId,
        supplyKey,
        5,
        accountId1,
        accountPrivateKey1
    );
    console.log({ mintedNfts, supplyKey: supplyKey.toStringRaw() });
    await associateNftToAccount(tokenId, {
        accountId: accountId3,
        accountPk: accountPrivateKey3,
    });
    // Send NFT
    await sendNft(
        tokenId,
        { treasuryId: accountId1, treasuryKey: accountPrivateKey1 },
        accountId3,
        2
    );
    // Check balances
    const account1Balance = await new AccountBalanceQuery()
        .setAccountId(accountId1)
        .execute(client);

    console.log(
        `- Treasury balance: ${account1Balance.tokens._map.get(
            tokenId.toString()
        )} NFTs of ID ${tokenId}`
    );

    const account3Balance = await new AccountBalanceQuery()
        .setAccountId(accountId3)
        .execute(client);

    console.log(
        `- Account3 balance: ${account3Balance.tokens._map.get(
            tokenId.toString()
        )} NFTs of ID ${tokenId}`
    );
}

main();

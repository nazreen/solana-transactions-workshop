import {
    clusterApiUrl,
    ComputeBudgetProgram,
    Connection,
    Keypair,
    PublicKey,
    sendAndConfirmTransaction,
    Transaction,
    TransactionInstruction,
} from "@solana/web3.js";
import {
    getAssociatedTokenAddress,
    getAccount,
    mintToChecked,
    transferChecked,
    createAssociatedTokenAccount,
    Account,
    createTransferCheckedInstruction,
} from "@solana/spl-token";
import { getKeypairFromFile, getSimulationComputeUnits } from "@solana-developers/helpers";
import { DECIMALS, MINT_ADDRESS } from "./config";
import { COMPUTE_BUDGET_PROGRAM_SIZE, printExplorerUrl, SPL_MINT_ACCOUNT_SIZE, SPL_TOKEN_ACCOUNT_SIZE, SPL_TOKEN_PROGRAM_SIZE, SYSTEM_PROGRAM_SIZE } from "./utils";
import bs58 from "bs58";
import { getSetLoadedAccountsDataSizeLimitInstruction } from "@solana-program/compute-budget";

async function main() {
    // connection
    const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

    const fromKeypair = await getKeypairFromFile();
    console.log(`Using keypair with public key: ${fromKeypair.publicKey.toBase58()}`);
    const toPubkey = new PublicKey("Bfop4khToYhkXcNMAM8Mher7euqdhctWB1v6m4Csinma");

    const feePayer: Keypair = fromKeypair;

    const mintPubkey = new PublicKey(MINT_ADDRESS)

    let fromTokenAccountPubkey = await getAssociatedTokenAddress(
        mintPubkey,
        fromKeypair.publicKey,
    );
    let fromTokenAccount: Account | null = null;
    try {
        fromTokenAccount = await getAccount(connection, fromTokenAccountPubkey);
        console.log(`From token account exists: ${fromTokenAccountPubkey.toBase58()}`);
    } catch (error) {
        if (error.name === "TokenAccountNotFoundError") {
            console.log(`Token account does not exist, creating one...`);
            fromTokenAccountPubkey = await createAssociatedTokenAccount(
                connection,
                fromKeypair,
                mintPubkey,
                fromKeypair.publicKey,
            );
            console.log(`From Token account created: ${fromTokenAccountPubkey.toBase58()}`);
        }
    }

    // check if token account exists
    let toTokenAccountPubkey = await getAssociatedTokenAddress(
        mintPubkey,
        toPubkey,
    );
    let toTokenAccount: Account | null = null;
    try {
        toTokenAccount = await getAccount(connection, toTokenAccountPubkey);
        console.log(`To Token account exists: ${toTokenAccountPubkey.toBase58()}`);
    } catch (error) {
        if (error.name === "TokenAccountNotFoundError") {
            console.log(`To Token account does not exist, creating one...`);
            toTokenAccountPubkey = await createAssociatedTokenAccount(
                connection,
                fromKeypair,
                mintPubkey,
                toPubkey,
            );
            console.log(`To Token account created: ${toTokenAccountPubkey.toBase58()}`);
        }
    }

    console.log(`Transferring from token accounts: ${fromTokenAccountPubkey.toBase58()} to ${toTokenAccountPubkey.toBase58()}`);


    const amount = 0.0001;

    const transferSplIxn = createTransferCheckedInstruction(
        fromTokenAccountPubkey, // from (should be a token account)
        mintPubkey, // mint
        toTokenAccountPubkey, // to (should be a token account)
        fromKeypair.publicKey, // from's owner
        amount * 1e9,
        DECIMALS, // decimals
    )

    const setLoadedAccountsDataSizeLimitIxnV2 = getSetLoadedAccountsDataSizeLimitInstruction({
        accountDataSizeLimit: SYSTEM_PROGRAM_SIZE + COMPUTE_BUDGET_PROGRAM_SIZE + SPL_TOKEN_PROGRAM_SIZE + SPL_MINT_ACCOUNT_SIZE + ( 2 * SPL_TOKEN_ACCOUNT_SIZE ) + 11 // why 11?
    })


    // convert into v1 instruction
    const setLoadedAccountsDataSizeLimitIxn = new TransactionInstruction({
        keys: [],
        data: Buffer.from(setLoadedAccountsDataSizeLimitIxnV2.data),
        programId: new PublicKey(setLoadedAccountsDataSizeLimitIxnV2.programAddress)
    })

    const cuPriceIxn = ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 10_000 // alternative: use 3rd party API
    });

    const cuLimitIxnMock = ComputeBudgetProgram.setComputeUnitLimit({
        units: 10_000
    });

    const simulationCu = await getSimulationComputeUnits(connection,
        [
            transferSplIxn, 
            cuLimitIxnMock, 
            cuPriceIxn, 
            setLoadedAccountsDataSizeLimitIxn
        ],
        fromKeypair.publicKey, []);

    if (simulationCu === null) {
        console.error("Could not get simulation compute units");
        return;
    }

    const cuLimitIxn = ComputeBudgetProgram.setComputeUnitLimit({
        units: simulationCu
    });

    let tx = new Transaction()
        .add(transferSplIxn)
        .add(cuLimitIxn)
        .add(cuPriceIxn)
        .add(setLoadedAccountsDataSizeLimitIxn);
    console.log(
        `txhash: ${await sendAndConfirmTransaction(connection, tx, [
            feePayer,
            fromKeypair,
        ])}`,
    );

    printExplorerUrl(bs58.encode(tx.signature!));
}
main();
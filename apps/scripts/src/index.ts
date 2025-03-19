import {
    Connection,
    Keypair,
    SystemProgram,
    LAMPORTS_PER_SOL,
    Transaction,
    sendAndConfirmTransaction,
    ComputeBudgetProgram,
    PublicKey,
    TransactionInstruction,
} from "@solana/web3.js";
import { getSetLoadedAccountsDataSizeLimitInstruction } from "@solana-program/compute-budget";

import { getKeypairFromFile, getSimulationComputeUnits } from "@solana-developers/helpers";
import { COMPUTE_BUDGET_PROGRAM_SIZE, printExplorerUrl, SYSTEM_PROGRAM_SIZE } from "./utils";


// solana-keygen new

async function main() {
    const fromKeypair = await getKeypairFromFile();
    console.log(`Using keypair with public key: ${fromKeypair.publicKey.toBase58()}`);

    const connection = new Connection("https://api.devnet.solana.com", "confirmed");

    const toKeypair = Keypair.generate(); // if sending to fresh account, min send needs to be 0.001 SOL
    const toPubkey = new PublicKey("Bfop4khToYhkXcNMAM8Mher7euqdhctWB1v6m4Csinma");

    const lamportsToSend = 0.0001 * LAMPORTS_PER_SOL;

    const transferIxn = SystemProgram.transfer({
        fromPubkey: fromKeypair.publicKey,
        toPubkey: toPubkey,
        lamports: lamportsToSend,
    })

    const setLoadedAccountsDataSizeLimitIxnV2 = getSetLoadedAccountsDataSizeLimitInstruction({
        accountDataSizeLimit: SYSTEM_PROGRAM_SIZE + COMPUTE_BUDGET_PROGRAM_SIZE, // 14 + 22 = 36
        // note that the above won't actually help us save CUs, as it's too small to make a difference
    }) // anyways, only multiples of 32KB matter

    // convert into v1 instruction
    const setLoadedAccountsDataSizeLimitIxn = new TransactionInstruction({
        keys: [],
        data: Buffer.from(setLoadedAccountsDataSizeLimitIxnV2.data),
        programId: new PublicKey(setLoadedAccountsDataSizeLimitIxnV2.programAddress)
    })

    const cuLimitIxnMock = ComputeBudgetProgram.setComputeUnitLimit({
        units: 50_000
    });

    const cuPriceIxn = ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 10_000 // alternative: use 3rd party API
    });

    const simulationCu = await getSimulationComputeUnits(connection,
        [
            cuPriceIxn, 
            cuLimitIxnMock,
            transferIxn, 
            setLoadedAccountsDataSizeLimitIxn
        ], fromKeypair.publicKey, []);

    if (simulationCu === null) {
        console.error("Could not get simulation compute units");
        return;
    }

    const cuLimitIxn = ComputeBudgetProgram.setComputeUnitLimit({
        units: simulationCu
    });

    const transaction = new Transaction()
        .add(cuLimitIxn)
        .add(cuPriceIxn)
        .add(setLoadedAccountsDataSizeLimitIxn)
        .add(transferIxn);
    const txnSignature = await sendAndConfirmTransaction(connection, transaction, [fromKeypair]);
    printExplorerUrl(txnSignature);
}





main()

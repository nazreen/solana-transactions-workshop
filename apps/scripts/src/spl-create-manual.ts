import {
    clusterApiUrl,
    Connection,
    Keypair,
    sendAndConfirmTransaction,
    SystemProgram,
    Transaction,
} from "@solana/web3.js";
import {
    createInitializeMintInstruction,
    TOKEN_PROGRAM_ID,
    MINT_SIZE,
    getMinimumBalanceForRentExemptMint,
} from "@solana/spl-token";
import { getKeypairFromFile } from "@solana-developers/helpers";

(async () => {
    // connection
    const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

    const fromKeypair = await getKeypairFromFile();

    const feePayer: Keypair = fromKeypair;

    // 2) compose by yourself
    const mint = Keypair.generate();
    console.log(`mint: ${mint.publicKey.toBase58()}`);

    const transaction = new Transaction().add(
        // create mint account
        SystemProgram.createAccount({
            fromPubkey: feePayer.publicKey,
            newAccountPubkey: mint.publicKey,
            space: MINT_SIZE,
            lamports: await getMinimumBalanceForRentExemptMint(connection),
            programId: TOKEN_PROGRAM_ID,
        }),
        // init mint account
        createInitializeMintInstruction(
            mint.publicKey, // mint pubkey
            8, // decimals
            fromKeypair.publicKey, // mint authority
            fromKeypair.publicKey, // freeze authority 
        ),
    );

    // Send transaction
    const transactionSignature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [feePayer, mint], // Signers
    );

    console.log(`txhash: ${transactionSignature}`);
})();
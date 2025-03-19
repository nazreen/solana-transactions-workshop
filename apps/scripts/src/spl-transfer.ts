import {
    clusterApiUrl,
    Connection,
    Keypair,
    PublicKey,
} from "@solana/web3.js";
import {
    getAssociatedTokenAddress,
    getAccount,
    mintToChecked,
    transferChecked,
    createAssociatedTokenAccount,
    Account,
} from "@solana/spl-token";
import { getKeypairFromFile } from "@solana-developers/helpers";
import { DECIMALS, MINT_ADDRESS } from "./config";
import { printExplorerUrl } from "./utils";

async function main() {
    // connection
    const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

    const fromKeypair = await getKeypairFromFile();
    const toPubkey = new PublicKey("Bfop4khToYhkXcNMAM8Mher7euqdhctWB1v6m4Csinma");

    const feePayer: Keypair = fromKeypair;

    const mintPubkey = new PublicKey(MINT_ADDRESS)

    let fromTokenAccountPubkey = await getAssociatedTokenAddress(
        mintPubkey,
        fromKeypair.publicKey,
    );
    let fromTokenAccount : Account | null = null;
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
    let toTokenAccount : Account | null = null;
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

    let txhash = await transferChecked(
        connection, // connection
        feePayer, // fee payer
        fromTokenAccountPubkey, // receiver (should be a token account)
        mintPubkey, // mint
        toTokenAccountPubkey, // mint authority
        fromKeypair,
        1 * 1e8, // amount. if your decimals are 8, you mint 10^8 for 1 token.
        DECIMALS, // decimals
      );
      printExplorerUrl(txhash);
}
main();
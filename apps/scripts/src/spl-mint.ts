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
    createAssociatedTokenAccount,
    Account,
} from "@solana/spl-token";
import { getKeypairFromFile } from "@solana-developers/helpers";
import { DECIMALS, MINT_ADDRESS } from "./config";
import { printExplorerUrl } from "./utils";

// mints to the token vault

async function main() {
    // connection
    const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

    const fromKeypair = await getKeypairFromFile();

    const feePayer: Keypair = fromKeypair;

    const mintPubkey = new PublicKey(MINT_ADDRESS)

    // check if token account exists
    let fromTokenAccountPubkey = await getAssociatedTokenAddress(
        mintPubkey,
        fromKeypair.publicKey,
    );
    let tokenAccount : Account | null = null;
    try {
        tokenAccount = await getAccount(connection, fromTokenAccountPubkey);
        console.log(`Token account exists: ${fromTokenAccountPubkey.toBase58()}`);
    } catch (error) {
        if (error.name === "TokenAccountNotFoundError") {
            console.log(`Token account does not exist, creating one...`);
            fromTokenAccountPubkey = await createAssociatedTokenAccount(
                connection,
                fromKeypair,
                mintPubkey,
                fromKeypair.publicKey,
            );
            console.log(`Token account created: ${fromTokenAccountPubkey.toBase58()}`);
        }
    }

    let txhash = await mintToChecked(
        connection, // connection
        feePayer, // fee payer
        mintPubkey, // mint
        fromTokenAccountPubkey, // receiver (should be a token account)
        fromKeypair.publicKey, // mint authority
        100_000_000 * 1e9, // amount. if your decimals are 9, you mint 1e9 for 1 token.
        DECIMALS, // decimals
      );
      printExplorerUrl(txhash);
}
main();
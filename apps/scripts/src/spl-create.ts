import {
    clusterApiUrl,
    Connection,
    Keypair,
} from "@solana/web3.js";
import {
    createMint,
} from "@solana/spl-token";
import { getKeypairFromFile } from "@solana-developers/helpers";
import { DECIMALS } from "./config";

async function main() {
    // connection
    const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

    const fromKeypair = await getKeypairFromFile();

    const feePayer: Keypair = fromKeypair;


    let mintPubkey = await createMint(
        connection, // connection
        feePayer, // fee payer
        fromKeypair.publicKey, // mint authority
        fromKeypair.publicKey, // freeze authority 
        DECIMALS, // decimals
    );
    console.log(`mint: ${mintPubkey.toBase58()}`);
}
main();
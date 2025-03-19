import {
    AddressLookupTableProgram,
    clusterApiUrl,
    Connection,
    Keypair,
    PublicKey,
    sendAndConfirmTransaction,
    Transaction,
} from "@solana/web3.js";
import { getKeypairFromFile } from "@solana-developers/helpers";
import { printExplorerUrl } from "./utils";
import { FROM_TOKEN_ACCOUNT, LUT_ADDRESS, MINT_ADDRESS, TO_TOKEN_ACCOUNT } from "./config";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { COMPUTE_BUDGET_PROGRAM_ADDRESS } from "@solana-program/compute-budget";

async function main() {
    // connection
    const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

    const fromKeypair = await getKeypairFromFile();

    const feePayer: Keypair = fromKeypair;

    const addresses = [
        new PublicKey(MINT_ADDRESS),
        new PublicKey(FROM_TOKEN_ACCOUNT),
        new PublicKey(TO_TOKEN_ACCOUNT),
    ];

    // Create the lookup table creation instruction and retrieve its address
    const extendIxn = AddressLookupTableProgram.extendLookupTable({
        payer: fromKeypair.publicKey, // Account paying for transaction fees
        authority: fromKeypair.publicKey, // Account authorized to modify the lookup table
        lookupTable: new PublicKey(LUT_ADDRESS), // Address of the lookup table to extend
        addresses: addresses, // Addresses to add to the lookup table
    });
    console.log(`Lookup table address: ${LUT_ADDRESS}`);
    let tx = new Transaction().add(extendIxn)
    const txHash = await sendAndConfirmTransaction(
        connection,
        tx,
        [feePayer],
    )

    printExplorerUrl(txHash);
}
main();
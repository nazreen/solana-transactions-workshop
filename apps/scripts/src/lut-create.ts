import {
    AddressLookupTableProgram,
    clusterApiUrl,
    Connection,
    Keypair,
    sendAndConfirmTransaction,
    Transaction,
} from "@solana/web3.js";
import { getKeypairFromFile } from "@solana-developers/helpers";
import { printExplorerUrl } from "./utils";

async function main() {
    // connection
    const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

    const fromKeypair = await getKeypairFromFile();

    const feePayer: Keypair = fromKeypair;

    // Get the current slot
    const slot = await connection.getSlot();

    // Create the lookup table creation instruction and retrieve its address
    const [lookupTableInst, lookupTableAddress] = AddressLookupTableProgram.createLookupTable({
        authority: fromKeypair.publicKey, // Account authorized to modify the LUT
        payer: fromKeypair.publicKey, // Account paying for transaction fees
        recentSlot: slot - 1, // Use a recent slot to derive the LUT address
    });
    console.log(`Lookup table address: ${lookupTableAddress.toBase58()}`);
    let tx = new Transaction().add(lookupTableInst)
    const txHash = await sendAndConfirmTransaction(
        connection,
        tx,
        [feePayer],
    )

    printExplorerUrl(txHash);
}
main();
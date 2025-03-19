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
import { VAULT_TOKEN_ACCOUNT, LUT_ADDRESS, MINT_ADDRESS, TO_TOKEN_ACCOUNT, PROGRAM_VAULT_ACCOUNT, PROGRAM_ID } from "./config";

/*************  ✨ Codeium Command ⭐  *************/
/**
 * Extend the lookup table with the given addresses.
 *
 * @remarks
 * This function creates the extend lookup table instruction and sends it to the network.
 * The instruction adds the given addresses to the lookup table.
 *
 * @param addresses The addresses to add to the lookup table.
 */
/******  4910608b-dd74-4e13-b4fd-485627af6151  *******/
async function main() {
    // connection
    const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

    const fromKeypair = await getKeypairFromFile();

    const feePayer: Keypair = fromKeypair;

    const addresses = [
        new PublicKey(PROGRAM_ID),
        new PublicKey(MINT_ADDRESS),
        new PublicKey(PROGRAM_VAULT_ACCOUNT),
        new PublicKey(VAULT_TOKEN_ACCOUNT),
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
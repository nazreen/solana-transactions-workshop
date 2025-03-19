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
import { AnchorProvider, Program, setProvider, web3 } from "@coral-xyz/anchor";
import IDL from "../../anchor/target/idl/mock_presale.json";
import { MockPresale } from "../../anchor/target/types/mock_presale";

import { LUT_ADDRESS} from "./config";

import dotenv from "dotenv";

dotenv.config();

/**
 * Extend the lookup table with the given addresses.
 *
 * @remarks
 * This function creates the extend lookup table instruction and sends it to the network.
 * The instruction adds the given addresses to the lookup table.
 *
 * @param addresses The addresses to add to the lookup table.
 */
async function main() {
    // connection
    const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
    const provider = AnchorProvider.env();
    setProvider(provider);
    // Load the program
    const program = new Program<MockPresale>(
        IDL,
        provider
    );

    const tokenMint = new web3.PublicKey("2kWHF9xq2ScP2aUcDLnVMQdoqCWdroBx6oGtjYrgrLwz");

    const [programStatePDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("state")],
        program.programId
      );

    const [programTokenAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from("token-vault"), tokenMint.toBuffer()],
        program.programId
    );

    const fromKeypair = await getKeypairFromFile();

    const feePayer: Keypair = fromKeypair;

    const addresses = [
        tokenMint,
        programStatePDA,
        programTokenAccount,
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
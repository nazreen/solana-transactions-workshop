import {
    clusterApiUrl,
    Connection,
    Keypair,
    PublicKey,
} from "@solana/web3.js";
import {
    mintToChecked,
} from "@solana/spl-token";
import { getKeypairFromFile } from "@solana-developers/helpers";
import { DECIMALS, MINT_ADDRESS } from "./config";
import { printExplorerUrl } from "./utils";
import { AnchorProvider, Program, setProvider, web3} from "@coral-xyz/anchor";
import IDL from "../../anchor/target/idl/mock_presale.json";
import { MockPresale } from "../../anchor/target/types/mock_presale";
import dotenv from "dotenv";

dotenv.config();

// mints to the token vault

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

    const [programTokenAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from("token-vault"), tokenMint.toBuffer()],
        program.programId
      );

    const fromKeypair = await getKeypairFromFile();

    const feePayer: Keypair = fromKeypair;

    const mintPubkey = new PublicKey(MINT_ADDRESS)

    let txhash = await mintToChecked(
        connection, // connection
        feePayer, // fee payer
        mintPubkey, // mint
        programTokenAccount, // receiver (should be a token account)
        fromKeypair.publicKey, // mint authority
        100_000_000 * 1e9, // amount. if your decimals are 9, you mint 1e9 for 1 token.
        DECIMALS, // decimals
      );
      printExplorerUrl(txhash);
}
main();
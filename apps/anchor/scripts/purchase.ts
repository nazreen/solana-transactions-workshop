import { Program, AnchorProvider, setProvider, web3, BN } from "@coral-xyz/anchor";
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token";
import { MockPresale } from "../target/types/mock_presale";
import dotenv from "dotenv";
import IDL from "../target/idl/mock_presale.json";
import { printExplorerUrl } from "./utils";

dotenv.config();

async function main() {
    // Configure provider and set it
    const provider = AnchorProvider.env();
    setProvider(provider);

    // Load the program
    const program = new Program<MockPresale>(
        IDL,
        provider
    );

    const buyer = provider.wallet.publicKey;

    // Derive the ProgramState PDA using seed "state"
    const [programStatePDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("state")],
        program.programId
    );
    console.log("Program State PDA:", programStatePDA.toString());

    // Fetch the program state account to get the token mint address
    const stateAccount = await program.account.programState.fetch(programStatePDA);
    const tokenMint = stateAccount.tokenMint as PublicKey;
    console.log("Token Mint:", tokenMint.toString());

    // Derive the token vault PDA using seed "token-vault" and token mint
    const [tokenVaultPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("token-vault"), tokenMint.toBuffer()],
        program.programId
    );
    console.log("Token Vault PDA:", tokenVaultPDA.toString());
    // Derive buyer's associated token account for the token mint
    const buyerTokenAccount = await getAssociatedTokenAddress(
        tokenMint,
        buyer
    );
    console.log("Buyer Token Account:", buyerTokenAccount.toString());

    // Define purchase amount: 0.001 SOL = 1_000_000 lamports
    const amount = new BN(1_000_000);

    console.log(`Rate is ${stateAccount.tokensToSolRate} tokens per SOL`);
    console.log("Sending purchase instruction for 0.001 SOL...");

    const tokensToReceive = stateAccount.tokensToSolRate.mul(new BN(amount)).div(new BN(LAMPORTS_PER_SOL));

    console.log(`Tokens to receive: ${tokensToReceive.toString()}`);

    const tx = await program.methods
        .purchase(amount)
        .accounts({
            programState: programStatePDA,
            tokenVault: tokenVaultPDA,
            tokenMint: tokenMint,
            buyer: buyer,
            buyerTokenAccount: buyerTokenAccount,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
            rent: web3.SYSVAR_RENT_PUBKEY,
        })
        .rpc();

    printExplorerUrl(tx);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Error during purchase:", error);
        process.exit(1);
    });
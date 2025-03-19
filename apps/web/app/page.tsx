'use client';

import { useEffect, useMemo, useState } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import {
  // WalletDisconnectButton,
  WalletModalProvider,
} from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl, LAMPORTS_PER_SOL, PublicKey, SystemProgram } from "@solana/web3.js";
import { ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import "@solana/wallet-adapter-react-ui/styles.css";
import dynamic from 'next/dynamic';
import { useAnchorWallet, useConnection, useWallet } from "@solana/wallet-adapter-react";
import { AnchorProvider, BN, Program, setProvider, web3 } from "@coral-xyz/anchor";
import idl from './mock_presale.json'
import type { MockPresale } from './mock_presale';
import { set } from "@coral-xyz/anchor/dist/cjs/utils/features";

/* TASK GUIDE 
 * Ensure you import what's necessary to set Compute Budget instructions
 */

// needed due to hydration error
const WalletMultiButtonDynamic = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false }
);

export default function Home() {
  const endpoint = clusterApiUrl("devnet");
  const wallets = useMemo(() => [], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={true}>
        <WalletModalProvider>
          <WalletMultiButtonDynamic />
          <Contents />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

enum APP_STATE {
  INITIAL,
  LOADING,
  SUCCESS,
  ERROR,
}

function Contents() {
  // Don't change anything
  const [appState, setAppState] = useState(APP_STATE.INITIAL);
  const [errorMessage, setErrorMessage] = useState("");
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const [balance, setBalance] = useState(0);
  const [txnHash, setTxnHash] = useState("");
  const [program, setProgram] = useState<Program<MockPresale>>();
  const [programStatePDA, setProgramStatePDA] = useState<string | undefined>();
  const [tokenVaultPDA, setTokenVaultPDA] = useState<string | undefined>();


  const wallet = useAnchorWallet();

  // Don't change anything here
  // Define purchase amount: 0.001 SOL = 1_000_000 lamports
  const amount = new BN(1_000_000);

  // Don't change anything here
  const txnLink = useMemo(() => {
    if (txnHash === "sending...") {
      return txnHash;
    }
    if (txnHash) {
      return `https://solscan.io/tx/${txnHash}?cluster=devnet`;
    }
  }, [txnHash]);


  // Don't change anything here
  useEffect(() => {
    if (wallet) {
      const provider = new AnchorProvider(connection, wallet, {});
      setProvider(provider);
      setProgram(new Program<MockPresale>(idl, provider));
    }

  }, [connection, wallet]);

  // Don't change anything here
  useEffect(() => {
    if (!program) return;

    (async () => {
      // Find program state PDA
      const [foundProgramStatePDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("state")],
        program.programId
      );

      // Fetch the program state account
      const stateAccount = await program.account.programState.fetch(foundProgramStatePDA);
      const tokenMint = stateAccount.tokenMint as PublicKey;

      // Find token vault PDA
      const [foundTokenVaultPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("token-vault"), tokenMint.toBuffer()],
        program.programId
      );

      setProgramStatePDA(foundProgramStatePDA.toBase58());
      setTokenVaultPDA(foundTokenVaultPDA.toBase58());
    })();
  }, [program]);


  /* TASK GUIDE 
   * Add the necessary instructions to optimise the purchase transaction
   */
  async function handleOnClick() {

    if (wallet === undefined) {
      console.error("Wallet is undefined");
      return
    }

    if (program === undefined) {
      console.error("Program is undefined");
      return
    }

    if (programStatePDA === undefined) {
      console.error("Program State PDA is undefined");
      return
    }

    setAppState(APP_STATE.LOADING);

    const stateAccount = await program.account.programState.fetch(programStatePDA);
    const tokenMint = stateAccount.tokenMint as PublicKey;

    const buyerTokenAccount = await getAssociatedTokenAddress(
      tokenMint,
      wallet.publicKey
    );

    program
      .methods
      .purchase(amount)
      .accounts({
        programState: programStatePDA,
        tokenVault: tokenVaultPDA,
        tokenMint: tokenMint,
        buyer: wallet.publicKey,
        buyerTokenAccount: buyerTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc()
      .then((txnHash) => {
        setTxnHash(txnHash);
        setAppState(APP_STATE.SUCCESS);
      })
      .catch((e) => {
        console.error(e);
        setErrorMessage(e.message);
        setAppState(APP_STATE.ERROR);
      })

  } // end of handleOnClick


  // Don't change anything here
  // get wallet balance
  useEffect(() => {
    if (!connection || !publicKey) {
      return;
    }
    if (publicKey) {
      connection.getBalance(publicKey).then((balance) => {
        setBalance(balance / LAMPORTS_PER_SOL);
      });
    }
  }, [publicKey, connection]);

  // Don't change anything here
  return (
    <div style={{ paddingTop: "1rem" }}>
      <h1 style={{ fontSize: "1.5rem" }}>Workshop: Landing Solana Transactions</h1>
      <p>Mock Presale Program Address: {program?.programId?.toBase58()}</p>
      <p>Program State PDA: {programStatePDA}</p>
      <p>Token Vault PDA: {tokenVaultPDA}</p>
      <br />
      <p>Wallet address: {publicKey?.toBase58()}</p>
      <p>Wallet Balance: {balance} SOL</p>
      <br />
      <button style={{ padding: 10 }} onClick={handleOnClick}>Call Purchase</button>
      {appState === APP_STATE.LOADING && <p>loading...</p>}
      {appState === APP_STATE.ERROR && <p style={{ color: "red" }}>{errorMessage}</p>}
      {appState === APP_STATE.SUCCESS && <p><a href={txnLink} target="_blank" rel="noopener noreferrer">{txnLink}</a></p>}
    </div>
  );
}


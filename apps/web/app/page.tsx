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
import { clusterApiUrl, ComputeBudgetProgram, LAMPORTS_PER_SOL, PublicKey, SystemProgram, TransactionInstruction } from "@solana/web3.js";
import "@solana/wallet-adapter-react-ui/styles.css";
import dynamic from 'next/dynamic';
import { useAnchorWallet, useConnection, useWallet } from "@solana/wallet-adapter-react";
import { AnchorProvider, Program, setProvider } from "@coral-xyz/anchor";
import idl from './mock_presale.json'
import type { MockPresale } from './mock_presale';
import { getSimulationComputeUnits, getTotalAccountDataSize } from "./utils";
import { getSetLoadedAccountsDataSizeLimitInstruction } from "@solana-program/compute-budget";

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
          <h1 style={{ fontSize: "1.5rem" }}>Workshop: Landing Solana Transactions</h1>
          <WalletMultiButtonDynamic />
          <Contents />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

function Contents() {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const [balance, setBalance] = useState(0);
  const [txnHash, setTxnHash] = useState("");

  const wallet = useAnchorWallet();

  const txnLink = useMemo(() => {
    if (txnHash === "sending...") {
      return txnHash;
    }
    if (txnHash) {
      return `https://solscan.io/tx/${txnHash}?cluster=devnet`;
    }
  }, [txnHash]);


  async function handleOnClick() {

    if (wallet) {
      const provider = new AnchorProvider(connection, wallet, {});
      setProvider(provider);
      const program = new Program<MockPresale>(idl, provider);
      setTxnHash("sending...");

      if (program.methods.initialize === undefined) {
        return console.error("Program not initialized");
      }

      const cuPriceIxn = ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 10_000 // TODO: show alternative by using 3rd party API
      });

      const cuLimitIxnMock = ComputeBudgetProgram.setComputeUnitLimit({
        units: 10_000
      });

      const totalAccountDataSizes = await getTotalAccountDataSize(connection, [
        SystemProgram.programId,
        ComputeBudgetProgram.programId,
        program.programId
      ])

      const setLoadedAccountsDataSizeLimitIxnV2 = getSetLoadedAccountsDataSizeLimitInstruction({
          accountDataSizeLimit: totalAccountDataSizes + 23 // why 23??
      })


      // convert into v1 instruction
      const setLoadedAccountsDataSizeLimitIxn = new TransactionInstruction({
          keys: [],
          data: Buffer.from(setLoadedAccountsDataSizeLimitIxnV2.data),
          programId: new PublicKey(setLoadedAccountsDataSizeLimitIxnV2.programAddress)
      })

      // this is used only for simulation
      const initializeTxn = await program.methods.initialize().transaction()

      const simulationCu = await getSimulationComputeUnits(connection,
        [
          // @ts-expect-error type complains because getSimulationComputeUnits expects a @solana/web3.js txn but we are passing an anchor txn, but they will work at runtime.
          initializeTxn,
          cuLimitIxnMock,
          cuPriceIxn,
          setLoadedAccountsDataSizeLimitIxn
        ],
        wallet.publicKey, []);

      if (simulationCu === null) {
        console.error("Could not get simulation compute units");
        return;
      }

      console.log({ simulationCu, totalAccountDataSizes })

      const cuLimitIxn = ComputeBudgetProgram.setComputeUnitLimit({
        units: simulationCu
      });

      program
        .methods
        .initialize()
        .preInstructions([
          cuLimitIxn,
          cuPriceIxn,
          setLoadedAccountsDataSizeLimitIxn
        ]).rpc()
        .then(setTxnHash);

    } else {
      console.log("Wallet not connected");
    }

  }


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

  return (
    <div style={{ paddingTop: "1rem" }}>
      <p>Wallet address: {publicKey?.toBase58()}</p>
      <p>Balance: {balance} SOL</p>
      <button style={{ padding: 10 }} onClick={handleOnClick}>Call Initialize</button>
      <p>{txnHash && <a href={txnLink} target="_blank" rel="noopener noreferrer">{txnLink}</a>}</p>
    </div>
  );
}


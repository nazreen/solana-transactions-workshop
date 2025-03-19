import {
  AddressLookupTableAccount,
  Commitment,
  ComputeBudgetProgram,
  Connection,
  Keypair,
  PublicKey,
  RpcResponseAndContext,
  SignatureResult,
  SignatureStatus,
  SimulatedTransactionResponse,
  Transaction,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { parse } from "path";

export const getErrorFromRPCResponse = (
  rpcResponse: RpcResponseAndContext<
    SignatureResult | SimulatedTransactionResponse
  >,
) => {
  // Note: `confirmTransaction` does not throw an error if the confirmation does not succeed,
  // but rather a `TransactionError` object. so we handle that here
  // See https://solana-labs.github.io/solana-web3.js/v1.x/classes/Connection.html#confirmTransaction.confirmTransaction-1

  const error = rpcResponse.value.err;
  if (error) {
    // Can be a string or an object (literally just {}, no further typing is provided by the library)
    // https://github.com/solana-labs/solana-web3.js/blob/4436ba5189548fc3444a9f6efb51098272926945/packages/library-legacy/src/connection.ts#L2930
    // TODO: if still occurs in web3.js 2 (unlikely), fix it.
    if (typeof error === "object") {
      const errorKeys = Object.keys(error);
      if (errorKeys.length === 1) {
        if (errorKeys[0] !== "InstructionError") {
          throw new Error(`Unknown RPC error: ${error}`);
        }
        const instructionError = error["InstructionError"];
        // An instruction error is a custom program error and looks like:
        // [
        //   1,
        //   {
        //     "Custom": 1
        //   }
        // ]
        // See also https://solana.stackexchange.com/a/931/294
        throw new Error(
          `Error in transaction: instruction index ${instructionError[0]}, custom program error ${instructionError[1]["Custom"]}`,
        );
      }
    }
    throw Error(error.toString());
  }
};

/**
 * Check if a given instruction is a SetComputeUnitLimit instruction
 * See https://github.com/solana-program/compute-budget/blob/main/clients/js/src/generated/programs/computeBudget.ts#L29
 */
function isSetComputeLimitInstruction(ix: TransactionInstruction): boolean {
  return (
    ix.programId.equals(ComputeBudgetProgram.programId) && ix.data[0] === 2 // opcode for setComputeUnitLimit is 2
  );
}




// copied from @solana-developers/helpers. not importing as it caused `Cannot resolve 'fs'` error that did not go away after resolving fs to false in next config file

// Was getSimulationUnits
// Credit https://twitter.com/stegabob, originally from
// https://x.com/stegaBOB/status/1766662289392889920
export const getSimulationComputeUnits = async (
  connection: Connection,
  instructions: Array<TransactionInstruction>,
  payer: PublicKey,
  lookupTables: Array<AddressLookupTableAccount> | [],
  commitment: Commitment = "confirmed",
): Promise<number | null> => {
  const simulationInstructions = [...instructions];

  // Replace or add compute limit instruction
  const computeLimitIndex = simulationInstructions.findIndex(
    isSetComputeLimitInstruction,
  );
  const simulationLimitIx = ComputeBudgetProgram.setComputeUnitLimit({
    units: 1_400_000,
  });

  if (computeLimitIndex >= 0) {
    simulationInstructions[computeLimitIndex] = simulationLimitIx;
  } else {
    simulationInstructions.unshift(simulationLimitIx);
  }

  const testTransaction = new VersionedTransaction(
    new TransactionMessage({
      instructions: simulationInstructions,
      payerKey: payer,
      // RecentBlockhash can by any public key during simulation
      // since 'replaceRecentBlockhash' is set to 'true' below
      recentBlockhash: PublicKey.default.toString(),
    }).compileToV0Message(lookupTables),
  );

  const rpcResponse = await connection.simulateTransaction(testTransaction, {
    replaceRecentBlockhash: true,
    sigVerify: false,
    commitment,
  });

  if (rpcResponse?.value?.err) {
    const logs = rpcResponse.value.logs?.join("\n  • ") || "No logs available";
    throw new Error(
      `Transaction simulation failed:\n  •${logs}` +
      JSON.stringify(rpcResponse?.value?.err),
    );
  }

  return rpcResponse.value.unitsConsumed || null;
};

export const getTotalAccountDataSize = async (
  connection: Connection,
  accountPublicKeys: PublicKey[],
): Promise<number> => {
  // Get all account infos in one RPC call
  const accountInfos = await connection.getMultipleAccountsInfo(accountPublicKeys);

  // Process each account and get its size
  const sizes = accountPublicKeys.map((accountPublicKey, index) => {
    const info = accountInfos[index];
    if (!info) {
      console.log(`Account: ${accountPublicKey.toBase58()} does not exist.`);
      return 0;
    }
    const address = accountPublicKey.toBase58();
    
    if (!info) {
      console.log(`Account: ${address} has no data.`);
      return 0;
    }
    
    // Simply use data length for all account types
    const size = info.data.length;
    console.log(`Account: ${address}, Data Size: ${size}`);
    return size;
  });

  // Sum up all sizes
  return sizes.reduce((sum, size) => sum + size, 0);
};

function getProgramDataAddress(programId: PublicKey): PublicKey {
  // BPFLoaderUpgradeable program ID
  const UPGRADEABLE_LOADER_ID = new PublicKey('BPFLoaderUpgradeab1e11111111111111111111111');

  // Find the PDA for the program data account
  const [programDataAddress] = PublicKey.findProgramAddressSync(
    [programId.toBuffer()],
    UPGRADEABLE_LOADER_ID
  );

  return programDataAddress;
}
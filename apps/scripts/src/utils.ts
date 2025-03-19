export const SYSTEM_PROGRAM_SIZE = 14;
export const COMPUTE_BUDGET_PROGRAM_SIZE = 22;
export const SPL_TOKEN_PROGRAM_SIZE = 134080;
export const SPL_MINT_ACCOUNT_SIZE = 82;
export const SPL_TOKEN_ACCOUNT_SIZE = 165;

export function printExplorerUrl(txnSignature: string, testnet = true) {
    console.log(`https://solscan.io/tx/${txnSignature}?cluster=${testnet ? "devnet" : "mainnet-beta"}`);
}

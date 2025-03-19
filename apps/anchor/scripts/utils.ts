export function printExplorerUrl(txnSignature: string, testnet = true) {
    console.log(`https://solscan.io/tx/${txnSignature}?cluster=${testnet ? "devnet" : "mainnet-beta"}`);
}

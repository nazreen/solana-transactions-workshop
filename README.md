# Solana Transaction Landing Optimisation

## Requirements

- NodeJs
- pnpm

If deploying your own program (not needed for workshop)
- Rust
- Solana CLI
- Anchor

Refer to https://solana.com/docs/intro/installation

## How to use this repo


### Ensure you have Phantom wallet and devnet SOL in it

If not, install Phantom wallet and get devnet SOL.
For devnet SOL, either use the official Solana faucet or using the Solana CLI, run `solana airdrop 5`.

### Ensure you have a local Solana wallet on your machine

If not, set it up: https://solana.com/docs/intro/installation#create-wallet

### Install dependencies

```bash
pnpm install
```

### Reference
Refer to examples in `apps/script` to see how Compute Budget instructions are set. Note that currently examples under `apps/script` requires you to have a keypair at the default path of `~/.config/id.json`

For your reference, you can view the anchor program in `apps/anchor`. If you're participating in the workshop, there's no need for you to deploy the program. You can use the instructor's deployed program ID.

### Apply Optimisation

Apply Compute Budget instructions into `apps/web`


## Reference: for Superteam APU Workshop

Addresses
- SPL - 2kWHF9xq2ScP2aUcDLnVMQdoqCWdroBx6oGtjYrgrLwz
- Program - Dhhuntngi4avDYGCpMeBThyA3rxTm5renL3CRoyez6Ed
- Program State - CngD7sWiZTzxZhZSVio5dN3fUXMuPRpG1qVU2XPADPEH
- Presale Token Account - 33ynJnxGca9d7BNL3nbiiP3MoKyJshKLSTFrQgCqfJ3Y
- Lookup table - 9JVQY6uF9r13uUD8C4bYepiBP98c2VRs17d45kHJ9Goo (has: Mint Account, Program Token Account, Program State Account)

## If deploying your own program

build

```bash
anchor build
```

deploy using

```
solana program deploy target/deploy/mock_presale.so
```

(using `anchor deploy` or `anchor upgrade` somehow results in a Buffer account data size error)

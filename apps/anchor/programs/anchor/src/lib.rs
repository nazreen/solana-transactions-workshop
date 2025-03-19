use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, Mint, TokenInterface, TokenAccount, TransferChecked};
use anchor_spl::associated_token::AssociatedToken;

declare_id!("Dhhuntngi4avDYGCpMeBThyA3rxTm5renL3CRoyez6Ed");

#[program]
pub mod mock_presale {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, tokens_to_sol_rate: u64, limit_per_purchase: u64) -> Result<()> {
        let program_state = &mut ctx.accounts.program_state;
        program_state.authority = ctx.accounts.authority.key();
        program_state.token_mint = ctx.accounts.token_mint.key();
        program_state.tokens_to_sol_rate = tokens_to_sol_rate;
        program_state.limit_per_purchase = limit_per_purchase;
        
        // Create vault PDA with a unique seed for the token vault
        let (vault_pda, _bump) = Pubkey::find_program_address(
            &[b"token-vault", ctx.accounts.token_mint.key().as_ref()],
            ctx.program_id,
        );
        program_state.token_vault = vault_pda;
        
        msg!("Vault initialized with rate: {} tokens per SOL and limit {} tokens per purchase", tokens_to_sol_rate, limit_per_purchase);
        Ok(())
    }
    
    pub fn set_rate(ctx: Context<SetRate>, new_rate: u64) -> Result<()> {
        let program_state = &mut ctx.accounts.program_state;
        program_state.tokens_to_sol_rate = new_rate;
        msg!("Rate updated to: {} tokens per SOL", new_rate);
        Ok(())
    }
    
    pub fn purchase(ctx: Context<Purchase>, amount: u64) -> Result<()> {
        let program_state = &ctx.accounts.program_state;
        
        // Calculate tokens to send based on rate
        let tokens_to_transfer = amount
            .checked_mul(program_state.tokens_to_sol_rate)?
            .checked_div(10u64.pow(9)) // asuming decinals is 9
            .ok_or(ProgramError::ArithmeticOverflow)?;

        // limit how many tokens can be purchased at one time
        if tokens_to_transfer > 1000 {
            return Err(ErrorCode::ExceedsMaxPurchase.into());
        }
        
        // Transfer SOL to the program_state (which is a PDA)
        let sol_transfer_ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.buyer.key(),
            &ctx.accounts.program_state.key(),
            amount,
        );
        anchor_lang::solana_program::program::invoke(
            &sol_transfer_ix,
            &[
                ctx.accounts.buyer.to_account_info(),
                ctx.accounts.program_state.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;
        
        let cpi_accounts = TransferChecked {
            mint: ctx.accounts.token_mint.to_account_info(),
            from: ctx.accounts.token_vault.to_account_info(),
            to: ctx.accounts.buyer_token_account.to_account_info(),
            authority: ctx.accounts.program_state.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_context = CpiContext::new(cpi_program, cpi_accounts);
        
        // Use the PDA seeds for program_state as the signer.
        let state_seeds: &[&[u8]] = &[&b"state"[..], &[ctx.bumps.program_state][..]];
        let signer = &[&state_seeds[..]];
        
        token_interface::transfer_checked(cpi_context.with_signer(signer), tokens_to_transfer, 9)?;
        msg!("Purchased {} tokens for {} SOL", tokens_to_transfer, amount);
        Ok(())
    }
    
    pub fn withdraw_sol(ctx: Context<WithdrawSol>, amount: u64) -> Result<()> {
        **ctx.accounts.program_state.to_account_info().try_borrow_mut_lamports()? -= amount;
        **ctx.accounts.authority.try_borrow_mut_lamports()? += amount;
        msg!("Withdrawn {} SOL", amount);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        seeds = [b"state"],
        bump,
        payer = authority,
        space = 8 + ProgramState::SIZE
    )]
    pub program_state: Account<'info, ProgramState>,
    
    pub token_mint: InterfaceAccount<'info, Mint>,

    #[account(
        init,
        payer = authority,
        seeds = [b"token-vault", token_mint.key().as_ref()],
        bump,
        token::mint = token_mint,
        token::authority = program_state,
    )]
    pub token_vault: InterfaceAccount<'info, TokenAccount>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct SetRate<'info> {
    #[account(
        mut, 
        has_one = authority,
        seeds = [b"state"],
        bump
    )]
    pub program_state: Account<'info, ProgramState>,
    
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(amount: u64)]
pub struct Purchase<'info> {
    #[account(
        mut,
        seeds = [b"state"],
        bump
    )]
    pub program_state: Account<'info, ProgramState>,
    
    #[account(
        mut,
        seeds = [b"token-vault", program_state.token_mint.as_ref()],
        bump,
        token::mint = token_mint,
        token::authority = program_state,
    )]
    pub token_vault: InterfaceAccount<'info, TokenAccount>,
    
    pub token_mint: InterfaceAccount<'info, Mint>,
    
    #[account(mut)]
    pub buyer: Signer<'info>,
    
    #[account(
        init_if_needed,
        payer = buyer,
        associated_token::mint = token_mint,
        associated_token::authority = buyer,
    )]
    pub buyer_token_account: InterfaceAccount<'info, TokenAccount>,
    
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct WithdrawSol<'info> {
    #[account(
        mut,
        has_one = authority,
        seeds = [b"state"],
        bump
    )]
    pub program_state: Account<'info, ProgramState>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[account]
pub struct ProgramState {
    pub authority: Pubkey, // 32
    pub token_mint: Pubkey, // 32
    pub token_vault: Pubkey, // 32
    pub tokens_to_sol_rate: u64, // 8
    pub limit_per_purchase: u64, // 8
}

impl ProgramState {
    pub const SIZE: usize = 32 + 32 + 32 + 8 + 8; // authority + 
}

#[error_code]
pub enum ErrorCode {
    #[msg("Insufficient SOL balance")]
    InsufficientBalance,
    #[msg("Insufficient token balance in vault")]
    InsufficientTokenBalance,
    #[msg("Cannot purchase more than 1000 tokens in a single transaction")]
    ExceedsMaxPurchase,
}
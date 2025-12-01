use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount}; 
use anchor_spl::associated_token::AssociatedToken;
use crate::states::PoolState;


#[derive(Accounts)]
pub struct InitializePool<'info> {
  #[account(
    init , 
    payer = owner ,
    space = 8 + PoolState::INIT_SPACE ,
    seeds = [b"user-pool" , owner.key().as_ref()] ,
    bump ,
  )]
  pub pool_state : Account<'info , PoolState> ,

  #[account(
    seeds = [b"vault-authority", owner.key().as_ref()],
    bump
  )]
  pub vault_authority: SystemAccount<'info>,

  #[account(
    init ,
    payer = owner,
    associated_token::mint = collateral_mint ,
    associated_token::authority = vault_authority ,
  )]  
  pub vault_ata : Account<'info , TokenAccount> ,

  #[account(mut)]
  pub owner : Signer<'info> ,

  pub collateral_mint : Account<'info,Mint> , 
  pub loan_mint : Account<'info , Mint> ,
  pub system_program: Program<'info, System>,
  pub associated_token_program: Program<'info, AssociatedToken>,
  pub token_program: Program<'info, Token>,
  
}


pub fn handler(ctx: Context<InitializePool>)->Result<()>{
    let pool = &mut ctx.accounts.pool_state ;

    pool.owner = ctx.accounts.owner.key() ;
    pool.collateral_mint = ctx.accounts.collateral_mint.key() ;
    pool.collateral_amount = 0 ;
    pool.loan_mint = ctx.accounts.loan_mint.key();
    pool.loan_amount = 0 ;
    pool.vault_ata = ctx.accounts.vault_ata.key() ;
    pool.bump = ctx.bumps.pool_state ;
    pool.interest_rate = 500 ;     // 5%
    pool.last_update_time = 0 ;
    pool.vault_authority_bump = ctx.bumps.vault_authority;
    pool.ltv = 50 ;
    msg!(" Personal pool initialized for user: {}", pool.owner);
    Ok(())
}

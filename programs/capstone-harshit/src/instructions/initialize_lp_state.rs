use anchor_lang::accounts::unchecked_account;
use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount}; 
use anchor_spl::associated_token::AssociatedToken;
use crate::states::{LiquidatorState, PoolState};

  
#[derive(Accounts)]
pub struct InitializeLpState<'info> {
  #[account(
    init , 
    payer = owner ,
    space = 8 + LiquidatorState::INIT_SPACE ,
    seeds = [b"Liquidator-state" , owner.key().as_ref()] ,
    bump ,
  )]
  pub lp_state : Account<'info , LiquidatorState> ,


  #[account(
    init_if_needed ,
    payer = owner,
    associated_token::mint = liquidity_mint ,
    associated_token::authority = owner
  )]  
  pub lp_ata : Account<'info , TokenAccount> ,

  #[account(mut)]
  pub owner : Signer<'info> ,

  pub liquidity_mint : Account<'info,Mint> , 

  pub system_program: Program<'info, System>,
  pub associated_token_program: Program<'info, AssociatedToken>,
  pub token_program: Program<'info, Token>,
}


pub fn handler(ctx: Context<InitializeLpState>)->Result<()>{
    let lp_state = &mut ctx.accounts.lp_state ;

    lp_state.owner = ctx.accounts.owner.key() ;
    lp_state.amount = 0 ;
    lp_state.liquidity_mint = ctx.accounts.liquidity_mint.key() ;
    lp_state.liquidity_amount = 0 ;
    lp_state.lp_ata = ctx.accounts.lp_ata.key() ;
    lp_state.bump = ctx.bumps.lp_state ;
    lp_state.last_update_time = 0 ;
    lp_state.deposit_time = 0 ;
    msg!(" lp state initialized for user: {}", lp_state.owner);
    Ok(())
}

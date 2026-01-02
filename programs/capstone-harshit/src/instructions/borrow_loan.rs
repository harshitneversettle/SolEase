use anchor_lang::prelude::*;
use anchor_lang::solana_program::native_token::LAMPORTS_PER_SOL;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer, accessor::amount};
use anchor_spl::associated_token::AssociatedToken;
use crate::states::{PoolState, TreasuryState};
use pyth_solana_receiver_sdk::price_update::{PriceUpdateV2};
use pyth_solana_receiver_sdk::price_update::get_feed_id_from_hex;
use pyth_sdk_solana::load_price_feed_from_account_info;
use crate::errors::ErrorCode ;




#[derive(Accounts)] 
pub struct BorrowLoan<'info>{

    #[account(constraint = owner.key() == pool_state.owner @ ErrorCode::Unauthorized)]
    pub owner : Signer<'info> ,

    #[account(
        mut,
        has_one = owner @ ErrorCode::Unauthorized,
        constraint = pool_state.collateral_amount > 0 @ ErrorCode::NotInitialized
    )]
    pub pool_state : Account<'info , PoolState> ,

    #[account(
        mut
    )]
    pub treasury_state : Account<'info , TreasuryState> ,
        
    pub loan_mint : Account<'info , Mint> ,

    #[account(mut, constraint = user_loan_ata.mint == loan_mint.key())]
    pub user_loan_ata : Account<'info , TokenAccount> ,

    #[account(mut, constraint = treasury_ata.key() == treasury_state.treasury_ata)]
    pub treasury_ata: Account<'info , TokenAccount> ,

    /// CHECK: PDA authority for treasury vault 
    #[account(
        seeds = [b"treasury-authority"] ,  
        bump = treasury_state.treasury_authority_bump 
    )]
    pub treasury_authority : UncheckedAccount<'info> ,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

pub fn handler(ctx : Context<BorrowLoan>)->Result<()>{
    let treasury = &mut ctx.accounts.treasury_state ;
    let pool = &mut ctx.accounts.pool_state ; 
    let scale: u128 = 1_000_000_000;
    let ltv = pool.ltv as u64 ;
    let curr_price = 142000000  ;   // usdc/sol;
    let collateral_amount = pool.collateral_amount as u128 ;   // already in base units 
    //let collateral_ratio = (collateral_amount).checked_div((curr_price as u128)).expect("division error or overflow");
    let num  = collateral_amount.checked_mul(ltv as u128).ok_or(ErrorCode::MathOverflow)? ;
    let deno = (curr_price as u128).checked_mul(100u128).ok_or(ErrorCode::MathOverflow)? ;
    let num_base = num.checked_mul(scale).ok_or(ErrorCode::MathOverflow)?;
    let max_borrow = num_base.checked_div(deno).ok_or(ErrorCode::MathOverflow)? ;
    let amount: u64 = max_borrow as u64;

    let bump = treasury.treasury_authority_bump;
    let seeds: &[&[u8]] = &[b"treasury-authority", &[bump]];
    let signer_seeds = &[&seeds[..]];
    let transfer_accounts = Transfer{
        from : ctx.accounts.treasury_ata.to_account_info() ,
        to : ctx.accounts.user_loan_ata.to_account_info() ,
        authority : ctx.accounts.treasury_authority.to_account_info()
    } ;

    let cpi_context = CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), transfer_accounts, signer_seeds) ;
    token::transfer(cpi_context, amount)?;
    pool.loan_amount += amount as u64 ; 
    pool.last_update_time = Clock::get()?.unix_timestamp;
    pool.borrow_amount = amount as u64 ;
    pool.borrow_time = Clock::get()?.unix_timestamp ; 
    treasury.total_borrowed += amount as u64 ;
    let threshold_limit = 25 ;  // 25 % is setted as threshold 
    let curr_capacity = (treasury.total_liquidity.checked_sub(treasury.total_borrowed)).expect("overflow").checked_mul(100).expect("overflow").checked_div(treasury.total_liquidity).expect("div by zero or overflow") ;
    if curr_capacity >= threshold_limit {
        treasury.interest_rate = 500 ;
    }else {
        treasury.interest_rate = 2500 ;
    }
    msg!("Borrowed {} at timestamp {}", amount, Clock::get()?.unix_timestamp);
    Ok(())

}
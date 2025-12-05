use anchor_lang::prelude::*;
use anchor_lang::solana_program::native_token::LAMPORTS_PER_SOL;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
use anchor_spl::associated_token::AssociatedToken;
use crate::states::{LiquidatorState, PoolState, TreasuryState};

#[derive(Accounts)]

pub struct LiquidityWithdraw<'info>{

    #[account(
        mut,
        seeds = [b"treasury"],
        bump = treasury_state.bump,
    )]
    pub treasury_state : Account<'info , TreasuryState> ,

    #[account(mut)]
    pub lp_state : Account<'info , LiquidatorState> ,

    #[account(
        mut ,
        constraint = lp_ata.owner == owner.key() , 
    )]
    pub lp_ata: Account<'info, TokenAccount>,


    #[account(mut)]
    pub owner : Signer<'info> ,


    #[account(
        mut ,
        seeds = [b"treasury-authority"],
        bump = lp_state.treasury_authority_bump 
    )] 
    /// CHECK: PDA authority, no data stored
    pub treasury_authority: UncheckedAccount<'info>,
    
    #[account(
        mut ,
        constraint = treasury_ata.key() == treasury_state.treasury_ata ,
    )]
    pub treasury_ata: Account<'info , TokenAccount> ,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

pub fn handler(ctx : Context<LiquidityWithdraw> , amount_deposited : u64 )->Result<()>{
    let treasury = &mut ctx.accounts.treasury_state ;
    let lp = &mut ctx.accounts.lp_state ;

    let owner = lp.owner ;
    let lp_ata = lp.lp_ata ;
    let liquidity_mint = lp.liquidity_mint ;
    let amount = amount_deposited ;
    let deposit_time = lp.deposit_time ;
    let last_update_time = lp.last_update_time ;
    let bump = lp.treasury_authority_bump ; 
    let signer_seeds: &[&[&[u8]]] = &[&[
        b"treasury-authority",
        &[bump],
    ]];

    let transfer_accounts = Transfer{
        from : ctx.accounts.treasury_ata.to_account_info() ,
        to : ctx.accounts.lp_ata.to_account_info() ,
        authority : ctx.accounts.treasury_authority.to_account_info() 
    } ;

    let cpi_context = CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), transfer_accounts , signer_seeds) ; 
    token::transfer(cpi_context, amount)?;

    lp.liquidity_amount = lp.liquidity_amount.checked_sub(amount).expect("Overflow");
    treasury.total_liquidity = treasury.total_liquidity.checked_sub(amount).expect("Overflow") ;
    lp.last_update_time = Clock::get()?.unix_timestamp;


    Ok(())


}

pub fn calculate_interest(amount_borrowed : u64 , interest : u64 , current_time : i64 , time_borrowed : i64 )->Result<u64>{

    let duration_loan = (current_time.checked_sub(time_borrowed).expect("error")) as u64 ;
    let principal = amount_borrowed as u128;
    let rate = interest as u128;
    let duration = duration_loan as u128;
    const SECONDS_PER_YEAR: u64 = 31_536_000;
    
    let amount_after_interest = principal
        .checked_mul(rate)
        .expect("mul overflow")
        .checked_mul(duration)
        .expect("mul overflow")
        .checked_div(SECONDS_PER_YEAR as u128)
        .expect("div overflow");


   
    Ok(amount_after_interest as u64) 
}
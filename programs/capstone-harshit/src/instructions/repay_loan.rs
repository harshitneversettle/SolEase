use anchor_lang::prelude::*;
use anchor_lang::solana_program::native_token::LAMPORTS_PER_SOL;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use anchor_spl::associated_token::AssociatedToken;
use crate::states::{PoolState, TreasuryState};




#[derive(Accounts)]

pub struct RepayLoan<'info>{

    #[account(mut)]
    pub treasury_state : Account<'info , TreasuryState> ,

    #[account(
        mut , 
        constraint = pool_state.owner == owner.key() ,
    )]
    pub pool_state : Account<'info , PoolState> ,

    #[account(mut)]
    pub owner : Signer<'info> ,

    #[account(
        mut ,
        constraint = user_ata.owner == owner.key(),
    )]
    pub user_ata: Account<'info, TokenAccount>,


    #[account(
        mut ,
        constraint = treasury_ata.key() == treasury_state.treasury_ata ,
    )]
    pub treasury_ata: Account<'info , TokenAccount> ,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

pub fn handler(ctx : Context<RepayLoan>)->Result<()>{
    let treasury = &mut ctx.accounts.treasury_state ;
    let pool = &mut ctx.accounts.pool_state ;

    let amount_borrowed = pool.borrow_amount ;
    let time_borrowed = pool.borrow_time ;
    let interest = pool.interest_rate ;
    let collateral_amount = pool.collateral_amount ;
    let treasury_ata = treasury.treasury_ata ;
    let total_liquidity_treasury = treasury.total_liquidity ;
    let total_borrowed_treasury = treasury.total_borrowed ;
    let liquidity_mint = treasury.liquidity_mint ;
    let current_time = Clock::get()?.unix_timestamp ;

    

    let interest_amount = calculate_interest(amount_borrowed , interest , current_time , time_borrowed)?;

    let total_pay = amount_borrowed + interest_amount ;

    let transfer_accounts = Transfer{
        from : ctx.accounts.user_ata.to_account_info() ,
        to : ctx.accounts.treasury_ata.to_account_info() ,
        authority: ctx.accounts.owner.to_account_info() 
    } ;

    let cpi_context = CpiContext::new(ctx.accounts.token_program.to_account_info(), transfer_accounts) ;
    token::transfer(cpi_context, total_pay )?;

    pool.loan_amount = 0 ;
    pool.borrow_amount = 0 ;
    pool.borrow_time = 0 ;
    treasury.total_liquidity += total_pay ;
    treasury.total_borrowed -= amount_borrowed ;
    msg!("Loan repaid successfully!");
    Ok(()) 

}

pub fn calculate_interest(amount_borrowed : u64 , interest : u64 , current_time : i64 , time_borrowed : i64 )->Result<u64>{

    let duration_loan = (current_time - time_borrowed) as u64 ;
    let principal = amount_borrowed as u128;
    let rate = interest as u128;
    let duration = duration_loan as u128;
    const SECONDS_PER_YEAR: u64 = 31_536_000;
    
let amount_after_interest = (principal * rate * duration) / (SECONDS_PER_YEAR as u128);
    Ok(amount_after_interest as u64) 
}
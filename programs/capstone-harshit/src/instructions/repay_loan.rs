use anchor_lang::prelude::*;
use anchor_lang::solana_program::native_token::LAMPORTS_PER_SOL;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
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
        constraint = user_loan_ata.owner == owner.key(),
    )]
    pub user_loan_ata: Account<'info, TokenAccount>,

    

    #[account(
        mut ,
        seeds = [b"vault-authority", owner.key().as_ref()],
        bump = pool_state.vault_authority_bump 
    )]
    /// CHECK: PDA authority, no data stored
    pub vault_authority: UncheckedAccount<'info>,

    #[account(mut)]
    pub collateral_mint : Account<'info , Mint> ,

    #[account(
        mut ,
        associated_token::mint = collateral_mint,
        associated_token::authority = vault_authority,
    )]
    pub vault_ata: Account<'info, TokenAccount>,


    #[account(
        mut ,
        constraint = user_collateral_ata.owner == owner.key(),
    )]
    pub user_collateral_ata: Account<'info, TokenAccount>,

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
    let interest = treasury.interest_rate ;
    let collateral_amount = pool.collateral_amount ;
    let treasury_ata = treasury.treasury_ata ;
    let total_liquidity_treasury = treasury.total_liquidity ;
    let total_borrowed_treasury = treasury.total_borrowed ;
    let liquidity_mint = treasury.liquidity_mint ;
    let current_time = Clock::get()?.unix_timestamp ;

    let interest_amount = calculate_interest(amount_borrowed , interest , current_time , time_borrowed)?;

    let total_pay = amount_borrowed.checked_add(interest_amount).expect("overflow") ;

    let transfer_accounts = Transfer{
        from : ctx.accounts.user_loan_ata.to_account_info() ,
        to : ctx.accounts.treasury_ata.to_account_info() ,
        authority: ctx.accounts.owner.to_account_info() 
    } ;

    let cpi_context = CpiContext::new(ctx.accounts.token_program.to_account_info(), transfer_accounts) ;
    token::transfer(cpi_context, total_pay )?;

    pool.loan_amount = 0 ;
    pool.borrow_amount = 0 ;
    pool.borrow_time = 0 ;
    treasury.total_borrowed = treasury.total_borrowed.checked_sub(amount_borrowed).expect("overflow") ;
    treasury.total_liquidity =  treasury.total_liquidity.checked_add(interest_amount).expect("overflow") ; 
    treasury.total_interest_gained += interest_amount as u128 ;
    msg!("Loan repaid successfully!");

    // after confirmation of the repay , the collateral should also transferred from the vault_ATA to the uses_ATA ;\
    // take conformation from the pool state , ki the loan_amount == 0 

    
    let curr_loan = pool.loan_amount ;
    if curr_loan != 0 {
        msg!("the loan is not repaid yet , pay it ") ;
    }else {
        let collateral_amount = pool.collateral_amount ;
        let vault_ata = pool.vault_ata ;
        let amount = collateral_amount ;
        let owner = ctx.accounts.owner.key();
        let bump = pool.vault_authority_bump; 
        let signer_seeds: &[&[&[u8]]] = &[&[
            b"vault-authority",
            owner.as_ref(),
            &[bump],
        ]];

        let transfer_accounts2 = Transfer{
            from : ctx.accounts.vault_ata.to_account_info() ,
            to : ctx.accounts.user_collateral_ata.to_account_info() ,
            authority : ctx.accounts.vault_authority.to_account_info() 
        } ;

        let cpi_context = CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), transfer_accounts2 , signer_seeds) ;
        token::transfer(cpi_context, amount)?;
        pool.collateral_amount = 0 ;
        
        
    }
    let threshold_limit = 25 ;  // 25 % is setted as threshold 
    let curr_capacity = treasury
        .total_liquidity
        .checked_sub(treasury.total_borrowed)
        .expect("underflow")
        .checked_mul(100)
        .expect("mul overflow")
        .checked_div(treasury.total_liquidity)
        .expect("div by zero");
        if curr_capacity >= threshold_limit {
            treasury.interest_rate = 500 ;
        } else {
            treasury.interest_rate = 2500 ;
        }

    
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
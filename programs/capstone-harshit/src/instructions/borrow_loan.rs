    use anchor_lang::prelude::*;
    use anchor_lang::solana_program::native_token::LAMPORTS_PER_SOL;
    use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer, accessor::amount};
    use anchor_spl::associated_token::AssociatedToken;
    use crate::states::{PoolState, TreasuryState};
    use pyth_solana_receiver_sdk::price_update::{PriceUpdateV2};
    use pyth_solana_receiver_sdk::price_update::get_feed_id_from_hex;
use pyth_sdk_solana::load_price_feed_from_account_info;




    #[derive(Accounts)] 
    pub struct BorrowLoan<'info>{

        #[account(mut)]
        pub pool_state : Account<'info , PoolState> ,

        #[account(mut)]
        pub treasury_state : Account<'info , TreasuryState> ,
        
        pub loan_mint : Account<'info , Mint> ,

        #[account(mut)] 
        pub user_loan_ata : Account<'info , TokenAccount> ,

        pub owner : Signer<'info> ,

        #[account(mut)]
        pub treasury_ata: Account<'info , TokenAccount> ,

        /// CHECK: PDA authority for treasury vault 
        #[account(
            seeds = [b"treasury"] ,  
            bump = treasury_state.bump
        )]
        pub treasury_authority : UncheckedAccount<'info> ,

        pub token_program: Program<'info, Token>,
        pub system_program: Program<'info, System>,
        pub associated_token_program: Program<'info, AssociatedToken>,
    }


    pub fn handler(ctx : Context<BorrowLoan>)->Result<()>{
        let treasury = &mut ctx.accounts.treasury_state ;
        let pool = &mut ctx.accounts.pool_state ; 

        let ltv = pool.ltv as u64 ;
        let curr_price = 142000000  ;   // of sol/usdc ;
        let collateral_amount = pool.collateral_amount.checked_mul(1000000).expect("overflow")  ;   // in lamports 
        let collateral_ratio = ((collateral_amount as u128).checked_mul(1_000_000_000_u128).expect("mul overflow")).checked_div((curr_price as u128)).expect("division error or overflow");
        let max_borrow = collateral_ratio
            .checked_mul(ltv as u128)
            .expect("overflow in mul")
            .checked_div(100)
            .expect("overflow or div by zero")
            as u64;
    
        let amount: u64 = max_borrow as u64;

        let bump = treasury.bump;
        let seeds: &[&[u8]] = &[b"treasury", &[bump]];
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
        } else {
            treasury.interest_rate = 2500 ;
        }
        msg!("Borrowed {} at timestamp {}", amount, Clock::get()?.unix_timestamp);
        Ok(())

    }
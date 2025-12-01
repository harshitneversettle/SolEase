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
        pub user_ata : Account<'info , TokenAccount> ,

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
        let collateral_amount = pool.collateral_amount * 1000000  ;   // in lamports 
        let collateral_ratio = ((collateral_amount as u128) * 1_000_000_000_u128) / (curr_price as u128);
        let max_borrow = ((collateral_ratio * (ltv as u128)) / 100) as u64; 

        
        let amount: u64 = max_borrow as u64;

        let bump = treasury.bump;
        let seeds: &[&[u8]] = &[b"treasury", &[bump]];
        let signer_seeds = &[&seeds[..]];

        let transfer_accounts = Transfer{
            from : ctx.accounts.treasury_ata.to_account_info() ,
            to : ctx.accounts.user_ata.to_account_info() ,
            authority : ctx.accounts.treasury_authority.to_account_info()
        } ;

        let cpi_context = CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), transfer_accounts, signer_seeds) ;

        token::transfer(cpi_context, amount)?;

        treasury.total_liquidity -= amount as u64;
        treasury.total_borrowed += amount as u64 ;
        pool.loan_amount += amount as u64 ; 
        pool.last_update_time = Clock::get()?.unix_timestamp;
        pool.borrow_amount = amount as u64 ;
        pool.borrow_time = Clock::get()?.unix_timestamp ; 
        msg!("Borrowed {} at timestamp {}", amount, Clock::get()?.unix_timestamp);
        Ok(())

    }
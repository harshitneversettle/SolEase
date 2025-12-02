use anchor_lang::{context, prelude::*};
use anchor_spl::{
    token::{Mint, TokenAccount, Token},
    associated_token::AssociatedToken,
};

use crate::states::TreasuryState;

#[derive(Accounts)]

pub struct InitializeTreasury<'info> {

    #[account(
        init ,    // only one time it will be initialized on chain 
        payer = admin ,    // admin -> me , the developer 
        space = 8 + TreasuryState::INIT_SPACE ,
        seeds = [b"treasury"] ,      // owner.key().as_ref() nahi chalega because i only need one treasury for all , i.e. globally 
        bump ,
    )]
    pub treasury_state : Account<'info , TreasuryState> ,

    #[account(mut)]
    pub admin : Signer<'info> ,     // pub key of the developer , as this is initialized only 


    #[account(
        init,
        payer = admin,
        token::mint = liquidity_mint,
        token::authority = treasury_state
    )]
    pub treasury_vault : Account<'info , TokenAccount> ,     // ATA for treasurypda 

    /// CHECK: WSOL native mint (do NOT deserialize as Mint!)
    pub liquidity_mint: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Program<'info, Token>,
}
    

pub fn handler(ctx : Context<InitializeTreasury>)->Result<()>{
    let treasury = &mut ctx.accounts.treasury_state ;

    treasury.liquidity_mint = ctx.accounts.liquidity_mint.key() ;
    treasury.total_liquidity = 0 ;
    treasury.total_borrowed = 0 ;
    treasury.royality_rate = 500 ;     // 5% of the the amount liquidated 
    treasury.treasury_ata = ctx.accounts.treasury_vault.key() ;    // treasury kaha saara fund store karega 
    treasury.bump = ctx.bumps.treasury_state ;
    treasury.interest_rate = 0 ;
    treasury.total_interest_gained = 0 ;

    msg!("Treasury initialized successfully ");
    Ok(())
}
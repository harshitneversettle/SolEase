use anchor_lang::prelude::*;


#[error_code]
pub enum ErrorCode {
    #[msg("Insufficient funds")]
    InsufficientFunds,
    
    #[msg("Liquidity pool is empty")]
    LiquidityEmpty,

    
    #[msg("You must pay your existing loan first before borrowing again.")]
    PayLoanFirst, 
}

use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Unauthorized access")]
    Unauthorized,
    #[msg("Invalid price feed")]
    InvalidPrice,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Insufficient liquidity")]
    InsufficientLiquidity,
    #[msg("Invalid mint")]
    InvalidMint,
    #[msg("Account not initialized")]
    NotInitialized, 
    #[msg("Invalid pyth data")]
    InvalidPriceFeed,
    #[msg("Stale Price")]
    StalePrice,
    #[msg("Borrow amount would exceed collateral-backed limit")]
    BorrowLimitExceeded,
    #[msg("No remaining borrow capacity available")]
    NoBorrowCapacity,
}

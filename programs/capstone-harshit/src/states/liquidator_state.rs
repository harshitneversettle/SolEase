use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]

pub struct LiquidatorState{
    pub owner : Pubkey ,   
    pub lp_ata : Pubkey ,
    pub liquidity_mint : Pubkey ,
    pub amount : u64 ,
    pub liquidity_amount : u64 ,
    pub deposit_time : i64 ,
    pub last_update_time : i64 ,
    pub bump : u8 ,
}   
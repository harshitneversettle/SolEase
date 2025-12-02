use anchor_lang::prelude::*;

declare_id!("CjPe2KvPS1zrjudwdtWbUN9bxYnKaz96g9QiqSd8zPed");

pub mod instructions;
pub mod states;

use instructions::*;

#[program]
pub mod capstone_harshit {
    use anchor_lang::context;

    use super::*;

    pub fn initialize_liquidator_state(ctx: Context<InitializeLpState>) -> Result<()> {
        instructions::initialize_lp_state::handler(ctx)
    }  

    pub fn initialize_treasury(ctx: Context<InitializeTreasury>) -> Result<()> {
        instructions::initialize_treasury::handler(ctx)
    }  

    pub fn deposit_treasury(ctx: Context<UserDeposit>, amount: u64) -> Result<()> {
        instructions::user_treasury::handler(ctx, amount)
    }

    pub fn initialize_pool(ctx: Context<InitializePool>) -> Result<()> {
        instructions::initialize_pool::handler(ctx)
    }

    pub fn deposit_collateral(ctx: Context<DepositCollateral>, amount: u64) -> Result<()> {
        instructions::deposit_collateral::handler(ctx, amount)
    }

    pub fn borrow_loan(ctx : Context<BorrowLoan>)->Result<()>{
        instructions::borrow_loan::handler(ctx)
    }

    pub fn repay_loan(ctx : Context<RepayLoan>)->Result<()>{
        instructions::repay_loan::handler(ctx)
    }
}


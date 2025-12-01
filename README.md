# Decentralized Lend and Borrow System

A secure, transparent, and user-friendly decentralized finance (DeFi) protocol built on the Solana blockchain for seamless lending and borrowing of digital assets.

---

## Project Documentation & Diagrams

The following documents and diagrams were **created specifically for this project** to support its design, planning, and implementation:

* SRS Document :
  [https://drive.google.com/file/d/1xaPzXe70YgVkHRmb8qAa3M_LEVi3Chnu/view?usp=sharing](https://drive.google.com/file/d/1xaPzXe70YgVkHRmb8qAa3M_LEVi3Chnu/view?usp=sharing)
* Diagrams & Architecture :[https://excalidraw.com/#json=v0vRE3XmlTIUKHpM3PTWY,B6AK6g6iPVOS5lKNkk4FFQ](https://excalidraw.com/#json=v0vRE3XmlTIUKHpM3PTWY,B6AK6g6iPVOS5lKNkk4FFQ)

---

## Overview

The Decentralized Lend and Borrow System allows users to lend their crypto assets to earn interest or borrow liquidity by providing collateral, all without traditional financial intermediaries. The system leverages Solana's high-speed and low-cost infrastructure along with smart contracts built using the Anchor framework to ensure automation, transparency, and security.

Users interact with the platform through an intuitive web interface connected to their wallets, allowing them to manage deposits, loans, and repayments efficiently.

---


## Instructions 
<details>
<summary>Initialize Treasury</summary>


Basically, the protocol maintains one main treasury that acts as a shared liquidity pool for the whole system.  
Liquidity providers (liquidators) deposit their funds into this treasury, and the protocol uses this pooled liquidity to fund loans for borrowers.

In return, the liquidators earn royalty / interest on their provided amount.  
This is calculated based on how much they deposit and how long their funds remain locked in the treasury.

So, the larger the deposit and the longer the duration, the higher the returns they receive.


<img width="1093" height="206" alt="image" src="https://github.com/user-attachments/assets/8e391121-a9b9-4b20-9190-620a28cdca91" />


</details>

<details>
<summary>User Treasury</summary>
The liquidators (users) will provide liquidity to the treasury, and a PDA will be derived using the seeds: user_pubkey + "treasury".  
This ensures that each user has only one unique PDA per treasury.

This PDA will act as the user’s liquidation record and will store all relevant information, such as which token is being used, the amount deposited, the timestamp of the deposit, and the destination account where the liquidity is stored (in this cse it is treasury_ATA) .  

This structure guarantees organized tracking, prevents duplicate entries, and maintains a secure and transparent record of each user’s contribution to the treasury.

<img width="1036" height="360" alt="image" src="https://github.com/user-attachments/assets/4b6bbd0b-8692-43f2-9a70-d4cb37933c6d" />


</details>


<details>
<summary>Initialize pool</summary>
This instruction is basically responsible for setting up all the core information related to a user’s loan. It defines who is taking the loan and creates a personal pool for them using a PDA derived from the user’s public key, which ensures that each user can only have one pool.

This pool holds all the important loan details, such as the token being used as collateral, the token being borrowed, how much collateral the user has deposited, and how much loan they are eligible to receive (which will be calculated based on that collateral). It also stores the vault ATA where the collateral is kept, along with the bump value so the PDA can always be safely re-derived.

Overall, this instruction just sets up the foundation for the user’s loan , keeping everything linked and organised so future actions like borrowing, repayment, or liquidation can work smoothly.


<img width="1136" height="428" alt="image" src="https://github.com/user-attachments/assets/df7e0768-8ded-4f09-bf52-735eb404e60f" />

</details>


<details>
<summary>Deposit collateral</summary>
This instruction is triggered when a user wants to deposit collateral for their loan. It first makes sure everything is correct (right mint, correct pool, proper accounts), and then moves the tokens from the user’s token account to the vault token account that belongs to the pool (user_ata -> vault_ata).

The transfer is authorised by the user and done through a CPI call to the token program, so the protocol itself never directly touches the user’s funds. Once the transfer is successful, the amount is added to the pool’s collateral_amount (i.e. the pool state is updated ) , and the tokens stay locked inside the vault ATA as the user’s collateral.

This instruction takes care of safely moving the user’s tokens into the vault and updating the pool state to reflect the new collateral balance.


<img width="1140" height="374" alt="image" src="https://github.com/user-attachments/assets/bafc9486-d718-4b37-9ee8-bb4d572ccbae" />

</details>

<details>
<summary>Borrow loan</summary>
This instruction is called right after the user has deposited their collateral. At this stage, the protocol calculates how much loan the user is eligible to receive based on the collateral they’ve provided. Once the amount is determined, the funds are transferred from the treasury’s token account to the user’s token account (treasury_ata -> user_ata) .

The transfer is authorised by the treasury PDA, which signs the transaction using its seeds, ensuring that only the protocol can move funds out of the treasury. This is done through a CPI call to the token program, so the process remains secure and fully controlled by the on-chain logic.

After the transfer is completed, the treasury state is updated by reducing the total available liquidity and increasing the total borrowed amount. This keeps the treasury’s accounting in sync with the active loans. accordingly the Pool State is also updated .


<img width="1174" height="350" alt="image" src="https://github.com/user-attachments/assets/9a859393-95c8-4f1b-a8bf-d8ebc14855bb" />

</details>

<details>
<summary>Repay loan</summary>
This instruction is called when the user repays their loan after the borrowing period. At this stage, the protocol calculates accrued interest based on borrow_amount, interest_rate, and time elapsed (current_time - borrow_time) using the simple interest formula. Funds are transferred from user's token account (user_ata) to treasury's token account (treasury_ata) via CPI to token program, authorized by the user signer.

After transfer completion, pool state clears loan_amount, borrow_amount, and borrow_time to zero, while treasury state increases total_liquidity by principal + interest and decreases total_borrowed by principal amount. This maintains accurate protocol accounting and releases the user's collateral lock.

<img width="1495" height="437" alt="image" src="https://github.com/user-attachments/assets/7b2e7a93-0eb9-44b4-9fbb-59d51ba4168f" />


</details>




## Key Features

* Trustless lending and borrowing
* Collateral-backed loan mechanism
* Simple interest calculation (current implementation)
* Secure PDA-based account architecture
* Real-time wallet connectivity
* Modular and scalable design

---

## System Architecture

### On-Chain Program

Developed using Rust and the Anchor framework, the on-chain program manages all critical protocol logic, including:

* Treasury initialization and configuration
* Liquidity deposits and withdrawals
* Borrowing and loan lifecycle management
* Interest computation (simple model for now)
* Repayment and liquidation handling

Program Derived Addresses (PDAs) are used to guarantee secure and deterministic state management across the protocol.

### Off-Chain Interface

The front-end interface is built with React and TypeScript, providing smooth interaction with the blockchain via:

* @solana/web3.js
* Anchor client libraries
* Solana Wallet Adapter

Supported wallets include Phantom, Solflare, and Backpack, ensuring accessibility for a wide range of users.

---

## User Roles

| Role               | Responsibility                         |
| ------------------ | -------------------------------------- |
| Liquidity Provider | Supplies tokens and earns interest     |
| Borrower           | Provides collateral to borrow assets   |
| Protocol Admin     | Manages treasury and system parameters |
| Liquidator         | Handles liquidation of risky positions |
| Auditor            | Reviews protocol operations and logic  |

---

## Technology Stack

* Blockchain: Solana (Devnet and Mainnet)
* Smart Contracts: Rust + Anchor
* Frontend: React + TypeScript
* Wallets: Phantom, Solflare, Backpack
* Oracles: Pyth / Switchboard (Optional)
* Development Tools: Solana CLI, Anchor CLI, GitHub Actions

---

## Installation and Setup

### Prerequisites

* Node.js
* Solana CLI
* Anchor Framework
* Solana-compatible wallet (Phantom recommended)

### Steps

```bash
# Clone the repository
git clone <repository-url>

# Install dependencies
npm install

# Build the Solana program
anchor build

# Deploy to Devnet
anchor deploy

# Run the frontend application
npm start
```

---

## Usage Flow

1. Connect your wallet
2. Deposit tokens as liquidity or lock collateral
3. Borrow assets within allowed LTV ratio
4. Repay borrowed funds with interest
5. Withdraw funds at any time

---

## Security Measures

* PDA and signer validation
* Ownership and access verification
* Rent-exempt account enforcement
* Oracle-based price validation
* SPL Token standard compliance

---

## Future Enhancements

* Implementation of compound interest algorithms
* Advanced risk assessment model
* DAO-based governance integration
* Real-time analytics dashboard
* Automated liquidation bots

---

## Version

Current Version: 1.0

---

## Author

Harshit Yadav

---

## License

This project is developed strictly for academic and research purposes under institutional guidelines.

---

For issues, suggestions, or contributions, feel free to open an issue or submit a pull request. Your feedback is always welcome.



this is the comlete readmne , structrue it such that it will become eye catching , dnt use emojis , just work of art , made it humanize 

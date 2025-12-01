import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { CapstoneHarshit } from "../target/types/capstone_harshit";
import {
  PublicKey,
  SystemProgram,
  Keypair,
  Transaction,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  PriceServiceConnection,
} from "@pythnetwork/pyth-evm-js";


import {
  createMint,
  getAccount,
  getOrCreateAssociatedTokenAccount,
  getAssociatedTokenAddressSync,
  createSyncNativeInstruction,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  mintTo,
} from "@solana/spl-token";

import fs from "fs";

// keypairs loaded here
const HARSHIT_KEYPAIR = Keypair.fromSecretKey(
  Uint8Array.from(
    JSON.parse(
      fs.readFileSync(
        "/home/titan/Desktop/capstone-harshit/harshit.json",
        "utf8",
      ),
    ),
  ),
);

const TEST_KEYPAIR = Keypair.fromSecretKey(
  Uint8Array.from(
    JSON.parse(
      fs.readFileSync("/home/titan/Desktop/capstone-harshit/Test.json", "utf8"),
    ),
  ),
);

console.log("Loaded Harshit wallet:", HARSHIT_KEYPAIR.publicKey.toBase58());
console.log("Loaded Test wallet:", TEST_KEYPAIR.publicKey.toBase58());

// test begins here

describe("LFG!!", () => {
  const connection = new anchor.web3.Connection(
    "http://127.0.0.1:8899",
    "confirmed",
  );

  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(HARSHIT_KEYPAIR),
    {},
  );
  anchor.setProvider(provider);
  const program = anchor.workspace.CapstoneHarshit as Program<CapstoneHarshit>;
  before(async () => {
    await connection.confirmTransaction(
      await connection.requestAirdrop(
        HARSHIT_KEYPAIR.publicKey,
        100 * LAMPORTS_PER_SOL,
      ),
    );

    await connection.confirmTransaction(
      await connection.requestAirdrop(
        TEST_KEYPAIR.publicKey,
        100 * LAMPORTS_PER_SOL,
      ),
    );
  });

  let liquidityMint: PublicKey;
  let treasuryStatePda: PublicKey;
  let treasuryVaultAta: PublicKey;
  let treasuryBump: number;

  // initialization of the treasury
  it("Initializing treasury -> ", async () => {
    [treasuryStatePda, treasuryBump] = PublicKey.findProgramAddressSync(
      // only findProgramAddress is a async function , toh we are using findProgramAddressSync
      [Buffer.from("treasury")], // seed
      program.programId,
    );

    console.log("Treasury PDA:", treasuryStatePda.toBase58());

    // WSOL Mint
    liquidityMint = new PublicKey( // mint address of the wsol
      "So11111111111111111111111111111111111111112",
    );

    // Create Treasury Vault ATA
    const treasuryVaultKeypair = Keypair.generate();
    treasuryVaultAta = treasuryVaultKeypair.publicKey;

    console.log("Treasury vault pubkey:", treasuryVaultAta.toBase58());

    // Initialize Treasury On-Chain
    await program.methods
      .initializeTreasury()
      .accounts({
        treasuryState: treasuryStatePda,
        admin: HARSHIT_KEYPAIR.publicKey,
        treasuryVault: treasuryVaultAta,
        liquidityMint,
        systemProgram: SystemProgram.programId,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([HARSHIT_KEYPAIR, treasuryVaultKeypair])
      .rpc();

    console.log("Treasury initialized successfully.");

    console.log("Liquidity Mint:", liquidityMint.toBase58());
    console.log("Treasury Vault ATA:", treasuryVaultAta.toBase58());
    console.log(
      "----------------------------------------------------------------------------------------",
    );
  });

  it("Liquidator adding liquidity ", async () => {
    [treasuryStatePda, treasuryBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("treasury")], // seed
      program.programId,
    );
    const amount = 10;
    const liquidityMint = new PublicKey(
      "So11111111111111111111111111111111111111112",
    );

    try {
      const treasury =
        await program.account.treasuryState.fetch(treasuryStatePda);
      treasuryVaultAta = treasury.treasuryAta;
    } catch (e) {
      throw new Error("Treasury not initialized");
    }
    console.log("-------------------------------------------------");
    console.log(`Depositing ${amount} SOL from test wallet to Treasury`);
    console.log("-------------------------------------------------");

    // Create/Fetch User’s WSOL ATA
    const userATA = await getOrCreateAssociatedTokenAccount(
      connection,
      TEST_KEYPAIR,
      liquidityMint,
      TEST_KEYPAIR.publicKey,
      true,
    );

    const testATA = userATA.address;

    const beforeBalance = (await getAccount(connection, testATA)).amount;
    console.log(
      "User WSOL balance before wrapping:",
      Number(beforeBalance) / 1e9,
    );

    //Send SOL → ATA
    const ix1 = SystemProgram.transfer({
      fromPubkey: TEST_KEYPAIR.publicKey,
      toPubkey: testATA,
      lamports: amount * LAMPORTS_PER_SOL,
    });

    //wrap WSOL (wrap)
    const ix2 = createSyncNativeInstruction(testATA); // sync is very imp

    const tx = new Transaction().add(ix1, ix2);
    await sendAndConfirmTransaction(connection, tx, [TEST_KEYPAIR]);

    console.log(`Successfully wrapped ${amount} SOL into WSOL`);

    const balanceAfterWrap = (await getAccount(connection, testATA)).amount;
    console.log(
      "User WSOL balance after wrapping:",
      Number(balanceAfterWrap) / 1e9,
    );

    await program.methods
      .depositTreasury(new anchor.BN(balanceAfterWrap))
      .accounts({
        treasuryState: treasuryStatePda,
        user: TEST_KEYPAIR.publicKey,
        userAta: testATA,
        treasuryAta: treasuryVaultAta,
        liquidityMint,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .signers([TEST_KEYPAIR])
      .rpc();

    // Fetch treasury account state from the program
    const treasuryState =
      await program.account.treasuryState.fetch(treasuryStatePda);

    console.log("-------------------------------------------------");
    console.log("Treasury state after deposit:");
    console.log("Liquidity Mint:", treasuryState.liquidityMint.toBase58());
    console.log("Treasury Vault ATA:", treasuryState.treasuryAta.toBase58());
    console.log("Total Liquidity:", Number(treasuryState.totalLiquidity) / 1e9);
    console.log("Total Borrowed:", Number(treasuryState.totalBorrowed) / 1e9);
    console.log("-------------------------------------------------");
    return;
  });

  it("Lending process begins here -> Pool initialization -> Collateral deposit ->  borrow amount", async () => {
    let collateralMint: PublicKey;
    let loanMint: PublicKey;
    let poolPda: PublicKey;
    let poolBump: number;
    let vaultAta: PublicKey;
    let treasuryPda: PublicKey;
    let treasuryVaultAta: PublicKey;
    let owner = TEST_KEYPAIR;
    let treasuryBump: number;
    let borrowAmount: number;

    console.log("\n=== Initial Wallet Balances ===");
    console.log(
      "Harshit wallet:",
      (await connection.getBalance(HARSHIT_KEYPAIR.publicKey)) /
        LAMPORTS_PER_SOL,
      "SOL",
    );
    console.log(
      "Test wallet:",
      (await connection.getBalance(TEST_KEYPAIR.publicKey)) / LAMPORTS_PER_SOL,
      "SOL",
    );
    console.log("-----------------------------------------------------");

    [treasuryPda, treasuryBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("treasury")],
      program.programId,
    );

    [poolPda, poolBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("user-pool"), owner.publicKey.toBuffer()],
      program.programId,
    );

    console.log("\n=== PDA Addresses ===");
    console.log("Treasury PDA:", treasuryPda.toBase58());
    console.log("Pool PDA:", poolPda.toBase58());
    console.log("-----------------------------------------------------");

    // finding that treasury exists or not ???? if not , then how can a loan initialized without having the funds

    try {
      const treasury = await program.account.treasuryState.fetch(treasuryPda);
      loanMint = treasury.liquidityMint;
      treasuryVaultAta = treasury.treasuryAta;
    } catch (_) {
      throw new Error(
        "Run initializeTreasury first. it is not initialized yet",
      );
    }

    // initializing pool
    console.log("\n=== Creating Collateral Mint ===");
    collateralMint = await createMint(
      connection,
      TEST_KEYPAIR,
      TEST_KEYPAIR.publicKey,
      TEST_KEYPAIR.publicKey,
      6,
    );

    console.log("Collateral mint created:", collateralMint.toBase58());

    const [vaultAuthority] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault-authority"), owner.publicKey.toBuffer()],
      program.programId,
    );
    vaultAta = getAssociatedTokenAddressSync(
      collateralMint,
      vaultAuthority,
      true,
    );
    console.log("Vault authority PDA:", vaultAuthority.toBase58());
    console.log("Vault ATA address:", vaultAta.toBase58());

    console.log("\n=== Initializing User Pool ===");
    const tx = await program.methods
      .initializePool()
      .accounts({
        poolState: poolPda,
        vaultAuthority,
        owner: TEST_KEYPAIR.publicKey,
        vaultAta,
        collateralMint: collateralMint,
        loanMint: loanMint,
        systemProgram: SystemProgram.programId,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([TEST_KEYPAIR])
      .rpc();

    // fetching information
    console.log("Pool initialized successfully");
    console.log("Transaction signature:", tx);
    console.log("-----------------------------------------------------");

    // depositing the collateral
    console.log("\n=== Depositing Collateral ===");
    const amount = 150;
    console.log("Preparing to deposit", amount, "tokens as collateral");

    // get or create the ata where the collateral mint is stored
    const userCollateralAta = await getOrCreateAssociatedTokenAccount(
      connection,
      TEST_KEYPAIR,
      collateralMint,
      TEST_KEYPAIR.publicKey,
    );

    console.log("User collateral ATA:", userCollateralAta.address.toBase58());

    // now mint some tokens into the ATA
    await mintTo(
      connection,
      TEST_KEYPAIR,
      collateralMint,
      userCollateralAta.address,
      TEST_KEYPAIR,
      amount + 10,
    );

    const beforeBal = (await getAccount(connection, userCollateralAta.address))
      .amount;
    console.log("User balance before deposit:", Number(beforeBal), "tokens");

    const tx2 = await program.methods
      .depositCollateral(new anchor.BN(amount))
      .accounts({
        poolState: poolPda,
        vaultAuthority,
        collateralMint,
        vaultAta,
        userAta: userCollateralAta.address,
        owner: TEST_KEYPAIR.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([TEST_KEYPAIR])
      .rpc();

    console.log("Collateral deposited successfully");
    console.log("Transaction signature:", tx2);
    const pool = await program.account.poolState.fetch(poolPda);
    const afterBal = (await getAccount(connection, vaultAta)).amount;

    console.log("\n=== Deposit Results ===");
    console.log(
      "Pool collateral recorded:",
      pool.collateralAmount.toNumber(),
      "tokens",
    );
    console.log("Vault actual balance:", Number(afterBal), "tokens");
    console.log(
      "User remaining balance:",
      Number(beforeBal) - amount,
      "tokens",
    );
    console.log("-----------------------------------------------------");
  });

  // borrowing logic
  it("Borrowing from treasury-> ", async () => {
   
    let poolPda: PublicKey;
    let treasuryPda: PublicKey;
    let loanMint: PublicKey;
    let userAta: PublicKey;
    let owner: PublicKey;
    let treasuryAta: PublicKey;
    let treasuryAuthority: PublicKey;

    [poolPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("user-pool"), TEST_KEYPAIR.publicKey.toBuffer()], // seed
      program.programId,
    );

    [treasuryPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("treasury")], // seed
      program.programId,
    );

    const treasury = await program.account.treasuryState.fetch(treasuryPda);
    loanMint = treasury.liquidityMint;
    const treasuryVaultAta = treasury.treasuryAta;

    const treasuryBefore = (await getAccount(connection, treasuryVaultAta))
      .amount;
    console.log("  Treasury Vault ATA      :", treasuryVaultAta.toBase58());
    console.log("  Treasury Balance Before :", Number(treasuryBefore) / 1e9);

    // make userATA if not present -> jaha funds jayenge

    let userLoanAta = await getOrCreateAssociatedTokenAccount(
      connection,
      TEST_KEYPAIR,
      loanMint,
      TEST_KEYPAIR.publicKey,
    );

    const userBefore = (await getAccount(connection, userLoanAta.address))
      .amount;
    console.log("  User Loan ATA           :", userLoanAta.address.toBase58());
    console.log("  User Loan Before        :", Number(userBefore) / 1e9);
    console.log("-----------------------------------------------------");

    const tx2 = await program.methods
      .borrowLoan()
      .accounts({
        treasuryState: treasuryPda,
        poolState: poolPda,
        userAta: userLoanAta.address,
        loanMint,
        owner: TEST_KEYPAIR.publicKey,
        treasuryAta: treasuryVaultAta,
        treasuryAuthority: treasuryPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .signers([TEST_KEYPAIR])
      .rpc();

    console.log("Borrow Transaction Signature:", tx2);
    const txDetails = await connection.getTransaction(tx2, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });

    const treasuryAfter = (await getAccount(connection, treasuryVaultAta))
      .amount;
    const userAfter = (await getAccount(connection, userLoanAta.address))
      .amount;

    console.log("Borrow Summary:");
    console.log("  Treasury After :", Number(treasuryAfter) / 1e9);
    console.log("  User After     :", Number(userAfter) / 1e9);
    console.log(
      "  Treasury Change:",
      Number(treasuryBefore - treasuryAfter) / 1e9,
    );
    console.log("  User Change    :", Number(userAfter - userBefore) / 1e9);
    console.log("-----------------------------------------------------");

    console.log("Pool config:");
    const poolState = await program.account.poolState.fetch(poolPda);
    console.log("  Owner:", poolState.owner.toBase58());
    console.log("  Collateral Mint:", poolState.collateralMint.toBase58());
    console.log(
      "  Collateral Amount:",
      poolState.collateralAmount.toNumber(),
      "tokens",
    );
    console.log("  Loan Mint:", poolState.loanMint.toBase58());
    console.log(
      "  Loan Amount:",
      poolState.loanAmount.toNumber() / LAMPORTS_PER_SOL,
      "SOL",
    );
    console.log("  Vault ATA:", poolState.vaultAta.toBase58());
    console.log(
      "  Interest Rate:",
      poolState.interestRate.toNumber() / 100,
      "%",
    );
    console.log("  Last Update Time:", Number(poolState.lastUpdateTime));
    console.log("  Pool Bump:", poolState.bump);
    console.log(
      "  Loan amount:",
      poolState.loanAmount.toNumber() / LAMPORTS_PER_SOL,
      "Sol",
    );
    console.log("  Borrowed at:", Number(poolState.borrowTime));

    console.log("  Vault Authority Bump:", poolState.vaultAuthorityBump);

    console.log("\n=== Protocol Summary ===");
    const treasuryState =
      await program.account.treasuryState.fetch(treasuryPda);

    const treasuryLiq = (
      treasuryState.totalLiquidity.toNumber() / LAMPORTS_PER_SOL
    ).toFixed(2);
    const totalBorrowed = (
      treasuryState.totalBorrowed.toNumber() / LAMPORTS_PER_SOL
    ).toFixed(2);
    const userCollateral = poolState.collateralAmount.toNumber();
    const userLoan = (
      poolState.loanAmount.toNumber() / LAMPORTS_PER_SOL
    ).toFixed(2);

    console.log("┌───────────────────────┬─────────────────┐");
    console.log(`│ Treasury Liquidity    │ ${treasuryLiq.padStart(9)} SOL   │`);
    console.log(
      `│ Total Borrowed        │ ${totalBorrowed.padStart(9)} SOL   │`,
    );
    console.log(
      `│ User Collateral       │ ${userCollateral.toString().padStart(7)} tokens  │`,
    );
    console.log(`│ User Loan             │ ${userLoan.padStart(9)} SOL   │`);
    console.log("└───────────────────────┴─────────────────┘");
  });

  // repay logic
  it("Repaying the loan-> ", async () => {
    let treasuryPda: PublicKey;
    let poolPda: PublicKey;
    let owner = TEST_KEYPAIR;
    let userAta: PublicKey;
    let treasuryAta: PublicKey;
    let loanMint: PublicKey;

    console.log("\n\nWaiting 10 seconds to see visible interest...");
    await new Promise(resolve => setTimeout(resolve, 10000));
    console.log("\n--- Starting Loan Repayment Test ---\n");

    [treasuryPda] = await PublicKey.findProgramAddressSync(
      [Buffer.from("treasury")],
      program.programId,
    );
    console.log("Treasury PDA:", treasuryPda.toString());

    [poolPda] = await PublicKey.findProgramAddressSync(
      [Buffer.from("user-pool"), owner.publicKey.toBuffer()],
      program.programId,
    );
    console.log("User Pool PDA:", poolPda.toString());

    const treasuryState =
      await program.account.treasuryState.fetch(treasuryPda);
    treasuryAta = treasuryState.treasuryAta;
    loanMint = treasuryState.liquidityMint;

    console.log("\nTreasury liquidity mint (WSOL):", loanMint.toString());
    console.log("Treasury WSOL account:", treasuryAta.toString());

    let user_ATA = await getOrCreateAssociatedTokenAccount(
      connection,
      TEST_KEYPAIR,
      loanMint,
      TEST_KEYPAIR.publicKey,
    );


    userAta = user_ATA.address;
    console.log("User WSOL account:", userAta.toString());

    const poolState = await program.account.poolState.fetch(poolPda);
    const borrowedAmount = poolState.borrowAmount.toNumber() / LAMPORTS_PER_SOL;
    console.log("\n--- Loan Details ---");
    console.log("Amount borrowed:", borrowedAmount, "SOL");
    console.log("Collateral mint:", poolState.collateralMint.toString());
    let amount = 10;

    const ix1 = SystemProgram.transfer({
      fromPubkey: TEST_KEYPAIR.publicKey,
      toPubkey: userAta,
      lamports: amount * LAMPORTS_PER_SOL,
    });

    //wrap WSOL (wrap)
    const ix2 = createSyncNativeInstruction(userAta); // sync is very imp

    const tx = new Transaction().add(ix1, ix2);
    await sendAndConfirmTransaction(connection, tx, [TEST_KEYPAIR]);

    const balanceAfterWrap = (await getAccount(connection, userAta)).amount;
    console.log(
      "User WSOL balance after wrapping:",
      Number(balanceAfterWrap) / LAMPORTS_PER_SOL,
      "WSOL",
    );

    // till now , the userAta have sols to repay ;
    console.log("\n--- Executing Loan Repayment ---");
    console.log("Initiating repayment transaction...");
    const tx2 = await program.methods
      .repayLoan()
      .accounts({
        treasuryState: treasuryPda,
        poolState: poolPda,
        owner: TEST_KEYPAIR.publicKey,
        userAta: userAta,
        treasuryAta,
        tokenProgram: TOKEN_PROGRAM_ID,       
        systemProgram: SystemProgram.programId,  
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID, 
      })
      .signers([TEST_KEYPAIR])
      .rpc();

    console.log("Repayment transaction confirmed:", tx2);

    const updatedPool = await program.account.poolState.fetch(poolPda);
    const updatedTreasury =
      await program.account.treasuryState.fetch(treasuryPda);

    console.log("\n--- Post-Repayment State ---");
    console.log(
      "User borrow amount:",
      updatedPool.borrowAmount.toNumber() / LAMPORTS_PER_SOL,
      "SOL",
    );
    console.log(
      "User loan amount:",
      updatedPool.loanAmount.toNumber() / LAMPORTS_PER_SOL,
      "SOL",
    );
    console.log(
      "Treasury total liquidity:",
      updatedTreasury.totalLiquidity.toNumber() / LAMPORTS_PER_SOL,
      "SOL",
    );
    console.log(
      "Treasury total borrowed:",
      updatedTreasury.totalBorrowed.toNumber() / LAMPORTS_PER_SOL,
      "SOL",
    );
    const balanceAfterRepayment = (await getAccount(connection, userAta)).amount;
    console.log("User wSols after repayment : " , Number(balanceAfterRepayment) / LAMPORTS_PER_SOL , "Wsols") ;
    const borrowTime = poolState.borrowTime ;
    const currentTime = Math.floor(Date.now() / 1000); 
    const borrowingDurationSeconds = currentTime - Number(borrowTime);
    console.log("Total Borrowing time:", borrowingDurationSeconds, "seconds");
    console.log(
      "Total interest gained:", 
      amount - Number(balanceAfterRepayment) / LAMPORTS_PER_SOL, 
      "SOL"
    );

    console.log("\n--- Loan Repayment Test Complete ---\n");
  });
});

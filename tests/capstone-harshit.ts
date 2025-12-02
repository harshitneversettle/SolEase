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

// Keypairs loaded here
const HARSHIT_KEYPAIR = Keypair.fromSecretKey(
  Uint8Array.from(
    JSON.parse(
      fs.readFileSync(
        "/home/titan/Desktop/capstone-harshit/harshit.json",
        "utf8"
      )
    )
  )
);

const TEST_KEYPAIR = Keypair.fromSecretKey(
  Uint8Array.from(
    JSON.parse(
      fs.readFileSync("/home/titan/Desktop/capstone-harshit/Test.json", "utf8")
    )
  )
);

console.log("Admin wallet loaded: " + HARSHIT_KEYPAIR.publicKey.toBase58());
console.log("Test user wallet loaded: " + TEST_KEYPAIR.publicKey.toBase58());

// Test begins here
describe("LFG!!", () => {
  const connection = new anchor.web3.Connection(
    "http://127.0.0.1:8899",
    "confirmed"
  );

  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(HARSHIT_KEYPAIR),
    {}
  );
  anchor.setProvider(provider);
  const program = anchor.workspace.CapstoneHarshit as Program<CapstoneHarshit>;

  before(async () => {
    await connection.confirmTransaction(
      await connection.requestAirdrop(
        HARSHIT_KEYPAIR.publicKey,
        100 * LAMPORTS_PER_SOL
      )
    );

    await connection.confirmTransaction(
      await connection.requestAirdrop(
        TEST_KEYPAIR.publicKey,
        100 * LAMPORTS_PER_SOL
      )
    );
  });

  let liquidityMint: PublicKey;
  let treasuryStatePda: PublicKey;
  let treasuryVaultAta: PublicKey;
  let treasuryBump: number;

  // Initialization of the treasury

  // init treasury 
  it("Initializing treasury -> ", async () => {
    [treasuryStatePda, treasuryBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("treasury")], // Seed
      program.programId
    );

    console.log("Found Treasury PDA address: " + treasuryStatePda.toBase58());

    // WSOL Mint
    liquidityMint = new PublicKey(
      "So11111111111111111111111111111111111111112"
    );

    // Create Treasury Vault ATA
    const treasuryVaultKeypair = Keypair.generate();
    treasuryVaultAta = treasuryVaultKeypair.publicKey;

    console.log("Generated Treasury Vault keypair: " + treasuryVaultAta.toBase58());

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

    console.log("Treasury initialized successfully on-chain.");
    console.log("Liquidity Mint (WSOL): " + liquidityMint.toBase58());
    console.log("Treasury Vault Token Account: " + treasuryVaultAta.toBase58());
    console.log("");
  });

  // init lpState and deposit liquidity
  it("Init Lpstate and Liquidator adding liquidity ", async () => {
    const amount = 10;
    let lpStatePda : PublicKey ;
    let lpstateBump : number ;
    let owner = HARSHIT_KEYPAIR ;
    const liquidityMint = new PublicKey(
      "So11111111111111111111111111111111111111112"
    );
    let lpAta : PublicKey ;

    [lpStatePda, lpstateBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("Liquidator-state"), owner.publicKey.toBuffer()],
    program.programId
  );

    let lpATA = await getOrCreateAssociatedTokenAccount(
      connection ,
      owner ,
      liquidityMint ,
      owner.publicKey ,
    )
    lpAta = lpATA.address ;

    let tx = await program.methods.initializeLiquidatorState().accounts({
      lpState : lpStatePda ,
      owner : owner.publicKey ,
      lpAta ,
      amount ,
      liquidityMint ,
      bump : lpstateBump ,
      systemProgram: SystemProgram.programId,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      tokenProgram: TOKEN_PROGRAM_ID,
    }).signers([owner]).rpc() 

    let lpState = await program.account.liquidatorState.fetch(lpStatePda);

    console.log("\n Lp State After Init ");
    console.log("Lp state init done : " , tx ) ;
    console.log("Owner:", lpState.owner.toBase58());
    console.log("Liquidity Mint:", lpState.liquidityMint.toBase58());

    // yaha tk lp state bn chuka hai 


    // yaha se liquidity adding instructuion 
    [treasuryStatePda, treasuryBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("treasury")], 
      program.programId
    );

    try {
      const treasury = await program.account.treasuryState.fetch(
        treasuryStatePda
      );
      treasuryVaultAta = treasury.treasuryAta;
    } catch (e) {
      throw new Error("Treasury initialization failed or not found.");
    }
    console.log(`Preparing to deposit ${amount} SOL from the test wallet into the Treasury...`);
    console.log("");
    
    // Create/Fetch User’s WSOL ATA
    const userATA = lpState.lpAta ;

    const beforeBalance = (await getAccount(connection, userATA)).amount;
    console.log(
      "User's WSOL balance before wrapping SOL: " + Number(beforeBalance) / 1e9
    );

    // Send SOL → ATA
    const ix1 = SystemProgram.transfer({
      fromPubkey: HARSHIT_KEYPAIR.publicKey,
      toPubkey: userATA,
      lamports: amount * LAMPORTS_PER_SOL,
    });

    // Wrap WSOL
    const ix2 = createSyncNativeInstruction(userATA);

    const tx2 = new Transaction().add(ix1, ix2);
    await sendAndConfirmTransaction(connection, tx2 , [HARSHIT_KEYPAIR]);

    console.log(`Successfully wrapped ${amount} SOL into WSOL.`);

    const balanceAfterWrap = (await getAccount(connection, userATA)).amount;
    console.log(
      "User's WSOL balance after wrapping: " + Number(balanceAfterWrap) / 1e9
    );

    await program.methods
      .depositTreasury(new anchor.BN(balanceAfterWrap))
      .accounts({
        treasuryState: treasuryStatePda,
        user: HARSHIT_KEYPAIR.publicKey,
        userAta: userATA,
        treasuryAta: treasuryVaultAta,
        liquidityMint,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .signers([HARSHIT_KEYPAIR])
      .rpc();

    // Fetch treasury account state from the program
    const treasuryState = await program.account.treasuryState.fetch(
      treasuryStatePda
    );

    console.log("");
    console.log("Current Treasury State:");
    console.log("   Liquidity Mint: " + treasuryState.liquidityMint.toBase58());
    console.log("   Treasury Vault ATA: " + treasuryState.treasuryAta.toBase58());
    console.log("   Total Liquidity Available: " + Number(treasuryState.totalLiquidity) / 1e9);
    console.log("   Total Borrowed Amount: " + Number(treasuryState.totalBorrowed) / 1e9);
    console.log("");
    return;
  });

  // actual lending process
  it("Lending process begins here -> Pool initialization -> Collateral deposit -> borrow amount", async () => {
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

    console.log("\nInitial Wallet Balances:");
    console.log(
      "   Harshit (Admin): " +
      (await connection.getBalance(HARSHIT_KEYPAIR.publicKey)) /
        LAMPORTS_PER_SOL +
      " SOL"
    );
    console.log(
      "   Test User: " +
      (await connection.getBalance(TEST_KEYPAIR.publicKey)) / LAMPORTS_PER_SOL +
      " SOL"
    );
    console.log("");

    [treasuryPda, treasuryBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("treasury")],
      program.programId
    );

    [poolPda, poolBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("user-pool"), owner.publicKey.toBuffer()],
      program.programId
    );

    console.log("\nProgram Derived Addresses (PDAs):");
    console.log("   Treasury PDA: " + treasuryPda.toBase58());
    console.log("   User Pool PDA: " + poolPda.toBase58());
    console.log("");

    // Check if treasury exists
    try {
      const treasury = await program.account.treasuryState.fetch(treasuryPda);
      loanMint = treasury.liquidityMint;
      treasuryVaultAta = treasury.treasuryAta;
    } catch (_) {
      throw new Error(
        "Please initialize the Treasury first; it currently does not exist."
      );
    }

    // Initializing pool
    console.log("\nCreating new Collateral Mint...");
    collateralMint = await createMint(
      connection,
      TEST_KEYPAIR,
      TEST_KEYPAIR.publicKey,
      TEST_KEYPAIR.publicKey,
      6
    );

    console.log("   Collateral Mint created at: " + collateralMint.toBase58());

    const [vaultAuthority] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault-authority"), owner.publicKey.toBuffer()],
      program.programId
    );
    vaultAta = getAssociatedTokenAddressSync(
      collateralMint,
      vaultAuthority,
      true
    );
    console.log("   Vault Authority PDA: " + vaultAuthority.toBase58());
    console.log("   Vault ATA Address: " + vaultAta.toBase58());

    console.log("\nInitializing User Pool...");
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

    // Fetching information
    console.log("Pool initialized successfully.");
    console.log("   Tx Signature: " + tx);
    console.log("");

    // Depositing the collateral
    console.log("\nDepositing Collateral...");
    const amount =  500 ;
    console.log(`   Preparing to deposit ${amount} tokens as collateral.`);

    let userCollateralAta = await getOrCreateAssociatedTokenAccount(
      connection,
      TEST_KEYPAIR,
      collateralMint,
      TEST_KEYPAIR.publicKey
    );

    console.log("   User Collateral ATA: " + userCollateralAta.address.toBase58());

    // Mint tokens into the ATA
    await mintTo(
      connection,
      TEST_KEYPAIR,
      collateralMint,
      userCollateralAta.address,
      TEST_KEYPAIR,
      amount + 10
    );

    const beforeBal = (await getAccount(connection, userCollateralAta.address))
      .amount;
    console.log("   User balance before deposit: " + Number(beforeBal) + " tokens");

    const tx2 = await program.methods
      .depositCollateral(new anchor.BN(amount))
      .accounts({
        poolState: poolPda,
        vaultAuthority,
        collateralMint,
        vaultAta,
        userCollateralAta: userCollateralAta.address,
        owner: TEST_KEYPAIR.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([TEST_KEYPAIR])
      .rpc();

    console.log("Collateral deposited successfully.");
    console.log("   Tx Signature: " + tx2);
    const pool = await program.account.poolState.fetch(poolPda);
    const afterBal = (await getAccount(connection, vaultAta)).amount;

    console.log("\nPost-Deposit Results:");
    console.log(
      "   Pool Collateral Recorded: " +
      pool.collateralAmount.toNumber() +
      " tokens"
    );
    console.log("   Actual Vault Balance: " + Number(afterBal) + " tokens");
    console.log(
      "   User Remaining Balance: " +
      (Number(beforeBal) - amount) +
      " tokens"
    );
    console.log("");
  });

  // Borrowing logic starts here
  it("Borrowing from treasury-> ", async () => {
    let poolPda: PublicKey;
    let treasuryPda: PublicKey;
    let loanMint: PublicKey;
    let owner: PublicKey;
    let treasuryAta: PublicKey;
    let treasuryAuthority: PublicKey;

    [poolPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("user-pool"), TEST_KEYPAIR.publicKey.toBuffer()], // Seed
      program.programId
    );

    [treasuryPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("treasury")], // Seed
      program.programId
    );

    const treasury = await program.account.treasuryState.fetch(treasuryPda);
    loanMint = treasury.liquidityMint;
    const treasuryVaultAta = treasury.treasuryAta;

    const treasuryBefore = (await getAccount(connection, treasuryVaultAta))
      .amount;
    console.log("   Treasury Vault ATA: " + treasuryVaultAta.toBase58());
    console.log("   Treasury Balance Before Borrow: " + Number(treasuryBefore) / 1e9);

    // Create userATA if not present
    let userLoanAta = await getOrCreateAssociatedTokenAccount(
      connection,
      TEST_KEYPAIR,
      loanMint,
      TEST_KEYPAIR.publicKey
    );

    const userBefore = (await getAccount(connection, userLoanAta.address))
      .amount;
    console.log("   User Loan ATA: " + userLoanAta.address.toBase58());
    console.log("   User Loan Balance Before: " + Number(userBefore) / 1e9);

    const tx2 = await program.methods
      .borrowLoan()
      .accounts({
        treasuryState: treasuryPda,
        poolState: poolPda,
        userLoanAta: userLoanAta.address,
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

    console.log("Borrow Transaction Confirmed: " + tx2);
    const txDetails = await connection.getTransaction(tx2, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });

    const treasuryAfter = (await getAccount(connection, treasuryVaultAta))
      .amount;
    const userAfter = (await getAccount(connection, userLoanAta.address))
      .amount;

    console.log("Borrow Summary:");
    console.log("   Treasury Balance After: " + Number(treasuryAfter) / 1e9);
    console.log("   User Balance After: " + Number(userAfter) / 1e9);
    console.log(
      "   Treasury Decrease: " +
      Number(treasuryBefore - treasuryAfter) / 1e9
    );
    console.log("   User Increase: " + Number(userAfter - userBefore) / 1e9);
    console.log("");

    console.log("Updated Pool Configuration:");
    const poolState = await program.account.poolState.fetch(poolPda);
    console.log("   Owner: " + poolState.owner.toBase58());
    console.log("   Collateral Mint: " + poolState.collateralMint.toBase58());
    console.log(
      "   Collateral Amount: " +
      poolState.collateralAmount.toNumber() +
      " tokens"
    );
    console.log("   Loan Mint: " + poolState.loanMint.toBase58());
    console.log(
      "   Loan Amount: " +
      poolState.loanAmount.toNumber() / LAMPORTS_PER_SOL +
      " SOL"
    );
    console.log("   Vault ATA: " + poolState.vaultAta.toBase58());
    console.log(
      "   Interest Rate: " +
      poolState.interestRate.toNumber() / 100 +
      "%"
    );
    console.log("   Last Update Timestamp: " + Number(poolState.lastUpdateTime));
    console.log("   Pool Bump Seed: " + poolState.bump);
    console.log(
      "   Active Loan Amount: " +
      poolState.loanAmount.toNumber() / LAMPORTS_PER_SOL +
      " SOL"
    );
    console.log("   Borrowed At Timestamp: " + Number(poolState.borrowTime));

    console.log("   Vault Authority Bump: " + poolState.vaultAuthorityBump);

    console.log("\nProtocol Financial Summary:");
    const treasuryState = await program.account.treasuryState.fetch(
      treasuryPda
    );

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
  });

  // Repay logic
  it("Repaying the loan-> ", async () => {
    let treasuryPda: PublicKey;
    let poolPda: PublicKey;
    let owner = TEST_KEYPAIR;
    let userLoanAta: PublicKey;
    let treasuryAta: PublicKey;
    let loanMint: PublicKey;
    let collateralMint: PublicKey;
    let userCollateralAta: PublicKey;

    console.log("\n\nWaiting 10 seconds to accumulate visible interest...");
    await new Promise((resolve) => setTimeout(resolve, 10000));
    console.log("\nStarting Loan Repayment Process...\n");

    [treasuryPda] = await PublicKey.findProgramAddressSync(
      [Buffer.from("treasury")],
      program.programId
    );
    console.log("Found Treasury PDA: " + treasuryPda.toString());

    [poolPda] = await PublicKey.findProgramAddressSync(
      [Buffer.from("user-pool"), owner.publicKey.toBuffer()],
      program.programId
    );
    console.log("Found User Pool PDA: " + poolPda.toString());

    let [vaultAuthority] = await PublicKey.findProgramAddressSync(
      [Buffer.from("vault-authority"), owner.publicKey.toBuffer()],
      program.programId
    );

    const poolState = await program.account.poolState.fetch(poolPda);
    collateralMint = poolState.collateralMint;
    let vaultAta = poolState.vaultAta;
    let userCollateralATA = await getOrCreateAssociatedTokenAccount(
      connection,
      TEST_KEYPAIR,
      collateralMint,
      TEST_KEYPAIR.publicKey
    );

    userCollateralAta = userCollateralATA.address;

    let treasuryState = await program.account.treasuryState.fetch(
      treasuryPda
    );
    treasuryAta = treasuryState.treasuryAta;
    loanMint = treasuryState.liquidityMint;
    

    console.log("\nTreasury Liquidity Mint (WSOL): " + loanMint.toString());
    console.log("Treasury WSOL Account: " + treasuryAta.toString());

    let user_ATA = await getOrCreateAssociatedTokenAccount(
      connection,
      TEST_KEYPAIR,
      loanMint,
      TEST_KEYPAIR.publicKey
    );

    userLoanAta = user_ATA.address;
    console.log("User WSOL Account: " + userLoanAta.toString());

    const borrowedAmount =
    poolState.borrowAmount.toNumber() / LAMPORTS_PER_SOL;
    console.log("\nLoan Details Before Repayment:");
    console.log("   Amount Borrowed: " + borrowedAmount + " SOL");
    console.log("   Collateral Mint: " + poolState.collateralMint.toString());
    let amount = 10;

    const ix1 = SystemProgram.transfer({
      fromPubkey: TEST_KEYPAIR.publicKey,
      toPubkey: userLoanAta,
      lamports: amount * LAMPORTS_PER_SOL,
    });

    // Wrap WSOL
    const ix2 = createSyncNativeInstruction(userLoanAta);

    const tx = new Transaction().add(ix1, ix2);
    await sendAndConfirmTransaction(connection, tx, [TEST_KEYPAIR]);

    const balanceAfterWrap = (await getAccount(connection, userLoanAta)).amount;
    console.log(
      "   User WSOL Balance after wrapping additional SOL: " +
      Number(balanceAfterWrap) / LAMPORTS_PER_SOL +
      " WSOL"
    );

    // Execute loan repayment
    console.log("\nExecuting Loan Repayment...");
    console.log("   Initiating repayment transaction...");
    const tx2 = await program.methods
      .repayLoan()
      .accounts({
        treasuryState: treasuryPda,
        poolState: poolPda,
        owner: TEST_KEYPAIR.publicKey,
        userLoanAta: userLoanAta,
        treasuryAta,
        vaultAuthority,
        collateralMint,
        userCollateralAta,
        vaultAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .signers([TEST_KEYPAIR])
      .rpc();

    console.log("Repayment transaction confirmed: " + tx2);

    const updatedPool = await program.account.poolState.fetch(poolPda);
    const updatedTreasury = await program.account.treasuryState.fetch(
      treasuryPda
    );

    console.log("\nPost-Repayment State:");
    console.log(
      "   User Borrow Amount: " +
      updatedPool.borrowAmount.toNumber() / LAMPORTS_PER_SOL +
      " SOL"
    );
    console.log(
      "   User Loan Amount: " +
      updatedPool.loanAmount.toNumber() / LAMPORTS_PER_SOL +
      " SOL"
    );
    console.log(
      "   Treasury Total Liquidity: " +
      updatedTreasury.totalLiquidity.toNumber() / LAMPORTS_PER_SOL +
      " SOL"
    );
    console.log(
      "   Treasury Total Borrowed: " +
      updatedTreasury.totalBorrowed.toNumber() / LAMPORTS_PER_SOL +
      " SOL"
    );
    const balanceAfterRepayment = (
      await getAccount(connection, userLoanAta)
    ).amount;
    console.log(
      "   User WSOL Remaining after Repayment: " +
      Number(balanceAfterRepayment) / LAMPORTS_PER_SOL +
      " WSOL"
    );
    treasuryState = await program.account.treasuryState.fetch(
      treasuryPda
    );
    const borrowTime = poolState.borrowTime;
    const currentTime = Math.floor(Date.now() / 1000);
    const borrowingDurationSeconds = currentTime - Number(borrowTime);
    console.log("   Total Duration of Loan: " + borrowingDurationSeconds + " seconds");
    console.log("Total interest gained : " , Number(treasuryState.totalInterestGained)/1e9 ,"Sol" ) ;
    console.log("Interest rate  : " , Number(treasuryState.interestRate) )


    let collateral_balance = (
      await getAccount(connection, userCollateralAta)
    ).amount;
    console.log(
      "   User Collateral ATA Balance after returning Collateral : " +
      collateral_balance +
      " tokens"
    );
    console.log(
      "   User Collateral ATA Address: " +
      userCollateralAta.toBase58()
    );

    console.log("\nLoan Repayment Test Complete.\n");
  });
});

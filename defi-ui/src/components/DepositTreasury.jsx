import { useState } from "react";
import { useProgram, LIQUIDITY_MINT, PROGRAM_ID } from "../anchor/setupAnchor";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { BN } from "@coral-xyz/anchor";

export default function DepositTreasury() {
  const { publicKey } = useWallet();
  const { program, connection } = useProgram();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [txSignature, setTxSignature] = useState(null);

  const handleDeposit = async () => {
    if (!program || !connection || !publicKey) {
      alert("Connect wallet first.");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      alert("Enter a valid amount.");
      return;
    }

    setLoading(true);
    setTxSignature(null);

    try {
      const depositAmount = new BN(parseFloat(amount) * LAMPORTS_PER_SOL);

      const [treasuryStatePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("treasury")],
        PROGRAM_ID
      );

      const [userTreasuryPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("user-deposit"), publicKey.toBuffer()],
        PROGRAM_ID
      );

      const [treasuryAuthority] = PublicKey.findProgramAddressSync(
        [Buffer.from("treasury")],
        PROGRAM_ID
      );

      const userAta = getAssociatedTokenAddressSync(
        LIQUIDITY_MINT,
        publicKey,
        false,
        TOKEN_PROGRAM_ID
      );

      const treasuryAta = getAssociatedTokenAddressSync(
        LIQUIDITY_MINT,
        treasuryAuthority,
        true,
        TOKEN_PROGRAM_ID
      );

      const tx = await program.methods
        .depositTreasury(depositAmount)
        .accounts({
          treasuryState: treasuryStatePda,
          userTreasury: userTreasuryPda,
          treasuryAuthority,
          user: publicKey,
          userAta,
          liquidityMint: LIQUIDITY_MINT,
          treasuryAta,
          systemProgram: SystemProgram.programId,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      await connection.confirmTransaction(tx, "processed");
      setTxSignature(tx);
      setAmount("");
      alert("Liquidity deposited.");
    } catch (err) {
      console.error("Treasury deposit failed:", err);
      alert(err.message || "Deposit failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded bg-black text-white text-sm">
      <h3 className="text-base font-semibold mb-2">Add Liquidity</h3>
      <p className="text-xs text-gray-400 mb-3">
        Deposit WSOL to the treasury.
      </p>

      <input
        type="number"
        step="0.1"
        min="0"
        placeholder="Amount in SOL"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        disabled={loading}
        className="w-full mb-3 px-2 py-2 text-sm bg-gray-900 border border-gray-700 rounded"
      />

      <button
        onClick={handleDeposit}
        disabled={loading || !amount}
        className="w-full py-2 text-sm font-medium rounded bg-amber-500 text-black disabled:bg-gray-600"
      >
        {loading ? "Processing..." : "Deposit"}
      </button>

      {txSignature && (
        <div className="mt-3 text-xs text-green-400 break-all">
          Tx: {txSignature}
        </div>
      )}
    </div>
  );
}

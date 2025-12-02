import { useState } from "react";
import { useProgram, LIQUIDITY_MINT, PROGRAM_ID } from "../anchor/setupAnchor";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";

export default function Borrow({ disabled, onSuccess }) {
  const { publicKey, sendTransaction } = useWallet();
  const { program, connection, error } = useProgram();
  const [loading, setLoading] = useState(false);
  const [txSignature, setTxSignature] = useState(null);

  if (!program && !error) {
    return (
      <div className="p-4 border border-gray-800 rounded-md text-sm text-gray-300">
        Loading borrow module...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border border-red-700 rounded-md text-sm text-red-300">
        {error}
      </div>
    );
  }

  const handleBorrow = async () => {
    if (!publicKey) {
      alert("Connect wallet first.");
      return;
    }

    setLoading(true);
    setTxSignature(null);

    try {
      const [poolStatePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("user-pool"), publicKey.toBuffer()],
        PROGRAM_ID
      );

      const [treasuryStatePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("treasury")],
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

      const ataInfo = await connection.getAccountInfo(userAta);
      if (!ataInfo) {
        const createAtaIx = createAssociatedTokenAccountInstruction(
          publicKey,
          userAta,
          publicKey,
          LIQUIDITY_MINT
        );
        const tx = new Transaction().add(createAtaIx);
        const sig = await sendTransaction(tx, connection);
        await connection.confirmTransaction(sig, "confirmed");
      }

      const tx = await program.methods
        .borrow()
        .accounts({
          poolState: poolStatePda,
          treasuryState: treasuryStatePda,
          loanMint: LIQUIDITY_MINT,
          userAta,
          owner: publicKey,
          treasuryAta,
          treasuryAuthority,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .rpc();

      await connection.confirmTransaction(tx, "confirmed");
      setTxSignature(tx);
      alert("Borrowed 1 SOL successfully.");
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error("Borrow failed:", err);
      alert(err.message || "Borrow failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`p-4 border rounded-md bg-gray-900 text-sm ${
        disabled ? "opacity-50 pointer-events-none" : ""
      }`}
    >
      <h3 className="text-base font-semibold mb-1 text-white">Borrow</h3>
      <p className="text-xs text-gray-400 mb-3">
        Borrow 1 SOL against your deposited collateral.
      </p>

      <button
        onClick={handleBorrow}
        disabled={loading || disabled}
        className="w-full py-2 text-sm font-medium rounded-md bg-purple-600 text-white disabled:bg-gray-600"
      >
        {loading ? "Processing..." : "Borrow 1 SOL"}
      </button>

      {txSignature && (
        <p className="mt-3 text-xs text-green-400 break-all">
          Transaction: {txSignature}
        </p>
      )}

      {disabled && (
        <p className="mt-2 text-xs text-red-400">
          Deposit collateral before borrowing.
        </p>
      )}
    </div>
  );
}

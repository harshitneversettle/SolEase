import { useState } from "react";
import { useProgram, COLLATERAL_MINT, PROGRAM_ID } from "../anchor/setupAnchor";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { BN } from "@coral-xyz/anchor";

export default function DepositCollateral({ onSuccess, disabled }) {
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
      const depositAmount = new BN(parseFloat(amount) * 1e6);

      const [poolStatePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("user-pool"), publicKey.toBuffer()],
        PROGRAM_ID
      );

      const [vaultAuthority] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), poolStatePda.toBuffer()],
        PROGRAM_ID
      );

      const userAta = getAssociatedTokenAddressSync(
        COLLATERAL_MINT,
        publicKey,
        false,
        TOKEN_PROGRAM_ID
      );

      const vaultAta = getAssociatedTokenAddressSync(
        COLLATERAL_MINT,
        vaultAuthority,
        true,
        TOKEN_PROGRAM_ID
      );

      const tx = await program.methods
        .deposit(depositAmount)
        .accounts({
          poolState: poolStatePda,
          vaultAuthority,
          collateralMint: COLLATERAL_MINT,
          vaultAta,
          userAta,
          owner: publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      await connection.confirmTransaction(tx, "confirmed");
      setTxSignature(tx);
      setAmount("");
      if (onSuccess) onSuccess();
      alert("Collateral deposited.");
    } catch (err) {
      console.error(err);
      alert(err.message || "Collateral deposit failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`p-4 border rounded bg-black text-white text-sm ${
        disabled ? "opacity-50 pointer-events-none" : ""
      }`}
    >
      <h3 className="text-base font-semibold mb-2">Deposit Collateral</h3>
      <div className="mb-3 text-xs text-gray-400">
        Deposit collateral tokens to enable borrowing.
      </div>

      <input
        type="number"
        step="1"
        min="0"
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        disabled={loading || disabled}
        className="w-full mb-3 px-2 py-2 text-sm bg-gray-900 border border-gray-700 rounded"
      />

      <button
        onClick={handleDeposit}
        disabled={loading || disabled || !amount}
        className="w-full py-2 text-sm font-medium rounded bg-green-600 text-white disabled:bg-gray-600"
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

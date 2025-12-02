import { useState } from "react";
import { useProgram, LIQUIDITY_MINT, PROGRAM_ID } from "../anchor/setupAnchor";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";

export default function InitializeTreasury() {
  const { publicKey } = useWallet();
  const { program, connection, error } = useProgram();
  const [loading, setLoading] = useState(false);
  const [txSignature, setTxSignature] = useState(null);

  if (!program && !error) {
    return (
      <div className="p-4 border border-gray-800 rounded-md bg-black text-sm text-gray-200">
        Loading treasury module...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border border-red-700 rounded-md bg-black text-sm text-red-300">
        {error}
      </div>
    );
  }

  const handleInit = async () => {
    if (!program || !connection || !publicKey) {
      alert("Connect wallet first.");
      return;
    }

    setLoading(true);
    setTxSignature(null);

    try {
      const [treasuryStatePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("treasury")],
        PROGRAM_ID
      );

      const [treasuryAuthority] = PublicKey.findProgramAddressSync(
        [Buffer.from("treasury")],
        PROGRAM_ID
      );

      const treasuryAta = getAssociatedTokenAddressSync(
        LIQUIDITY_MINT,
        treasuryAuthority,
        true,
        TOKEN_PROGRAM_ID
      );

      const ataInfo = await connection.getAccountInfo(treasuryAta);

      if (!ataInfo) {
        const createAtaIx = createAssociatedTokenAccountInstruction(
          publicKey,
          treasuryAta,
          treasuryAuthority,
          LIQUIDITY_MINT,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        );

        const tx = await program.methods
          .initializeTreasury()
          .accounts({
            treasuryState: treasuryStatePda,
            treasuryAuthority,
            liquidityMint: LIQUIDITY_MINT,
            treasuryAta,
            admin: publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          })
          .preInstructions([createAtaIx])
          .rpc();

        await connection.confirmTransaction(tx, "confirmed");
        setTxSignature(tx);
        alert("Treasury initialized with new token account.");
      } else {
        const tx = await program.methods
          .initializeTreasury()
          .accounts({
            treasuryState: treasuryStatePda,
            treasuryAuthority,
            liquidityMint: LIQUIDITY_MINT,
            treasuryAta,
            admin: publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          })
          .rpc();

        await connection.confirmTransaction(tx, "confirmed");
        setTxSignature(tx);
        alert("Treasury initialized.");
      }
    } catch (err) {
      console.error("Treasury initialization failed:", err);
      let msg = err.message || "Initialization failed.";
      if (msg.includes("already in use")) msg = "Treasury already initialized.";
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded bg-black text-white text-sm">
      <h3 className="text-base font-semibold mb-2">Initialize Treasury</h3>
      <p className="text-xs text-gray-400 mb-3">
        One-time setup for the global liquidity treasury.
      </p>

      <button
        onClick={handleInit}
        disabled={loading}
        className="w-full py-2 text-sm font-medium rounded bg-indigo-600 text-white disabled:bg-gray-600"
      >
        {loading ? "Initializing..." : "Initialize"}
      </button>

      {txSignature && (
        <div className="mt-3 text-xs text-green-400 break-all">
          Tx: {txSignature}
        </div>
      )}
    </div>
  );
}

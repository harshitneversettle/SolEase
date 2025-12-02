import { useState } from "react";
import {
  useProgram,
  COLLATERAL_MINT,
  LIQUIDITY_MINT,
  PROGRAM_ID,
} from "../anchor/setupAnchor";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram } from "@solana/web3.js";

export default function InitializePool({ onSuccess, disabled }) {
  const { publicKey } = useWallet();
  const { program, connection } = useProgram();
  const [loading, setLoading] = useState(false);
  const [txSignature, setTxSignature] = useState(null);

  const handleInit = async () => {
    if (!program || !connection || !publicKey) {
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

      const tx = await program.methods
        .initialize()
        .accounts({
          poolState: poolStatePda,
          owner: publicKey,
          collateralMint: COLLATERAL_MINT,
          loanMint: LIQUIDITY_MINT,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      await connection.confirmTransaction(tx, "confirmed");
      setTxSignature(tx);
      if (onSuccess) onSuccess();
      alert("Pool initialized.");
    } catch (err) {
      console.error("Pool initialization failed:", err);
      alert(err.message || "Initialization failed.");
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
      <h3 className="text-base font-semibold mb-2">Initialize Pool</h3>
      <p className="text-xs text-gray-400 mb-3">
        Create your lending pool for this wallet.
      </p>

      <button
        onClick={handleInit}
        disabled={loading || disabled}
        className="w-full py-2 text-sm font-medium rounded bg-blue-600 text-white disabled:bg-gray-600"
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

import { useState } from "react";
import { useProgram } from "../anchor/setupAnchor";
import { BN } from "@coral-xyz/anchor";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, LAMPORTS_PER_SOL, SystemProgram } from "@solana/web3.js";

export default function Deposit() {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [txSignature, setTxSignature] = useState(null);

  const { program, connection } = useProgram();
  const { publicKey } = useWallet();

  const handleDeposit = async () => {
    if (!program || !publicKey) return alert("Connect wallet");
    if (!amount || parseFloat(amount) < 0.001) return alert("Minimum is 0.001 SOL");
    setLoading(true);
    setTxSignature(null);

    try {
      const depositAmount = new BN(parseFloat(amount) * LAMPORTS_PER_SOL);
      const [treasuryPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("treasury")],
        program.programId
      );
      const [userAccountPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("user"), publicKey.toBuffer()],
        program.programId
      );
      const tx = await program.methods
        .deposit(depositAmount)
        .accounts({
          user: publicKey,
          treasury: treasuryPDA,
          userAccount: userAccountPDA,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      setTxSignature(tx);
      setAmount("");
      alert("Deposit successful");
    } catch (err) {
      alert("Deposit failed");
    }
    setLoading(false);
  };

  return (
    <div className="p-4 border rounded bg-black text-white max-w-xs">
      <div className="mb-2 font-semibold">Deposit SOL</div>
      <div className="flex gap-2">
        <input
          type="number"
          min="0.001"
          step="0.001"
          placeholder="Amount"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          disabled={loading}
          className="px-2 py-1 border-gray-700 rounded bg-gray-900 w-24 text-sm"
        />
        <button
          onClick={handleDeposit}
          disabled={loading || !amount || parseFloat(amount) < 0.001}
          className="px-3 py-1 text-sm bg-green-700 text-white rounded disabled:bg-gray-700"
        >
          {loading ? "..." : "Deposit"}
        </button>
      </div>
      {txSignature && (
        <div className="mt-3 text-xs break-all">
          Tx: {txSignature}
        </div>
      )}
    </div>
  );
}

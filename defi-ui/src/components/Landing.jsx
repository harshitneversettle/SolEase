import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useNavigate } from 'react-router-dom';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      <nav className="flex justify-between items-center p-6 max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold">Capstone Protocol</h1>
        <WalletMultiButton />
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-20 text-center">
        <h2 className="text-5xl font-bold mb-6">
          Decentralized Lending on Solana
        </h2>
        <p className="text-xl text-gray-400 mb-12">
          Borrow assets against your collateral with transparent, on-chain interest rates.
        </p>

        <button 
          onClick={() => navigate('/app')}
          className="bg-purple-600 hover:bg-purple-700 px-8 py-4 rounded-lg text-lg font-semibold transition"
        >
          Launch App
        </button>
      </main>

      <section className="max-w-6xl mx-auto px-6 py-20 grid md:grid-cols-3 gap-8">
        <div className="border border-gray-800 p-6 rounded-lg">
          <h3 className="text-xl font-bold mb-3">Collateralized Loans</h3>
          <p className="text-gray-400">
            Deposit SPL tokens as collateral and borrow SOL based on LTV.
          </p>
        </div>

        <div className="border border-gray-800 p-6 rounded-lg">
          <h3 className="text-xl font-bold mb-3">Dynamic Rates</h3>
          <p className="text-gray-400">
            Interest rates adjust based on pool utilization automatically.
          </p>
        </div>

        <div className="border border-gray-800 p-6 rounded-lg">
          <h3 className="text-xl font-bold mb-3">Secure PDAs</h3>
          <p className="text-gray-400">
            Your collateral is protected by Solana smart contracts.
          </p>
        </div>
      </section>

      <footer className="border-t border-gray-800 mt-20 py-8 text-center text-gray-500">
        <p>Built by Harshit | Powered by Solana</p>
      </footer>
    </div>
  );
}

import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import InitializeTreasury from './InitializeTreasury';
import DepositTreasury from './DepositTreasury';
import InitializePool from './InitializePool';
import DepositCollateral from './DepositCollateral';
import Borrow from './Borrow';

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <nav className="flex justify-between items-center p-6 max-w-6xl mx-auto border-b border-gray-800">
        <h1 className="text-2xl font-bold">Capstone Protocol</h1>
        <WalletMultiButton />
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <h2 className="text-3xl font-bold mb-8">Dashboard</h2>
        
        <div className="grid md:grid-cols-2 gap-6">
          <InitializeTreasury />
          <DepositTreasury />
          <InitializePool />
          <DepositCollateral />
          <Borrow />
          <PriceOracle />
        </div>
      </main>
    </div>
  );
}

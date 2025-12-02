import WalletConnection from "./WalletConnection";
import InitializeTreasury from "./components/InitializeTreasury";
import DepositTreasury from "./components/DepositTreasury";
import InitializePool from "./components/InitializePool";
import DepositCollateral from "./components/DepositCollateral";
import Borrow from "./components/Borrow";

function App() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <header className="border-b border-gray-800 pb-4">
          <h1 className="text-2xl font-semibold">DeFi Lending Protocol</h1>
          <p className="text-xs text-gray-400 mt-1">
            Minimal UI to interact with your Solana lending program.
          </p>
        </header>

        <WalletConnection>
          <main className="space-y-4">
            <section className="border border-gray-800 rounded-md p-4">
              <h2 className="text-sm font-medium mb-3">Treasury Setup</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <InitializeTreasury />
                <DepositTreasury />
              </div>
            </section>

            <section className="border border-gray-800 rounded-md p-4">
              <h2 className="text-sm font-medium mb-3">User Actions</h2>
              <div className="grid gap-4 md:grid-cols-3">
                <InitializePool />
                <DepositCollateral />
                <Borrow />
              </div>
            </section>

            <section className="border border-gray-800 rounded-md p-4">
              <h2 className="text-sm font-medium mb-3">Price Oracle</h2>
              <PriceOracle />
            </section>
          </main>
        </WalletConnection>
      </div>
    </div>
  );
}

export default App;

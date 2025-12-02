// import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
// import { useNavigate } from "react-router-dom";

// export default function Landing() {
//   const navigate = useNavigate();

//   return (
//     <div className="min-h-screen bg-black text-white flex flex-col">
//       <header className="w-full border-b border-gray-800">
//         <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
//           <h1 className="text-xl font-semibold">Capstone Protocol</h1>
//           <WalletMultiButton />
//         </div>
//       </header>

//       <main className="flex-1">
//         <div className="max-w-3xl mx-auto px-4 py-12 text-center">
//           <h2 className="text-3xl font-bold mb-4">
//             Decentralized Lending on Solana
//           </h2>
//           <p className="text-sm text-gray-400 mb-8">
//             Borrow assets against collateral with on-chain interest rates.
//           </p>
//           <button
//             onClick={() => navigate("/app")}
//             className="px-6 py-2 text-sm font-medium rounded bg-purple-600 text-white hover:bg-purple-700"
//           >
//             Launch App
//           </button>
//         </div>

//         <div className="max-w-5xl mx-auto px-4 py-10 grid gap-4 md:grid-cols-3 text-sm">
//           <div className="border border-gray-800 rounded p-4">
//             <h3 className="font-semibold mb-2">Collateralized Loans</h3>
//             <p className="text-gray-400">
//               Deposit SPL tokens and borrow SOL based on LTV.
//             </p>
//           </div>
//           <div className="border border-gray-800 rounded p-4">
//             <h3 className="font-semibold mb-2">Dynamic Rates</h3>
//             <p className="text-gray-400">
//               Rates adjust automatically with pool utilization.
//             </p>
//           </div>
//           <div className="border border-gray-800 rounded p-4">
//             <h3 className="font-semibold mb-2">Secure PDAs</h3>
//             <p className="text-gray-400">
//               Collateral managed by Solana smart contracts.
//             </p>
//           </div>
//         </div>
//       </main>

//       <footer className="border-t border-gray-800 py-4 text-center text-xs text-gray-500">
//         Built by Harshit · Powered by Solana
//       </footer>
//     </div>
//   );
// }

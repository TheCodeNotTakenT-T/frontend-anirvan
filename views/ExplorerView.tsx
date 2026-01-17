import React from 'react';
import { Activity, Trees, Globe, CheckCircle2 } from 'lucide-react';
import StatCard from '../components/StatCard';
import { MOCK_TXS } from '../data';

const ExplorerView = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Network Explorer</h2>
        <div className="flex gap-2 text-sm text-anirvan-muted">
          <span className="flex items-center gap-1"><div className="w-2 h-2 bg-green-500 rounded-full"></div> Mainnet Beta</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon={Activity} label="TPS (Trees Per Second)" value="24.8" sub="Live" />
        <StatCard icon={Trees} label="Active Projects" value="452" sub="+12 today" />
        <StatCard icon={Globe} label="Verified Acres" value="12,500" sub="Global coverage" />
      </div>

      <div className="bg-anirvan-card border border-white/10 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center">
          <h3 className="font-bold text-white">Recent Transactions</h3>
          <button className="text-xs bg-white/5 hover:bg-white/10 px-3 py-1 rounded text-anirvan-accent transition-colors">View All</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-black/20 text-anirvan-muted font-mono uppercase text-xs">
              <tr>
                <th className="px-6 py-3">Signature</th>
                <th className="px-6 py-3">Block</th>
                <th className="px-6 py-3">Age</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">From</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {MOCK_TXS.map((tx, i) => (
                <tr key={i} className="hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4 font-mono text-anirvan-accent cursor-pointer">{tx.hash}</td>
                  <td className="px-6 py-4 font-mono text-blue-400">{tx.slot}</td>
                  <td className="px-6 py-4 text-anirvan-muted">{tx.age}</td>
                  <td className="px-6 py-4">
                    <span className="bg-white/5 px-2 py-1 rounded text-white border border-white/10 text-xs">
                      {tx.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-anirvan-muted">{tx.from}</td>
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-1 text-green-500 bg-green-900/20 px-2 py-0.5 rounded-full text-xs w-fit">
                      <CheckCircle2 className="h-3 w-3" /> {tx.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ExplorerView;
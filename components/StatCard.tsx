import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string;
  sub: string;
  icon: LucideIcon;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, sub, icon: Icon }) => (
  <div className="bg-anirvan-card border border-white/5 p-6 rounded-xl hover:border-anirvan-accent/50 transition-colors group">
    <div className="flex justify-between items-start mb-4">
      <div className="p-2 bg-white/5 rounded-lg group-hover:bg-anirvan-primary/20 transition-colors">
        <Icon className="h-6 w-6 text-anirvan-muted group-hover:text-anirvan-accent" />
      </div>
      <span className="text-xs font-mono text-anirvan-muted bg-black/40 px-2 py-1 rounded">{label}</span>
    </div>
    <div className="text-2xl font-bold text-white mb-1">{value}</div>
    <div className="text-sm text-anirvan-primary">{sub}</div>
  </div>
);

export default StatCard;
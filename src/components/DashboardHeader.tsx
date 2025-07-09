import React from 'react';
import { Bot, Github } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ConnectionStatus } from '@/components/ConnectionStatus';

export const DashboardHeader: React.FC = () => {
  return (
    <div className="text-center space-y-4">
      <div className="flex items-center justify-between mb-4">
        <ConnectionStatus />
        <ThemeToggle />
      </div>
      <div className="flex items-center justify-center gap-4">
        <div className="neo-card p-4 neo-purple">
          <Bot className="w-8 h-8 text-black" />
        </div>
        <h1 className="text-6xl font-black uppercase tracking-wider text-shadow">
          Codex Automerger
        </h1>
        <div className="neo-card p-4 neo-green">
          <Github className="w-8 h-8 text-black" />
        </div>
      </div>
      <p className="text-xl font-bold text-muted-foreground">
        Manage your automated merge configurations with style
      </p>
    </div>
  );
};
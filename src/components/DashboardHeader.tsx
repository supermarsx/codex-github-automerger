import React from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { ConnectionManager } from '@/components/ConnectionManager';
import { GitMerge } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ApiKey } from '@/types/dashboard';

interface DashboardHeaderProps {
  apiKeys?: ApiKey[];
  darkMode: boolean;
  onThemeChange: (dark: boolean) => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ apiKeys = [], darkMode, onThemeChange }) => {
  return (
    <Card className="nb-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="nb-card nb-green p-3">
              <GitMerge className="w-8 h-8 text-white" />
            </div>
            <div>
              <CardTitle className="text-4xl font-black">AutoMerger Dashboard</CardTitle>
              <p className="text-muted-foreground font-bold">Automated pull request management system</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle darkMode={darkMode} onThemeChange={onThemeChange} />
            <ConnectionManager apiKeys={apiKeys} compact={true} />
          </div>
        </div>
      </CardHeader>
    </Card>
  );
};
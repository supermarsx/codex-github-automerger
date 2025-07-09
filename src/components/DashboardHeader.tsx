import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ConnectionManager } from '@/components/ConnectionManager';
import { Activity, GitMerge } from 'lucide-react';

interface DashboardHeaderProps {
  apiKeys?: any[];
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ apiKeys = [] }) => {
  return (
    <Card className="neo-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="neo-card neo-green p-3">
              <GitMerge className="w-8 h-8 text-white" />
            </div>
            <div>
              <CardTitle className="text-4xl font-black">AutoMerger Dashboard</CardTitle>
              <p className="text-muted-foreground font-bold">Automated pull request management system</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <ConnectionManager apiKeys={apiKeys} compact={true} />
            <ThemeToggle />
          </div>
        </div>
      </CardHeader>
    </Card>
  );
};
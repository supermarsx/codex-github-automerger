import React from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { ConnectionManager } from '@/components/ConnectionManager';
import { GitMerge } from 'lucide-react';
import { ApiKey } from '@/types/dashboard';

interface DashboardHeaderProps {
  apiKeys?: ApiKey[];
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
              <p className="text-muted-foreground">Automated pull request management system</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ConnectionManager apiKeys={apiKeys} compact={true} />
          </div>
        </div>
      </CardHeader>
    </Card>
  );
};
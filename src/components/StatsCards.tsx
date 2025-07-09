import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Repository, ApiKey, MergeStats } from '@/types/dashboard';

interface StatsCardsProps {
  repositories: Repository[];
  apiKeys: ApiKey[];
  mergeStats: MergeStats;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ repositories, apiKeys, mergeStats }) => {
  const stats = [
    {
      title: repositories.filter(r => r.enabled).length.toString(),
      label: 'Active Repos',
      color: 'neo-green',
      subtitle: `${repositories.length} total`
    },
    {
      title: apiKeys.filter(k => k.isActive).length.toString(),
      label: 'Active Keys',
      color: 'neo-blue',
      subtitle: `${apiKeys.length} total`
    },
    {
      title: mergeStats.session.pending.toString(),
      label: 'Pending',
      color: 'neo-yellow',
      subtitle: `${mergeStats.total.pending} total`
    },
    {
      title: mergeStats.session.merged.toString(),
      label: 'Merged',
      color: 'neo-green',
      subtitle: `${mergeStats.total.merged} total`
    },
    {
      title: mergeStats.session.failed.toString(),
      label: 'Failed',
      color: 'neo-red',
      subtitle: `${mergeStats.total.failed} total`
    },
    {
      title: `${((mergeStats.total.merged / (mergeStats.total.merged + mergeStats.total.failed)) * 100 || 0).toFixed(1)}%`,
      label: 'Success Rate',
      color: 'neo-purple',
      subtitle: 'All time'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {stats.map((stat, index) => (
        <Card key={index} className={`neo-card ${stat.color} p-2`}>
          <CardHeader className="pb-1">
            <CardTitle className="text-black font-black text-lg text-center">
              {stat.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-center">
            <p className="text-black font-bold text-sm">{stat.label}</p>
            <p className="text-black text-xs opacity-75">{stat.subtitle}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
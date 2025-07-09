import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Repository, ApiKey, MergeStats, StatsPeriod } from '@/types/dashboard';

interface StatsCardsProps {
  repositories: Repository[];
  apiKeys: ApiKey[];
  mergeStats: MergeStats;
  statsPeriod: StatsPeriod;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ repositories, apiKeys, mergeStats, statsPeriod }) => {
  const getStatsForPeriod = () => {
    // For session, use session stats, otherwise use total stats
    return statsPeriod === 'session' ? mergeStats.session : mergeStats.total;
  };

  const currentStats = getStatsForPeriod();
  
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
      title: currentStats.pending.toString(),
      label: 'Pending',
      color: 'neo-yellow',
      subtitle: statsPeriod === 'session' ? 'This session' : 'Total'
    },
    {
      title: currentStats.merged.toString(),
      label: 'Merged',
      color: 'neo-green',
      subtitle: statsPeriod === 'session' ? 'This session' : 'Total'
    },
    {
      title: currentStats.failed.toString(),
      label: 'Failed',
      color: 'neo-red',
      subtitle: statsPeriod === 'session' ? 'This session' : 'Total'
    },
    {
      title: `${((currentStats.merged / (currentStats.merged + currentStats.failed)) * 100 || 0).toFixed(1)}%`,
      label: 'Success Rate',
      color: 'neo-purple',
      subtitle: statsPeriod === 'session' ? 'This session' : 'Total'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {stats.map((stat, index) => (
        <Card key={index} className={`neo-card ${stat.color} p-2`}>
          <CardHeader className="pb-1">
            <CardTitle className="text-black dark:text-white font-black text-lg text-center">
              {stat.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-center">
            <p className="text-black dark:text-white font-bold text-sm">{stat.label}</p>
            <p className="text-black dark:text-white text-xs opacity-75">{stat.subtitle}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
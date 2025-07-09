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
    if (!mergeStats) return { pending: 0, merged: 0, failed: 0 };
    return statsPeriod === 'session' ? mergeStats.session : mergeStats.total;
  };

  const currentStats = getStatsForPeriod();
  const hasData = repositories.length > 0 || apiKeys.length > 0;
  
  const stats = [
    {
      title: repositories.length > 0 ? repositories.filter(r => r.enabled).length.toString() : 'N/A',
      label: 'Active Repos',
      color: 'neo-green',
      subtitle: repositories.length > 0 ? `${repositories.length} total` : 'No repositories'
    },
    {
      title: apiKeys.length > 0 ? apiKeys.filter(k => k.isActive).length.toString() : 'N/A',
      label: 'Active Keys',
      color: 'neo-blue',
      subtitle: apiKeys.length > 0 ? `${apiKeys.length} total` : 'No API keys'
    },
    {
      title: hasData ? currentStats.pending.toString() : 'N/A',
      label: 'Pending',
      color: 'neo-yellow',
      subtitle: hasData ? (statsPeriod === 'session' ? 'This session' : 'Total') : 'No data available'
    },
    {
      title: hasData ? currentStats.merged.toString() : 'N/A',
      label: 'Merged',
      color: 'neo-green',
      subtitle: hasData ? (statsPeriod === 'session' ? 'This session' : 'Total') : 'No data available'
    },
    {
      title: hasData ? currentStats.failed.toString() : 'N/A',
      label: 'Failed',
      color: 'neo-red',
      subtitle: hasData ? (statsPeriod === 'session' ? 'This session' : 'Total') : 'No data available'
    },
    {
      title: hasData ? Math.round((currentStats.merged / (currentStats.merged + currentStats.failed)) * 100 || 0).toString() + '%' : 'N/A',
      label: 'Success Rate',
      color: 'neo-purple',
      subtitle: hasData ? 'Overall performance' : 'No data available'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {stats.map((stat, index) => (
        <Card
          key={index}
          className={`neo-card ${stat.color} p-2 shadow-[4px_4px_0_theme(colors.foreground)]`}
        >
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
  );};
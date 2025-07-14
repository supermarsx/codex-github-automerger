import React from 'react';
import { Card } from '@/components/ui/card';
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
      title: repositories.length > 0 ? repositories.filter(r => r.enabled).length.toString() : '0',
      label: 'Active Repos',
      color: 'neo-green',
      subtitle: `${repositories.length} total`
    },
    {
      title: apiKeys.length > 0 ? apiKeys.filter(k => k.isActive).length.toString() : '0',
      label: 'Active Keys',
      color: 'neo-blue',
      subtitle: `${apiKeys.length} total`
    },
    {
      title: hasData ? currentStats.pending.toString() : '0',
      label: 'Pending',
      color: 'neo-yellow',
      subtitle: statsPeriod === 'session' ? 'Session' : 'Total'
    },
    {
      title: hasData ? currentStats.merged.toString() : '0',
      label: 'Merged',
      color: 'neo-green',
      subtitle: statsPeriod === 'session' ? 'Session' : 'Total'
    },
    {
      title: hasData ? currentStats.failed.toString() : '0',
      label: 'Failed',
      color: 'neo-red',
      subtitle: statsPeriod === 'session' ? 'Session' : 'Total'
    },
    {
      title: hasData ? Math.round((currentStats.merged / (currentStats.merged + currentStats.failed)) * 100 || 0).toString() + '%' : '0%',
      label: 'Success Rate',
      color: 'neo-purple',
      subtitle: 'Performance'
    }
  ];

  return (
    <div className="flex gap-2 overflow-x-auto py-2">
      {stats.map((stat, index) => (
        <Card
          key={index}
          className={`neo-card ${stat.color} p-3 min-w-[110px] flex-shrink-0 shadow-[3px_3px_0_hsl(var(--foreground))]`}
        >
          <div className="text-center">
            <div className="text-black dark:text-white font-black text-base mb-1">
              {stat.title}
            </div>
            <div className="text-black dark:text-white font-bold text-xs mb-1">{stat.label}</div>
            <div className="text-black dark:text-white text-xs opacity-75">{stat.subtitle}</div>
          </div>
        </Card>
      ))}
    </div>
  );
};
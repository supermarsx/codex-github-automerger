import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, Search, Filter, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'success' | 'debug';
  category: string;
  message: string;
  details?: any;
}

interface LogsTabProps {
  logs: LogEntry[];
  onExportLogs: () => void;
  onClearLogs: () => void;
}

export const LogsTab: React.FC<LogsTabProps> = ({ logs, onExportLogs, onClearLogs }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const { toast } = useToast();

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = levelFilter === 'all' || log.level === levelFilter;
    return matchesSearch && matchesLevel;
  });

  const handleExportLogs = () => {
    onExportLogs();
    toast({ title: "Logs exported successfully!" });
  };

  const handleClearLogs = () => {
    onClearLogs();
    toast({ title: "Logs cleared" });
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'success': return 'neo-green';
      case 'info': return 'neo-blue';
      case 'warn': return 'neo-yellow';
      case 'error': return 'neo-red';
      case 'debug': return 'neo-purple';
      default: return 'neo-blue';
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto text-sm">
      <Card className="neo-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-black flex items-center gap-2">
                <FileText className="w-6 h-6" />
                Activity Logs
              </CardTitle>
              <CardDescription className="font-bold">
                Track all system actions and events
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleExportLogs} className="neo-button">
                <Download className="w-4 h-4 mr-2" />
                Export Logs
              </Button>
              <Button onClick={handleClearLogs} variant="outline" className="neo-button-secondary">
                <Trash2 className="w-4 h-4 mr-2" />

                Clear Logs
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="neo-input"
              />
            </div>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="neo-input px-3 py-2"
            >
              <option value="all">All Levels</option>
              <option value="debug">Debug</option>
              <option value="info">Info</option>
              <option value="success">Success</option>
              <option value="warn">Warning</option>
              <option value="error">Error</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {filteredLogs.map((log) => (
          <Card key={log.id} className="neo-card">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Badge className={`neo-card ${getLevelColor(log.level)} text-white font-bold`}>
                      {log.level.toUpperCase()}
                    </Badge>
                    <Badge variant="secondary" className="neo-card text-white font-bold">
                      {log.category}
                    </Badge>
                    <span className="text-sm text-muted-foreground font-bold">
                      {log.timestamp.toLocaleString()}
                    </span>
                  </div>
                  <p className="font-bold text-foreground">{log.message}</p>
                  {log.details && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm text-muted-foreground font-bold">
                        View Details
                      </summary>
                      <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {filteredLogs.length === 0 && (
          <Card className="neo-card">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground font-bold">No logs match your filters</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
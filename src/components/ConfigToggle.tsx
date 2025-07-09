import React, { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { CheckCircle } from 'lucide-react';

interface ConfigToggleProps {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  description?: string;
}

export const ConfigToggle: React.FC<ConfigToggleProps> = ({
  id,
  label,
  checked,
  onCheckedChange,
  description
}) => {
  const [showTick, setShowTick] = useState(false);

  const handleChange = (newChecked: boolean) => {
    onCheckedChange(newChecked);
    setShowTick(true);
    setTimeout(() => setShowTick(false), 1000);
  };

  return (
    <div className="grid grid-cols-2 items-center gap-4">
      <div className="flex items-center gap-2">
        <Label htmlFor={id} className="font-bold">{label}</Label>
        {showTick && (
          <CheckCircle className="w-4 h-4 text-green-500 animate-pulse" />
        )}
      </div>
      <div className="flex items-center gap-2">
        <Switch
          id={id}
          checked={checked}
          onCheckedChange={handleChange}
        />
        {description && (
          <span className="text-sm text-muted-foreground">{description}</span>
        )}
      </div>
    </div>
  );
};
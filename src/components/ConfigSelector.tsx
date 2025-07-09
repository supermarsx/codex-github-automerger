import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { CheckCircle } from 'lucide-react';

interface ConfigSelectorProps {
  id: string;
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  options?: Array<{ value: string; label: string }>;
  type?: 'select' | 'number' | 'color';
  placeholder?: string;
  min?: number;
  max?: number;
}

export const ConfigSelector: React.FC<ConfigSelectorProps> = ({
  id,
  label,
  value,
  onChange,
  options = [],
  type = 'select',
  placeholder,
  min,
  max
}) => {
  const [showTick, setShowTick] = useState(false);

  const handleChange = (newValue: string) => {
    onChange(newValue);
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
        {type === 'select' ? (
          <Select value={value.toString()} onValueChange={handleChange}>
            <SelectTrigger className="neo-input">
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            id={id}
            type={type === 'number' ? 'number' : 'color'}
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            className="neo-input"
            min={min}
            max={max}
            placeholder={placeholder}
          />
        )}
      </div>
    </div>
  );};
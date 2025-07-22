import React from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ThemeToggleProps {
  theme: 'light' | 'dark' | 'bw';
  onThemeChange: (theme: 'light' | 'dark' | 'bw') => void;
}

export const ThemeToggle = ({ theme, onThemeChange }: ThemeToggleProps) => {
  const { theme: currentTheme, setTheme } = useTheme();

  const toggleTheme = () => {
    const order = ['light', 'dark', 'bw'] as const;
    const idx = order.indexOf(currentTheme as 'light' | 'dark' | 'bw');
    const newTheme = order[(idx + 1) % order.length];
    setTheme(newTheme);
    onThemeChange(newTheme);
  };

  return (
    <Button
      onClick={toggleTheme}
      className="neo-button-secondary"
      size="sm"
    >
      {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </Button>
  );
};
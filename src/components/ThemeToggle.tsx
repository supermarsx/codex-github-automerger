import React from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ThemeToggleProps {
  darkMode: boolean;
  onThemeChange: (dark: boolean) => void;
}

export const ThemeToggle = ({ darkMode, onThemeChange }: ThemeToggleProps) => {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    onThemeChange(newTheme === 'dark');
  };

  return (
    <Button
      onClick={toggleTheme}
      className="neo-button-secondary"
      size="sm"
    >
      {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </Button>
  );
};
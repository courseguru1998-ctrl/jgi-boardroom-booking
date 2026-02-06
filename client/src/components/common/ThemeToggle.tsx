import { Moon, Sun, Monitor } from 'lucide-react';
import { useThemeStore } from '@/store/theme';
import { cn } from '@/utils/cn';

export function ThemeToggle() {
  const { theme, setTheme } = useThemeStore();

  const options = [
    { value: 'light' as const, icon: Sun, label: 'Light' },
    { value: 'dark' as const, icon: Moon, label: 'Dark' },
    { value: 'system' as const, icon: Monitor, label: 'System' },
  ];

  return (
    <div className="flex items-center gap-1 p-1 bg-muted rounded-xl">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => setTheme(option.value)}
          className={cn(
            'p-2 rounded-lg transition-all duration-200',
            theme === option.value
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-foreground-muted hover:text-foreground hover:bg-background'
          )}
          title={option.label}
        >
          <option.icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}

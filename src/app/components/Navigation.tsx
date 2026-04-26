import { Home, MapPin, Trophy, Settings, UtensilsCrossed } from 'lucide-react';

interface NavigationProps {
  activeSection: 'welcome' | 'routes' | 'local-eats' | 'settings';
  onSectionChange: (section: 'welcome' | 'routes' | 'local-eats' | 'settings') => void;
  streakCount: number;
}

export function Navigation({ activeSection, onSectionChange, streakCount }: NavigationProps) {
  const navItems = [
    { id: 'welcome' as const, icon: Home, label: 'Home' },
    { id: 'routes' as const, icon: MapPin, label: 'Routes' },
    { id: 'local-eats' as const, icon: UtensilsCrossed, label: 'Eats' },
    { id: 'settings' as const, icon: Settings, label: 'Settings' }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[var(--color-border)] z-50 safe-area-inset-bottom">
      <div className="flex items-center justify-around px-2 py-2 max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={`relative flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-all ${
                isActive
                  ? 'text-[var(--color-primary)]'
                  : 'text-[var(--color-textMuted)]'
              }`}
            >
              <div className="relative">
                <Icon className={`w-6 h-6 ${isActive ? 'scale-110' : ''} transition-transform`} />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-2 -right-2 w-5 h-5 bg-[var(--color-primary)] text-white text-xs rounded-full flex items-center justify-center font-bold">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className={`text-xs font-medium ${isActive ? 'font-semibold' : ''}`}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-[var(--color-primary)] rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
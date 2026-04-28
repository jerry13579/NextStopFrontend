import { Home, MapPin, Settings, UtensilsCrossed } from 'lucide-react';

interface NavigationProps {
  activeSection: 'welcome' | 'routes' | 'local-eats' | 'settings';
  onSectionChange: (section: 'welcome' | 'routes' | 'local-eats' | 'settings') => void;
}

export function Navigation({ activeSection, onSectionChange }: NavigationProps) {
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

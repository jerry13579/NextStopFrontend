import { X, CreditCard, AlertTriangle, Users, Heart } from 'lucide-react';

interface BoardingRemindersProps {
  onClose: () => void;
  busNumber: string;
}

export function BoardingReminders({ onClose, busNumber }: BoardingRemindersProps) {
  const reminders = [
    {
      icon: <CreditCard className="w-6 h-6 text-[var(--color-primary)]" />,
      title: 'Have your Clipper card ready',
      description: 'Prepare your fare before boarding to speed up the process'
    },
    {
      icon: <AlertTriangle className="w-6 h-6 text-yellow-600" />,
      title: 'Watch out for the bus',
      description: 'Stay far away from the street and curb until the bus comes to a complete stop'
    },
    {
      icon: <Users className="w-6 h-6 text-[var(--color-secondary)]" />,
      title: 'Let passengers exit first',
      description: 'Allow everyone to leave the bus before boarding. Watch out for people with wheelchairs or mobility devices'
    },
    {
      icon: <Heart className="w-6 h-6 text-[var(--color-primary)]" />,
      title: 'Offer seats to those who need them',
      description: 'Give priority seating to seniors, pregnant individuals, and people with disabilities'
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] text-white p-6 rounded-t-2xl">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-3xl">🚌</span>
                <h2 className="text-2xl font-bold">Bus {busNumber}</h2>
              </div>
              <p className="text-white/90">Quick reminders before boarding</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Reminders List */}
        <div className="p-6 space-y-4">
          {reminders.map((reminder, index) => (
            <div
              key={index}
              className="bg-[var(--color-background)] rounded-xl p-4 border border-[var(--color-border)] hover:border-[var(--color-primary)] transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-white rounded-xl flex-shrink-0 shadow-sm">
                  {reminder.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-[var(--color-textPrimary)] mb-1">
                    {reminder.title}
                  </h3>
                  <p className="text-sm text-[var(--color-textMuted)]">
                    {reminder.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-6 pt-0">
          <div className="bg-[var(--color-accent)] border border-[var(--color-border)] rounded-xl p-4">
            <p className="text-sm text-[var(--color-textSecondary)] text-center">
              Stay safe and courteous! 💙
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-full mt-4 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] text-white font-semibold py-3 px-6 rounded-xl hover:opacity-90 transition-opacity"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}

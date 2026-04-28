import { useState } from 'react';
import { Check, X, Palette } from 'lucide-react';
import { ColorTheme, createCustomTheme, saveCustomTheme } from '../utils/colorThemes';

interface CustomThemeCreatorProps {
  onSave: (theme: ColorTheme) => void;
  onClose: () => void;
  initialColors?: ColorTheme['colors'];
}

export function CustomThemeCreator({ onSave, onClose, initialColors }: CustomThemeCreatorProps) {
  const [colors, setColors] = useState<ColorTheme['colors']>(initialColors || {
    primary: '#d4a5a5',
    secondary: '#b8c5d6',
    accent: '#e8dfd6',
    background: '#faf8f6',
    surface: '#ffffff',
    border: '#e3ddd5',
    textPrimary: '#4a4a4a',
    textSecondary: '#6a6a6a',
    textMuted: '#8b8680'
  });

  const handleColorChange = (key: keyof ColorTheme['colors'], value: string) => {
    setColors(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    const customTheme = createCustomTheme(colors);
    saveCustomTheme(customTheme);
    onSave(customTheme);
  };

  const colorFields: { key: keyof ColorTheme['colors']; label: string; description: string }[] = [
    { key: 'primary', label: 'Primary Color', description: 'Main brand color for buttons and accents' },
    { key: 'secondary', label: 'Secondary Color', description: 'Supporting color for highlights' },
    { key: 'accent', label: 'Accent Color', description: 'Subtle background accents' },
    { key: 'background', label: 'Background', description: 'Main page background color' },
    { key: 'surface', label: 'Surface', description: 'Cards and container backgrounds' },
    { key: 'border', label: 'Border', description: 'Border and divider color' },
    { key: 'textPrimary', label: 'Primary Text', description: 'Main heading and body text' },
    { key: 'textSecondary', label: 'Secondary Text', description: 'Supporting text' },
    { key: 'textMuted', label: 'Muted Text', description: 'Subtle text and hints' }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] text-white p-6 rounded-t-3xl">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Palette className="w-6 h-6" />
                <h2 className="text-2xl font-bold">Create Your Theme</h2>
              </div>
              <p className="text-white/90">Customize every color to make NextStop yours</p>
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

        {/* Color Pickers */}
        <div className="p-6 space-y-4">
          {colorFields.map(({ key, label, description }) => (
            <div key={key} className="bg-[var(--color-background)] rounded-xl p-4 border border-[var(--color-border)]">
              <div className="flex items-start gap-4">
                {/* Color Preview */}
                <div
                  className="w-16 h-16 rounded-xl shadow-md border-2 border-white flex-shrink-0"
                  style={{ backgroundColor: colors[key] }}
                />

                {/* Color Info and Input */}
                <div className="flex-1">
                  <label className="block font-semibold text-[var(--color-textPrimary)] mb-1">
                    {label}
                  </label>
                  <p className="text-sm text-[var(--color-textMuted)] mb-3">
                    {description}
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={colors[key]}
                      onChange={(e) => handleColorChange(key, e.target.value)}
                      className="w-12 h-10 rounded-lg cursor-pointer border-2 border-[var(--color-border)]"
                    />
                    <input
                      type="text"
                      value={colors[key]}
                      onChange={(e) => handleColorChange(key, e.target.value)}
                      className="flex-1 px-3 py-2 bg-white border-2 border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] transition-colors font-mono text-sm"
                      placeholder="#000000"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Preview Section */}
        <div className="px-6 pb-6">
          <div className="bg-[var(--color-background)] rounded-xl p-4 border-2 border-[var(--color-border)]">
            <p className="text-sm font-semibold text-[var(--color-textPrimary)] mb-3">Preview</p>
            <div
              className="rounded-xl p-4 border-2"
              style={{
                background: `linear-gradient(to bottom right, ${colors.primary}, ${colors.secondary})`,
                borderColor: colors.primary
              }}
            >
              <div
                className="rounded-lg p-4"
                style={{ backgroundColor: colors.surface }}
              >
                <h3 className="font-bold mb-2" style={{ color: colors.textPrimary }}>
                  Sample Card
                </h3>
                <p className="text-sm mb-2" style={{ color: colors.textSecondary }}>
                  This is how your text will look with the new theme.
                </p>
                <p className="text-xs" style={{ color: colors.textMuted }}>
                  Muted text for subtle information
                </p>
                <div className="mt-3 flex gap-2">
                  <div
                    className="px-4 py-2 rounded-lg text-white font-semibold text-sm"
                    style={{ backgroundColor: colors.primary }}
                  >
                    Primary Button
                  </div>
                  <div
                    className="px-4 py-2 rounded-lg text-white font-semibold text-sm"
                    style={{ backgroundColor: colors.secondary }}
                  >
                    Secondary Button
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="sticky bottom-0 bg-white p-6 border-t border-[var(--color-border)] rounded-b-3xl flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-[var(--color-accent)] text-[var(--color-textSecondary)] font-semibold rounded-xl hover:bg-[var(--color-border)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-6 py-3 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] text-white font-semibold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <Check className="w-5 h-5" />
            Save Custom Theme
          </button>
        </div>
      </div>
    </div>
  );
}

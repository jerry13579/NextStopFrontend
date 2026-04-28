import { Check, Plus, Edit2, Trash2 } from 'lucide-react';
import { COLOR_THEMES, ColorTheme } from '../utils/colorThemes';
import { useState } from 'react';

interface ColorThemeSelectorProps {
  currentTheme: string;
  onThemeChange: (themeId: string) => void;
  customTheme?: ColorTheme | null;
  onCreateCustom: () => void;
  onEditCustom?: () => void;
  onDeleteCustom?: () => void;
}

export function ColorThemeSelector({ currentTheme, onThemeChange, customTheme, onCreateCustom, onEditCustom, onDeleteCustom }: ColorThemeSelectorProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const allThemes = customTheme ? [...COLOR_THEMES, customTheme] : COLOR_THEMES;

  const handleDeleteCustom = () => {
    if (onDeleteCustom) {
      onDeleteCustom();
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {allThemes.map((theme) => {
          const isSelected = currentTheme === theme.id;
          const isCustom = theme.id === 'custom';

          return (
            <button
              key={theme.id}
              onClick={() => onThemeChange(theme.id)}
              className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                isSelected
                  ? 'border-[var(--color-primary)] bg-gradient-to-br from-white to-[var(--color-accent)] shadow-md'
                  : 'border-[var(--color-border)] hover:border-[var(--color-primary)] hover:shadow-sm'
              }`}
            >
              {/* Selected Indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}

              {/* Edit/Delete Custom Buttons */}
              {isCustom && !isSelected && (
                <div className="absolute top-2 right-2 flex gap-1">
                  {onEditCustom && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditCustom();
                      }}
                      className="w-6 h-6 rounded-full bg-[var(--color-infoSurface)] hover:opacity-90 flex items-center justify-center transition-colors"
                      title="Edit custom theme"
                    >
                      <Edit2 className="w-3 h-3 text-[var(--color-info)]" />
                    </button>
                  )}
                  {onDeleteCustom && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteConfirm(true);
                      }}
                      className="w-6 h-6 rounded-full bg-[var(--color-dangerSurface)] hover:opacity-90 flex items-center justify-center transition-colors"
                      title="Delete custom theme"
                    >
                      <Trash2 className="w-3 h-3 text-[var(--color-danger)]" />
                    </button>
                  )}
                </div>
              )}

              {/* Theme Preview */}
              <div className="flex items-center gap-3 mb-3">
                <div className="text-2xl">{theme.emoji}</div>
                <div className="flex-1">
                  <p className="font-semibold text-[var(--color-textPrimary)] text-sm">
                    {theme.name}
                  </p>
                </div>
              </div>

              {/* Color Swatches */}
              <div className="flex gap-1.5">
                <div
                  className="w-8 h-8 rounded-lg shadow-sm"
                  style={{ backgroundColor: theme.colors.primary }}
                />
                <div
                  className="w-8 h-8 rounded-lg shadow-sm"
                  style={{ backgroundColor: theme.colors.secondary }}
                />
                <div
                  className="w-8 h-8 rounded-lg shadow-sm border border-[var(--color-border)]"
                  style={{ backgroundColor: theme.colors.accent }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Create Custom Theme Button */}
      <button
        onClick={onCreateCustom}
        className="w-full px-4 py-4 border-2 border-dashed border-[var(--color-border)] hover:border-[var(--color-primary)] rounded-xl transition-all flex items-center justify-center gap-2 text-[var(--color-textSecondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-accent)]"
      >
        <Plus className="w-5 h-5" />
        <span className="font-semibold">
          {customTheme ? 'Edit Custom Theme' : 'Create Custom Theme'}
        </span>
      </button>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-[var(--color-dangerSurface)] rounded-full flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-[var(--color-danger)]" />
              </div>
              <div>
                <h3 className="font-bold text-[var(--color-textPrimary)]">Delete Custom Theme?</h3>
                <p className="text-sm text-[var(--color-textMuted)]">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-[var(--color-textSecondary)] mb-6">
              Your custom theme colors will be permanently deleted. You can always create a new custom theme later.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2.5 bg-[var(--color-accent)] text-[var(--color-textSecondary)] font-semibold rounded-xl hover:bg-[var(--color-border)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCustom}
                className="flex-1 px-4 py-2.5 bg-[var(--color-danger)] text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

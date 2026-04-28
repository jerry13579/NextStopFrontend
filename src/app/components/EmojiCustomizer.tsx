import { useState } from 'react';
import { Smile, Search, Sparkles } from 'lucide-react';

interface EmojiPickerProps {
  currentEmoji: string;
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

const EMOJI_CATEGORIES = {
  'Popular': ['📚', '📖', '✏️', '📝', '🎓', '🔬', '🧪', '⚗️', '🔭', '🧬', '💻', '🖥️', '⌨️', '🖱️', '🎨', '🖌️', '🎭', '🎪', '🎬', '📷'],
  'Academic': ['📐', '📏', '📊', '📈', '🗂️', '📋', '📌', '📍', '🔖', '🏷️', '💼', '🗄️', '🗃️', '📁', '📂', '🗂️', '📄', '📃', '📰', '🗞️'],
  'Science': ['🔬', '🧪', '⚗️', '🔭', '🧬', '🦠', '💊', '🩺', '🧮', '🔢', '➕', '➖', '✖️', '➗', '🟰', '♾️', '🔺', '🔻', '◼️', '◻️'],
  'Creative': ['🎨', '🖌️', '🖍️', '✏️', '✒️', '🖊️', '🖋️', '📝', '🎭', '🎪', '🎬', '🎤', '🎧', '🎼', '🎹', '🎸', '🎺', '🎻', '🥁', '🎷'],
  'Nature': ['🌱', '🌿', '🍀', '🌾', '🌳', '🌲', '🌴', '🌵', '🌊', '🔥', '⚡', '💧', '❄️', '🌈', '⭐', '✨', '💫', '🌙', '☀️', '🌤️'],
  'Objects': ['⚽', '🏀', '⚾', '🎾', '🏐', '🏈', '🏉', '🎱', '🎮', '🎯', '🎲', '🃏', '🧩', '🔑', '🔓', '🔒', '🔐', '🔏', '🧰', '🔧']
};

export function EmojiPicker({ currentEmoji, onSelect, onClose }: EmojiPickerProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<keyof typeof EMOJI_CATEGORIES>('Popular');

  const filteredEmojis = search
    ? Object.values(EMOJI_CATEGORIES).flat().filter(emoji => emoji.includes(search))
    : EMOJI_CATEGORIES[selectedCategory];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-[var(--color-border)]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[var(--color-primary)]" />
              <h3 className="font-semibold text-[var(--color-textPrimary)]">Pick an Emoji</h3>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-[var(--color-accent)] flex items-center justify-center text-[var(--color-textMuted)]"
            >
              ✕
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-textMuted)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search emojis..."
              className="w-full pl-9 pr-4 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            />
          </div>
        </div>

        {/* Categories */}
        {!search && (
          <div className="flex gap-1 p-2 border-b border-[var(--color-border)] overflow-x-auto">
            {Object.keys(EMOJI_CATEGORIES).map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category as keyof typeof EMOJI_CATEGORIES)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === category
                    ? 'bg-[var(--color-accent)] text-[var(--color-primary)]'
                    : 'text-[var(--color-textSecondary)] hover:bg-[var(--color-accent)]'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        )}

        {/* Emoji Grid */}
        <div className="p-4 max-h-80 overflow-y-auto">
          <div className="grid grid-cols-8 gap-2">
            {filteredEmojis.map((emoji, index) => (
              <button
                key={index}
                onClick={() => {
                  onSelect(emoji);
                  onClose();
                }}
                className={`w-10 h-10 text-2xl rounded-lg hover:bg-[var(--color-accent)] transition-colors ${
                  emoji === currentEmoji ? 'bg-[var(--color-accent)] ring-2 ring-[var(--color-primary)]' : ''
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-background)] rounded-b-2xl">
          <p className="text-xs text-[var(--color-textSecondary)] text-center">
            Tap an emoji to select it for your class
          </p>
        </div>
      </div>
    </div>
  );
}

interface ClassEmojiCustomizerProps {
  classCode: string;
  className: string;
  currentEmoji: string;
  onEmojiChange: (emoji: string) => void;
  compact?: boolean;
}

export function ClassEmojiCustomizer({
  classCode,
  className,
  currentEmoji,
  onEmojiChange,
  compact = false
}: ClassEmojiCustomizerProps) {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowPicker(true)}
        className={`flex items-center gap-3 rounded-xl hover:bg-[var(--color-accent)] transition-colors group text-left ${compact ? 'p-1' : 'w-full p-3'}`}
      >
        <div className={compact ? 'text-2xl' : 'text-3xl'}>{currentEmoji}</div>
        {!compact && (
          <div className="flex-1">
            <p className="font-semibold text-[var(--color-textPrimary)]">{classCode}</p>
            <p className="text-sm text-[var(--color-textSecondary)]">{className}</p>
          </div>
        )}
        <Smile className="w-5 h-5 text-[var(--color-textMuted)] group-hover:text-[var(--color-primary)] transition-colors" />
      </button>

      {showPicker && (
        <EmojiPicker
          currentEmoji={currentEmoji}
          onSelect={onEmojiChange}
          onClose={() => setShowPicker(false)}
        />
      )}
    </>
  );
}

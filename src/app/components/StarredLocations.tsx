import { useEffect, useState } from 'react';
import { Star, Plus, X, MapPin, Edit2, Trash2, Search, Loader2 } from 'lucide-react';
import { EmojiPicker } from './EmojiCustomizer';
import { Coordinates, LocationSearchResult, searchLocations } from '../utils/api';

export interface StarredLocation {
  id: string;
  name: string;
  address: string;
  emoji: string;
  notes?: string;
  lat: number;
  lng: number;
}

interface StarredLocationsProps {
  locations: StarredLocation[];
  onAdd: (location: Omit<StarredLocation, 'id'>) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, location: Partial<StarredLocation>) => void;
  onSelect?: (location: StarredLocation) => void;
  userLocation?: Coordinates | null;
}

const DEFAULT_LOCATION = {
  name: '',
  address: '',
  emoji: '📍',
  notes: '',
  lat: 37.8719,
  lng: -122.2585,
};

export function StarredLocations({ locations, onAdd, onRemove, onUpdate, onSelect, userLocation }: StarredLocationsProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiPickerFor, setEmojiPickerFor] = useState<string | 'new'>('new');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LocationSearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [newLocation, setNewLocation] = useState(DEFAULT_LOCATION);

  useEffect(() => {
    if (!showAddForm || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      setSearchError(null);
      return;
    }

    let ignore = false;
    const timeout = window.setTimeout(() => {
      setIsSearching(true);
      searchLocations(searchQuery, userLocation)
        .then((results) => {
          if (ignore) return;
          setSearchResults(results);
          setSearchError(null);
        })
        .catch(() => {
          if (ignore) return;
          setSearchResults([]);
          setSearchError('Places search is temporarily unavailable.');
        })
        .finally(() => {
          if (!ignore) setIsSearching(false);
        });
    }, 250);

    return () => {
      ignore = true;
      window.clearTimeout(timeout);
    };
  }, [searchQuery, showAddForm, userLocation]);

  const resetNewLocation = () => {
    setNewLocation(DEFAULT_LOCATION);
    setSearchQuery('');
    setSearchResults([]);
    setShowSuggestions(false);
    setSearchError(null);
  };

  const handleSelectSuggestion = (suggestion: LocationSearchResult) => {
    setNewLocation((prev) => ({
      ...prev,
      name: suggestion.name,
      address: suggestion.address || suggestion.name,
      lat: suggestion.lat,
      lng: suggestion.lng,
    }));
    setSearchQuery(suggestion.name || suggestion.address || '');
    setShowSuggestions(false);
  };

  const handleAdd = () => {
    if (!newLocation.name || !newLocation.address) return;
    onAdd(newLocation);
    resetNewLocation();
    setShowAddForm(false);
  };

  const handleEmojiSelect = (locationId: string | 'new', emoji: string) => {
    if (locationId === 'new') {
      setNewLocation((prev) => ({ ...prev, emoji }));
      return;
    }
    onUpdate(locationId, { emoji });
  };

  return (
    <div className="bg-white rounded-2xl border border-[#e3ddd5] shadow-sm">
      <div className="p-6 border-b border-[#e3ddd5]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-[#e8c7a6] fill-[#e8c7a6]" />
            <h2 className="font-semibold text-[#4a4a4a]">Starred Locations</h2>
          </div>
          <button
            onClick={() => {
              setShowAddForm((prev) => !prev);
              if (showAddForm) resetNewLocation();
            }}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f0e8e8] text-[#8f4f4f] transition-colors hover:bg-[#e8dfd6]"
            aria-label="Add starred location"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="p-6 bg-[#faf8f6] border-b border-[#e3ddd5]">
          <div className="space-y-3">
            <div className="relative">
              <div className="flex items-center gap-2 px-4 py-2 border border-[#d4cec4] rounded-lg bg-white">
                {isSearching ? (
                  <Loader2 className="w-5 h-5 text-[#8b8680] animate-spin" />
                ) : (
                  <Search className="w-5 h-5 text-[#8b8680]" />
                )}
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Search any place"
                  className="flex-1 focus:outline-none text-sm"
                />
              </div>

              {showSuggestions && (searchQuery || searchError) && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#e3ddd5] rounded-lg shadow-lg max-h-60 overflow-y-auto z-20">
                  {searchResults.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      onClick={() => handleSelectSuggestion(suggestion)}
                      className="w-full px-4 py-3 text-left hover:bg-[#faf8f6] transition-colors border-b border-[#e3ddd5] last:border-b-0"
                    >
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-[#8b8680] mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-[#4a4a4a] text-sm">{suggestion.name}</p>
                          {suggestion.address && (
                            <p className="text-xs text-[#8b8680] mt-0.5">{suggestion.address}</p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                  {!isSearching && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
                    <div className="px-4 py-3 text-sm text-[#8b8680]">
                      {searchError || 'No places found yet. Try a more specific search.'}
                    </div>
                  )}
                </div>
              )}
            </div>

            {newLocation.name && (
              <div className="bg-white border border-[#e3ddd5] rounded-lg p-3">
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => {
                      setEmojiPickerFor('new');
                      setShowEmojiPicker(true);
                    }}
                    className="text-3xl p-1 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    {newLocation.emoji}
                  </button>
                  <div className="flex-1">
                    <p className="font-semibold text-[#4a4a4a]">{newLocation.name}</p>
                    <div className="flex items-center gap-1.5 text-sm text-[#8b8680] mt-0.5">
                      <MapPin className="w-3 h-3" />
                      <span>{newLocation.address}</span>
                    </div>
                  </div>
                  <button
                    onClick={resetNewLocation}
                    className="p-1 rounded-lg hover:bg-[#f5f1ec] text-[#8b8680]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            <input
              type="text"
              value={newLocation.notes}
              onChange={(e) => setNewLocation((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Add notes (optional)"
              className="w-full px-4 py-2 border border-[#e3ddd5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a5a5] text-sm"
            />

            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                disabled={!newLocation.name || !newLocation.address}
                className="flex-1 px-4 py-2 bg-[#d4a5a5] text-white rounded-lg hover:bg-[#c69595] transition-colors disabled:bg-[#d4cec4] disabled:cursor-not-allowed font-medium"
              >
                Add Location
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  resetNewLocation();
                }}
                className="px-4 py-2 bg-[#ede9e4] text-[#6a6a6a] rounded-lg hover:bg-[#e3ddd5] transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="divide-y divide-[#e3ddd5]">
        {locations.length === 0 ? (
          <div className="p-8 text-center">
            <MapPin className="w-12 h-12 text-[#d4cec4] mx-auto mb-3" />
            <p className="text-[#8b8680] mb-1">No starred locations yet</p>
            <p className="text-sm text-[#aba59a]">
              Save any destination you want quick access to later.
            </p>
          </div>
        ) : (
          locations.map((location) => (
            <div
              key={location.id}
              onClick={() => {
                if (editingId !== location.id) onSelect?.(location);
              }}
              onKeyDown={(event) => {
                if (!onSelect || editingId === location.id) return;
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelect(location);
                }
              }}
              role={onSelect && editingId !== location.id ? 'button' : undefined}
              tabIndex={onSelect && editingId !== location.id ? 0 : undefined}
              className={`p-4 hover:bg-[#faf8f6] transition-colors ${
                editingId === location.id ? 'bg-[#f5f1ec]' : ''
              } ${onSelect && editingId !== location.id ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#d4a5a5] focus:ring-inset' : ''}`}
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    setEmojiPickerFor(location.id);
                    setShowEmojiPicker(true);
                  }}
                  className="text-2xl p-1 rounded-lg hover:bg-[#ede9e4] transition-colors"
                >
                  {location.emoji}
                </button>
                <div className="flex-1">
                  {editingId === location.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={location.name}
                        onChange={(e) => onUpdate(location.id, { name: e.target.value })}
                        className="w-full px-3 py-1.5 border border-[#e3ddd5] rounded-lg text-sm"
                      />
                      <input
                        type="text"
                        value={location.address}
                        onChange={(e) => onUpdate(location.id, { address: e.target.value })}
                        className="w-full px-3 py-1.5 border border-[#e3ddd5] rounded-lg text-sm"
                      />
                      <input
                        type="text"
                        value={location.notes || ''}
                        onChange={(e) => onUpdate(location.id, { notes: e.target.value })}
                        placeholder="Notes (optional)"
                        className="w-full px-3 py-1.5 border border-[#e3ddd5] rounded-lg text-sm"
                      />
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1.5 bg-[#d4a5a5] text-white rounded-lg text-sm font-medium"
                      >
                        Done
                      </button>
                    </div>
                  ) : (
                    <>
                      <h3 className="font-semibold text-[#4a4a4a]">{location.name}</h3>
                      <div className="flex items-center gap-1.5 text-sm text-[#8b8680] mt-0.5">
                        <MapPin className="w-3 h-3" />
                        <span>{location.address}</span>
                      </div>
                      {location.notes && (
                        <p className="text-sm text-[#8b8680] mt-1">{location.notes}</p>
                      )}
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      setEditingId(editingId === location.id ? null : location.id);
                    }}
                    className="p-1.5 rounded-lg hover:bg-[#ede9e4] text-[#8b8680] hover:text-[#b8c5d6] transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      onRemove(location.id);
                    }}
                    className="p-1.5 rounded-lg hover:bg-[#ffeaea] text-[#8b8680] hover:text-[#e57373] transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showEmojiPicker && (
        <EmojiPicker
          onSelect={(emoji) => {
            handleEmojiSelect(emojiPickerFor, emoji);
            setShowEmojiPicker(false);
          }}
          onClose={() => setShowEmojiPicker(false)}
        />
      )}
    </div>
  );
}

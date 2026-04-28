import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Clock, Coffee, Heart, IceCream, Loader2, MapPin, Navigation, Percent, Sandwich, Sparkles, Star, Tag, UtensilsCrossed } from 'lucide-react';
import { Coordinates, fetchLocalEats, LocalEat, setLocalEatFavorite } from '../utils/api';

type FilterId = 'all' | 'cafe' | 'restaurant' | 'quick-bites' | 'dessert' | 'deals';

interface LocalEatsSectionProps {
  token?: string | null;
  userLocation?: Coordinates | null;
}

const FILTERS: Array<{ id: FilterId; label: string; icon: typeof UtensilsCrossed }> = [
  { id: 'all', label: 'All', icon: UtensilsCrossed },
  { id: 'deals', label: 'Student Deals', icon: Tag },
  { id: 'cafe', label: 'Cafes', icon: Coffee },
  { id: 'restaurant', label: 'Restaurants', icon: UtensilsCrossed },
  { id: 'quick-bites', label: 'Quick Bites', icon: Sandwich },
  { id: 'dessert', label: 'Dessert', icon: IceCream },
];

function priceSymbol(level: number) {
  return '$'.repeat(Math.max(1, Math.min(level, 4)));
}

function formatDistance(eat: LocalEat) {
  if (typeof eat.distance_miles !== 'number') return 'Nearby';
  return `${eat.distance_miles.toFixed(eat.distance_miles < 1 ? 1 : 0)} mi`;
}

function formatWalkTime(eat: LocalEat) {
  if (typeof eat.walk_time_minutes !== 'number') return 'Walk time unavailable';
  return `${Math.round(eat.walk_time_minutes)} min walk`;
}

export function LocalEatsSection({ token, userLocation }: LocalEatsSectionProps) {
  const [selectedFilter, setSelectedFilter] = useState<FilterId>('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [eats, setEats] = useState<LocalEat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [favoriteSavingIds, setFavoriteSavingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function loadEats() {
      setIsLoading(true);
      setError(null);
      try {
        const results = await fetchLocalEats({
          category: selectedFilter === 'all' || selectedFilter === 'deals' ? null : selectedFilter,
          dealsOnly: selectedFilter === 'deals',
          favoritesOnly: showFavoritesOnly,
          location: userLocation,
          token,
          signal: controller.signal,
        });
        if (cancelled) return;
        setEats(results);
      } catch {
        if (cancelled) return;
        setEats([]);
        setError('Local Eats is waiting on backend restaurant data.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadEats();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [selectedFilter, showFavoritesOnly, token, userLocation]);

  const dealsCount = useMemo(() => eats.filter((eat) => eat.student_discount).length, [eats]);

  const toggleFavorite = async (eat: LocalEat) => {
    const nextFavorite = !eat.is_favorite;
    setFavoriteSavingIds((prev) => new Set([...prev, eat.id]));
    setEats((prev) => prev.map((item) => item.id === eat.id ? { ...item, is_favorite: nextFavorite } : item));

    try {
      await setLocalEatFavorite(eat.id, nextFavorite, token);
      if (showFavoritesOnly && !nextFavorite) {
        setEats((prev) => prev.filter((item) => item.id !== eat.id));
      }
    } catch {
      setEats((prev) => prev.map((item) => item.id === eat.id ? { ...item, is_favorite: eat.is_favorite } : item));
      setError('Could not update that favorite. Please try again.');
    } finally {
      setFavoriteSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(eat.id);
        return next;
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] rounded-3xl p-8 text-white mb-6 shadow-xl">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-6 h-6" />
          <span className="text-white/80 text-sm font-medium">Student Discounts</span>
        </div>
        <h1 className="text-4xl font-bold mb-2">Local Eats</h1>
        <p className="text-white/80 text-lg">Save money with exclusive student deals</p>
        <div className="mt-4 bg-white/20 rounded-xl p-3 backdrop-blur-sm">
          <p className="text-white font-semibold">
            {isLoading ? 'Checking current deals...' : `${dealsCount} ${dealsCount === 1 ? 'place has' : 'places have'} student discounts`}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 mb-6 border border-[var(--color-border)] shadow-sm">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {FILTERS.map((filter) => {
            const Icon = filter.icon;
            const isActive = selectedFilter === filter.id;
            return (
              <button
                key={filter.id}
                onClick={() => setSelectedFilter(filter.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-[var(--color-primary)] text-white shadow-md'
                    : 'bg-[var(--color-accent)] text-[var(--color-textSecondary)] hover:bg-[var(--color-border)]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {filter.label}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setShowFavoritesOnly((value) => !value)}
          className={`mt-3 flex items-center gap-2 px-4 py-2 rounded-xl border font-medium transition-all ${
            showFavoritesOnly
              ? 'border-[var(--color-primary)] bg-[var(--color-accent)] text-[var(--color-primary)]'
              : 'border-transparent bg-[var(--color-accent)] text-[var(--color-textSecondary)] hover:bg-[var(--color-border)]'
          }`}
        >
          <Heart className={`w-4 h-4 ${showFavoritesOnly ? 'fill-[var(--color-primary)]' : ''}`} />
          Favorites Only
        </button>
      </div>

      <div className="mb-4 px-2">
        <p className="text-sm text-[var(--color-textMuted)]">
          {isLoading ? 'Loading places...' : `Found ${eats.length} ${eats.length === 1 ? 'place' : 'places'}${showFavoritesOnly ? ' in favorites' : ''}`}
        </p>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-[var(--color-warningBorder)] bg-[var(--color-warningSurface)] p-4 text-sm text-[var(--color-warning)]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-8 text-center shadow-sm">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-[var(--color-primary)]" />
          <p className="mt-3 text-sm font-medium text-[var(--color-textSecondary)]">Loading Local Eats...</p>
        </div>
      ) : eats.length === 0 ? (
        <div className="text-center py-12 rounded-2xl border border-[var(--color-border)] bg-white">
          <UtensilsCrossed className="mx-auto h-12 w-12 text-[var(--color-textMuted)]" />
          <h3 className="mt-4 text-xl font-bold text-[var(--color-textPrimary)]">No places found</h3>
          <p className="mt-2 text-[var(--color-textMuted)]">
            {showFavoritesOnly ? 'No saved places match this filter yet.' : 'Try another filter or check again after backend data is loaded.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {eats.map((eat) => (
            <div
              key={eat.id}
              className={`bg-white rounded-2xl p-5 border-2 shadow-sm hover:shadow-md transition-all ${
                eat.student_discount
                  ? 'border-[var(--color-primary)] bg-gradient-to-br from-white to-[var(--color-accent)]'
                  : 'border-[var(--color-border)]'
              }`}
            >
              {eat.student_discount && (
                <div className="mb-4 -mt-2 -mx-2 px-4 py-3 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] rounded-t-xl">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                        <Percent className="w-5 h-5 text-[var(--color-primary)]" />
                      </div>
                      <div>
                        <p className="text-white font-bold text-lg">{eat.student_discount.percentage}% OFF</p>
                        <p className="text-white/90 text-xs">Student Discount</p>
                      </div>
                    </div>
                    {eat.student_discount.is_new && (
                      <div className="bg-white/90 text-[var(--color-primary)] px-3 py-1 rounded-full text-xs font-bold">
                        New
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${
                    eat.student_discount
                      ? 'bg-gradient-to-br from-[var(--color-accent)] to-white ring-2 ring-[var(--color-primary)]'
                      : 'bg-gradient-to-br from-[var(--color-accent)] to-white'
                  }`}>
                    {eat.emoji}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-lg font-bold text-[var(--color-textPrimary)]">{eat.name}</h3>
                      {!eat.is_open && (
                        <span className="px-2 py-0.5 bg-[var(--color-dangerSurface)] text-[var(--color-danger)] text-xs font-medium rounded-full">
                          Closed
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[var(--color-textMuted)] mb-2">{eat.cuisine_type}</p>
                    <p className="text-sm text-[var(--color-textSecondary)]">{eat.description}</p>

                    {eat.student_discount && (
                      <div className="mt-3 bg-white border-2 border-[var(--color-primary)] rounded-xl p-3">
                        <div className="flex items-start gap-2">
                          <Tag className="w-4 h-4 text-[var(--color-primary)] mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-[var(--color-textPrimary)]">{eat.student_discount.details}</p>
                            {eat.student_discount.valid_until && (
                              <p className="text-xs text-[var(--color-textMuted)] mt-1">
                                Valid until: {eat.student_discount.valid_until}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => toggleFavorite(eat)}
                  disabled={favoriteSavingIds.has(eat.id)}
                  className="ml-2 p-2 rounded-full hover:bg-[var(--color-accent)] transition-colors flex-shrink-0 disabled:opacity-50"
                  aria-label={eat.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Heart
                    className={`w-5 h-5 ${
                      eat.is_favorite
                        ? 'fill-[var(--color-primary)] text-[var(--color-primary)]'
                        : 'text-[var(--color-textMuted)]'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center gap-4 mb-3 flex-wrap">
                {typeof eat.rating === 'number' && (
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-[var(--color-warning)] text-[var(--color-warning)]" />
                    <span className="text-sm font-medium text-[var(--color-textPrimary)]">{eat.rating.toFixed(1)}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium text-[var(--color-success)]">{priceSymbol(eat.price_level)}</span>
                  <span className="text-xs text-[var(--color-textMuted)]">{priceSymbol(4 - eat.price_level)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Navigation className="w-4 h-4 text-[var(--color-info)]" />
                  <span className="text-sm text-[var(--color-textSecondary)]">{formatDistance(eat)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4 text-[var(--color-primary)]" />
                  <span className="text-sm text-[var(--color-textSecondary)]">{formatWalkTime(eat)}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-[var(--color-border)] flex items-center justify-between text-sm flex-wrap gap-2">
                <div className="flex items-center gap-1 text-[var(--color-textMuted)]">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{eat.address}</span>
                </div>
                <div className="flex items-center gap-1 text-[var(--color-textMuted)]">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{eat.hours}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

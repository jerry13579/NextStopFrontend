import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Clock, Coffee, Heart, IceCream, Loader2, MapPin, Navigation, Percent, Sandwich, Sparkles, Star, Tag, UtensilsCrossed } from 'lucide-react';
import { Coordinates, fetchLocalEats, LocalEat, setLocalEatFavorite } from '../utils/api';

type CategoryFilterId = 'cafe' | 'restaurant' | 'quick-bites' | 'dessert';
type FilterId = 'all' | CategoryFilterId | 'deals';

interface LocalEatsSectionProps {
  token?: string | null;
  userLocation?: Coordinates | null;
  onNavigate?: (label: string) => void;
}

const FILTERS: Array<{ id: FilterId; label: string; icon: typeof UtensilsCrossed }> = [
  { id: 'all', label: 'All', icon: UtensilsCrossed },
  { id: 'deals', label: 'Student Deals', icon: Tag },
  { id: 'cafe', label: 'Cafes', icon: Coffee },
  { id: 'restaurant', label: 'Restaurants', icon: UtensilsCrossed },
  { id: 'quick-bites', label: 'Quick Bites', icon: Sandwich },
  { id: 'dessert', label: 'Dessert', icon: IceCream },
];

const CATEGORY_FILTER_IDS: CategoryFilterId[] = ['cafe', 'restaurant', 'quick-bites', 'dessert'];

// Real Berkeley-area student discounts sourced from
// https://www.downtownberkeley.com/student-discounts/ and the Daily Cal student perks list.
// Keys are lowercase name fragments — first one that appears in the eat's name wins.
const STATIC_STUDENT_DISCOUNT_PREFIX = 'student-discount:';

const BERKELEY_STUDENT_DISCOUNTS: Array<{
  id: string;
  name: string;
  match: string;
  type: LocalEat['type'];
  emoji: string;
  cuisine_type: string;
  discount: NonNullable<LocalEat['student_discount']>;
}> = [
  { id: 'ikes', name: "Ike's Love & Sandwiches", match: "ike's", type: 'quick-bites', emoji: '🥪', cuisine_type: 'Sandwiches', discount: { details: 'Any sandwich for $8.98 between 3 – 6 pm with Cal ID' } },
  { id: 'masa-ramen', name: 'Masa Ramen Bistro', match: 'masa ramen', type: 'restaurant', emoji: '🍜', cuisine_type: 'Ramen', discount: { percentage: 10, details: '10% off with Cal ID' } },
  { id: 'moe-sushi-grill', name: 'Moe Sushi & Grill', match: 'moe', type: 'restaurant', emoji: '🍣', cuisine_type: 'Sushi & Grill', discount: { percentage: 10, details: '10% off sushi & grill with Cal ID' } },
  { id: 'jamba', name: 'Jamba', match: 'jamba', type: 'quick-bites', emoji: '🥤', cuisine_type: 'Smoothies', discount: { percentage: 10, details: '10% off with Cal ID' } },
  { id: 'peets-coffee', name: "Peet's Coffee", match: 'peet', type: 'cafe', emoji: '☕', cuisine_type: 'Coffee', discount: { percentage: 10, details: "10% off online orders with code CALPEETS" } },
  { id: 'burgerim', name: 'BurgerIM', match: 'burgerim', type: 'quick-bites', emoji: '🍔', cuisine_type: 'Burgers', discount: { percentage: 10, details: '10% off with Cal ID' } },
  { id: 'cancun', name: 'Cancun Sabor Mexicano', match: 'cancun', type: 'restaurant', emoji: '🌮', cuisine_type: 'Mexican', discount: { percentage: 10, details: '10% off with Cal ID' } },
  { id: 'cals-fried-chicken', name: "Cal's Fried Chicken and Burgers", match: "cal's fried", type: 'quick-bites', emoji: '🍗', cuisine_type: 'Fried Chicken', discount: { percentage: 10, details: '10% off with Cal ID' } },
  { id: 'university-taqueria', name: 'University Taqueria', match: 'university taqueria', type: 'quick-bites', emoji: '🌯', cuisine_type: 'Mexican', discount: { percentage: 10, details: '10% off with Cal ID' } },
  { id: 'bench', name: 'Bench', match: 'bench', type: 'dessert', emoji: '🥐', cuisine_type: 'Patisserie', discount: { percentage: 15, details: '15% off pâtisserie items with Cal ID' } },
  { id: '84-viet', name: '84 Viet', match: '84 viet', type: 'restaurant', emoji: '🍜', cuisine_type: 'Vietnamese', discount: { percentage: 5, details: '5% off with Cal ID' } },
  { id: 'bobby-gs-pizzeria', name: "Bobby G's Pizzeria", match: "bobby g", type: 'restaurant', emoji: '🍕', cuisine_type: 'Pizza', discount: { percentage: 5, details: '5% off with Cal ID' } },
  { id: 'juice-appeal', name: 'Juice Appeal', match: 'juice appeal', type: 'cafe', emoji: '🥤', cuisine_type: 'Juice Bar', discount: { percentage: 5, details: '5% off vegan, dairy-free & organic items with Cal ID' } },
  { id: 'namaste-madras', name: 'Namaste Madras Cuisine', match: 'namaste madras', type: 'restaurant', emoji: '🍛', cuisine_type: 'Indian', discount: { details: 'Paneer Masala or Chicken Tikka Masala for $13.95 with rice & naan' } },
  { id: 'pizza-guys', name: 'Pizza Guys', match: 'pizza guys', type: 'quick-bites', emoji: '🍕', cuisine_type: 'Pizza', discount: { percentage: 20, details: 'Up to 20% off with Cal ID' } },
];

function normalizedName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function discountEntryForEat(eat: Pick<LocalEat, 'name'>) {
  const lowerName = normalizedName(eat.name);
  return BERKELEY_STUDENT_DISCOUNTS.find((entry) => lowerName.includes(normalizedName(entry.match)));
}

function discountForEat(eat: LocalEat): LocalEat['student_discount'] | null {
  if (eat.student_discount) return eat.student_discount;
  return discountEntryForEat(eat)?.discount ?? null;
}

function staticStudentDiscountEat(entry: (typeof BERKELEY_STUDENT_DISCOUNTS)[number]): LocalEat {
  return {
    id: `${STATIC_STUDENT_DISCOUNT_PREFIX}${entry.id}`,
    name: entry.name,
    type: entry.type,
    emoji: entry.emoji,
    rating: null,
    price_level: null,
    distance_miles: null,
    walk_time_minutes: null,
    address: null,
    hours: null,
    description: null,
    is_open: null,
    is_favorite: false,
    cuisine_type: entry.cuisine_type,
    student_discount: entry.discount,
    is_static_student_discount: true,
  };
}

function staticStudentDiscountEats(selectedFilter: FilterId) {
  return BERKELEY_STUDENT_DISCOUNTS
    .filter((entry) => selectedFilter === 'all' || selectedFilter === 'deals' || entry.type === selectedFilter)
    .map(staticStudentDiscountEat);
}

function mergeKeyForEat(eat: LocalEat) {
  const entry = discountEntryForEat(eat);
  return entry ? `${STATIC_STUDENT_DISCOUNT_PREFIX}${entry.id}` : eat.id;
}

function mergeEat(existing: LocalEat, incoming: LocalEat) {
  const existingIsStatic = existing.is_static_student_discount === true;
  const incomingIsStatic = incoming.is_static_student_discount === true;
  const primary = existingIsStatic && !incomingIsStatic ? incoming : existing;
  const secondary = primary === existing ? incoming : existing;
  return {
    ...secondary,
    ...primary,
    is_favorite: existing.is_favorite || incoming.is_favorite,
    student_discount: existing.student_discount ?? incoming.student_discount,
    is_static_student_discount: existingIsStatic && incomingIsStatic,
  };
}

function isCategoryFilter(value: FilterId): value is CategoryFilterId {
  return CATEGORY_FILTER_IDS.includes(value as CategoryFilterId);
}

function mergeAndSortEats(lists: LocalEat[][]) {
  const byId = new Map<string, LocalEat>();
  lists.flat().forEach((eat) => {
    const key = mergeKeyForEat(eat);
    const existing = byId.get(key);
    byId.set(key, existing ? mergeEat(existing, eat) : eat);
  });

  return [...byId.values()].sort((a, b) => {
    const distanceA = typeof a.distance_miles === 'number' ? a.distance_miles : Number.POSITIVE_INFINITY;
    const distanceB = typeof b.distance_miles === 'number' ? b.distance_miles : Number.POSITIVE_INFINITY;
    return (distanceA - distanceB) || a.name.localeCompare(b.name);
  });
}

async function loadEatsForFilter({
  selectedFilter,
  showFavoritesOnly,
  userLocation,
  token,
  signal,
}: {
  selectedFilter: FilterId;
  showFavoritesOnly: boolean;
  userLocation?: Coordinates | null;
  token?: string | null;
  signal: AbortSignal;
}) {
  // dealsOnly is intentionally not forwarded to the backend. Discounts are applied
  // and supplemented client-side, then filtered client-side, so Berkeley student
  // deal listings remain visible even when Places/SQLite does not return them.

  if ((selectedFilter === 'all' || selectedFilter === 'deals') && !showFavoritesOnly) {
    const settled = await Promise.allSettled(
      CATEGORY_FILTER_IDS.map((category) =>
        fetchLocalEats({
          category,
          location: userLocation,
          token,
          signal,
        })
      )
    );
    const fulfilled = settled
      .filter((result): result is PromiseFulfilledResult<LocalEat[]> => result.status === 'fulfilled')
      .map((result) => result.value);

    if (fulfilled.length === 0) {
      const firstRejected = settled.find((result): result is PromiseRejectedResult => result.status === 'rejected');
      throw firstRejected?.reason ?? new Error('Local Eats request failed');
    }

    return mergeAndSortEats([...fulfilled, staticStudentDiscountEats(selectedFilter)]);
  }

  const backendEats = await fetchLocalEats({
    category: isCategoryFilter(selectedFilter) ? selectedFilter : null,
    favoritesOnly: showFavoritesOnly,
    location: userLocation,
    token,
    signal,
  });
  return showFavoritesOnly
    ? backendEats
    : mergeAndSortEats([backendEats, staticStudentDiscountEats(selectedFilter)]);
}

function formatPriceLevel(level: LocalEat['price_level']) {
  if (typeof level === 'number') return '$'.repeat(Math.max(1, Math.min(level, 4)));
  if (!level) return null;

  const normalized = level.toLowerCase().replace(/^price_level_/, '').replace(/[-\s]+/g, '_');
  const labels: Record<string, string> = {
    free: 'Free',
    inexpensive: '$',
    moderate: '$$',
    expensive: '$$$',
    very_expensive: '$$$$',
  };

  return labels[normalized] ?? level.replace(/_/g, ' ');
}

function formatCategory(value?: string | null) {
  if (!value) return null;
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatHours(hours: LocalEat['hours']) {
  if (Array.isArray(hours)) {
    if (hours.length === 0) return 'Hours unavailable';
    const todayIndex = (new Date().getDay() + 6) % 7;
    return hours[todayIndex] || hours[0] || 'Hours unavailable';
  }
  return hours?.trim() || 'Hours unavailable';
}

function formatDiscountLabel(discount: LocalEat['student_discount']) {
  if (typeof discount?.percentage === 'number' && Number.isFinite(discount.percentage)) {
    return `${Math.round(discount.percentage)}% OFF`;
  }
  return 'Student Deal';
}

function formatDistance(eat: LocalEat) {
  if (eat.is_static_student_discount && typeof eat.distance_miles !== 'number') return 'Berkeley area';
  if (typeof eat.distance_miles !== 'number') return 'Nearby';
  return `${eat.distance_miles.toFixed(eat.distance_miles < 1 ? 1 : 0)} mi`;
}

function formatWalkTime(eat: LocalEat) {
  if (typeof eat.walk_time_minutes !== 'number') return 'Walk time unavailable';
  return `${Math.round(eat.walk_time_minutes)} min walk`;
}

export function LocalEatsSection({ token, userLocation, onNavigate }: LocalEatsSectionProps) {
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
        const results = await loadEatsForFilter({
          selectedFilter,
          showFavoritesOnly,
          userLocation,
          token,
          signal: controller.signal,
        });
        if (cancelled) return;
        const overlaid = results.map((eat) => {
          const discount = discountForEat(eat);
          return discount ? { ...eat, student_discount: discount } : eat;
        });
        const filtered = selectedFilter === 'deals'
          ? overlaid.filter((eat) => eat.student_discount)
          : overlaid;
        setEats(filtered);
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
  }, [selectedFilter, showFavoritesOnly, token]);

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
          {eats.map((eat) => {
            const priceLabel = formatPriceLevel(eat.price_level);
            const categoryLabel = formatCategory(eat.cuisine_type) ?? formatCategory(eat.type);
            const hasDiscountDetails = Boolean(eat.student_discount?.details || eat.student_discount?.valid_until);

            return (
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
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shrink-0">
                          <Percent className="w-5 h-5 text-[var(--color-primary)]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-white font-bold text-lg leading-tight">{formatDiscountLabel(eat.student_discount)}</p>
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
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${
                      eat.student_discount
                        ? 'bg-gradient-to-br from-[var(--color-accent)] to-white ring-2 ring-[var(--color-primary)]'
                        : 'bg-gradient-to-br from-[var(--color-accent)] to-white'
                    }`}>
                      {eat.emoji}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-lg font-bold text-[var(--color-textPrimary)] break-words">{eat.name}</h3>
                        {eat.is_open === false && (
                          <span className="px-2 py-0.5 bg-[var(--color-dangerSurface)] text-[var(--color-danger)] text-xs font-medium rounded-full">
                            Closed
                          </span>
                        )}
                      </div>
                      {categoryLabel && <p className="text-sm text-[var(--color-textMuted)] mb-2">{categoryLabel}</p>}

                      {eat.student_discount && hasDiscountDetails && (
                        <div className="mt-3 bg-white border-2 border-[var(--color-primary)] rounded-xl p-3">
                          <div className="flex items-start gap-2">
                            <Tag className="w-4 h-4 text-[var(--color-primary)] mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              {eat.student_discount.details && (
                                <p className="text-sm font-semibold text-[var(--color-textPrimary)]">{eat.student_discount.details}</p>
                              )}
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

                  {!eat.is_static_student_discount && (
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
                  )}
                </div>

                <div className="flex items-center gap-4 mb-3 flex-wrap">
                  {typeof eat.rating === 'number' && (
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-[var(--color-warning)] text-[var(--color-warning)]" />
                      <span className="text-sm font-medium text-[var(--color-textPrimary)]">{eat.rating.toFixed(1)}</span>
                    </div>
                  )}
                  {priceLabel && (
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-medium text-[var(--color-success)]">{priceLabel}</span>
                    </div>
                  )}
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
                  {eat.address && (
                    <div className="flex min-w-0 flex-1 items-center gap-1 text-[var(--color-textMuted)]">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{eat.address}</span>
                    </div>
                  )}
                  <div className="flex min-w-0 items-center gap-1 text-[var(--color-textMuted)]">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{formatHours(eat.hours)}</span>
                  </div>
                </div>

                {onNavigate && (
                  <button
                    onClick={() => onNavigate(eat.address ? `${eat.name}, ${eat.address}` : eat.name)}
                    className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90"
                  >
                    <Navigation className="w-4 h-4" />
                    Get Directions
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

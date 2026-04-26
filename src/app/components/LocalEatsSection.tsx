import { useState } from 'react';
import { MapPin, Clock, DollarSign, Star, Coffee, UtensilsCrossed, Sandwich, Pizza, IceCream, Heart, Navigation, Filter, Tag, Sparkles, Percent } from 'lucide-react';

interface LocalEat {
  id: string;
  name: string;
  type: 'cafe' | 'restaurant' | 'quick-bites' | 'dessert';
  emoji: string;
  rating: number;
  priceLevel: 1 | 2 | 3 | 4;
  distance: number; // in miles
  walkTime: number; // in minutes
  address: string;
  hours: string;
  description: string;
  isOpen: boolean;
  isFavorite: boolean;
  cuisineType: string;
  image?: string;
  studentDiscount?: {
    percentage: number;
    details: string;
    validUntil?: string;
    isNew?: boolean;
  };
}

interface LocalEatsSectionProps {
  streakCount: number;
  onTimeRate: number;
}

const MOCK_EATS: LocalEat[] = [
  {
    id: '1',
    name: 'Penelope\'s',
    type: 'cafe',
    emoji: '🍰',
    rating: 4.8,
    priceLevel: 2,
    distance: 0.2,
    walkTime: 4,
    address: '2216 Shattuck Ave',
    hours: '8am - 4pm',
    description: 'Artisan bakery and cafe with fresh pastries and sandwiches',
    isOpen: true,
    isFavorite: true,
    cuisineType: 'Bakery & Cafe',
    studentDiscount: {
      percentage: 15,
      details: '15% off all food and drinks with valid student ID',
      isNew: true
    }
  },
  {
    id: '2',
    name: 'Qargo Coffee',
    type: 'cafe',
    emoji: '☕',
    rating: 4.7,
    priceLevel: 2,
    distance: 0.3,
    walkTime: 6,
    address: '2391 Telegraph Ave',
    hours: '7am - 6pm',
    description: 'Cozy coffee shop perfect for studying',
    isOpen: true,
    isFavorite: true,
    cuisineType: 'Coffee & Tea',
    studentDiscount: {
      percentage: 10,
      details: '10% off for UC Berkeley students'
    }
  },
  {
    id: '3',
    name: 'Cafe Strada',
    type: 'cafe',
    emoji: '☕',
    rating: 4.5,
    priceLevel: 2,
    distance: 0.1,
    walkTime: 2,
    address: '2300 College Ave',
    hours: '6:30am - 7pm',
    description: 'Classic Berkeley cafe with outdoor seating',
    isOpen: true,
    isFavorite: true,
    cuisineType: 'Coffee & Tea',
    studentDiscount: {
      percentage: 5,
      details: '5% off with student ID on weekdays'
    }
  },
  {
    id: '4',
    name: 'Sliver Pizzeria',
    type: 'restaurant',
    emoji: '🍕',
    rating: 4.6,
    priceLevel: 2,
    distance: 0.4,
    walkTime: 8,
    address: '2132 Center St',
    hours: '11am - 9pm',
    description: 'Thin-crust pizza with rotating daily flavors',
    isOpen: true,
    isFavorite: false,
    cuisineType: 'Pizza',
    studentDiscount: {
      percentage: 10,
      details: '10% off for students after 2pm',
      validUntil: 'May 15, 2026'
    }
  },
  {
    id: '5',
    name: 'Gypsy\'s Trattoria',
    type: 'restaurant',
    emoji: '🍝',
    rating: 4.7,
    priceLevel: 2,
    distance: 0.5,
    walkTime: 10,
    address: '2519 Durant Ave',
    hours: '11am - 10pm',
    description: 'Italian comfort food in a cozy setting',
    isOpen: true,
    isFavorite: false,
    cuisineType: 'Italian',
    studentDiscount: {
      percentage: 15,
      details: '15% off lunch specials for students (11am-3pm)',
      isNew: true
    }
  },
  {
    id: '6',
    name: 'Ike\'s Love & Sandwiches',
    type: 'quick-bites',
    emoji: '🥪',
    rating: 4.5,
    priceLevel: 2,
    distance: 0.3,
    walkTime: 6,
    address: '2489 Telegraph Ave',
    hours: '10am - 9pm',
    description: 'Creative sandwiches with unique flavor combinations',
    isOpen: true,
    isFavorite: true,
    cuisineType: 'Sandwiches',
    studentDiscount: {
      percentage: 10,
      details: '10% off any sandwich with Cal1Card'
    }
  },
  {
    id: '7',
    name: 'Nefeli Caffe',
    type: 'cafe',
    emoji: '🥐',
    rating: 4.6,
    priceLevel: 2,
    distance: 0.3,
    walkTime: 6,
    address: '1854 Euclid Ave',
    hours: '7am - 8pm',
    description: 'Mediterranean-inspired cafe with homemade desserts',
    isOpen: true,
    isFavorite: false,
    cuisineType: 'Mediterranean Cafe',
    studentDiscount: {
      percentage: 10,
      details: '10% off pastries and coffee for students'
    }
  },
  {
    id: '8',
    name: 'Pho K & K',
    type: 'restaurant',
    emoji: '🍜',
    rating: 4.4,
    priceLevel: 1,
    distance: 0.6,
    walkTime: 12,
    address: '2536 Telegraph Ave',
    hours: '11am - 9pm',
    description: 'Authentic Vietnamese pho and rice plates',
    isOpen: true,
    isFavorite: false,
    cuisineType: 'Vietnamese',
    studentDiscount: {
      percentage: 5,
      details: '5% off all menu items with student ID'
    }
  },
  {
    id: '9',
    name: 'Cream',
    type: 'dessert',
    emoji: '🍦',
    rating: 4.6,
    priceLevel: 2,
    distance: 0.3,
    walkTime: 6,
    address: '2399 Telegraph Ave',
    hours: '12pm - 11pm',
    description: 'Ice cream sandwiches made to order',
    isOpen: true,
    isFavorite: false,
    cuisineType: 'Ice Cream',
    studentDiscount: {
      percentage: 10,
      details: '10% off for UC Berkeley students',
      validUntil: 'End of semester'
    }
  },
  {
    id: '10',
    name: 'Top Dog',
    type: 'quick-bites',
    emoji: '🌭',
    rating: 4.3,
    priceLevel: 1,
    distance: 0.2,
    walkTime: 4,
    address: '2534 Durant Ave',
    hours: '10am - 2am',
    description: 'Berkeley institution serving hot dogs since 1966',
    isOpen: true,
    isFavorite: false,
    cuisineType: 'Hot Dogs',
    studentDiscount: {
      percentage: 5,
      details: '$0.50 off with student ID'
    }
  },
  {
    id: '11',
    name: 'Artis Coffee',
    type: 'cafe',
    emoji: '☕',
    rating: 4.9,
    priceLevel: 2,
    distance: 0.3,
    walkTime: 6,
    address: '1717 University Ave',
    hours: '7am - 5pm',
    description: 'Specialty coffee roaster with great study vibes',
    isOpen: true,
    isFavorite: false,
    cuisineType: 'Coffee & Tea'
  },
  {
    id: '12',
    name: 'Sweetgreen',
    type: 'quick-bites',
    emoji: '🥗',
    rating: 4.5,
    priceLevel: 2,
    distance: 0.3,
    walkTime: 6,
    address: '2498 Telegraph Ave',
    hours: '10:30am - 9pm',
    description: 'Fresh salads and healthy bowls',
    isOpen: true,
    isFavorite: false,
    cuisineType: 'Salads & Bowls'
  },
];

export function LocalEatsSection({ streakCount, onTimeRate }: LocalEatsSectionProps) {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'cafe' | 'restaurant' | 'quick-bites' | 'dessert' | 'deals'>('all');
  const [favorites, setFavorites] = useState<Set<string>>(
    new Set(MOCK_EATS.filter(eat => eat.isFavorite).map(eat => eat.id))
  );
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const filteredEats = MOCK_EATS.filter(eat => {
    const matchesFilter = selectedFilter === 'all' ||
                         selectedFilter === 'deals' ? !!eat.studentDiscount :
                         eat.type === selectedFilter;
    const matchesFavorites = !showFavoritesOnly || favorites.has(eat.id);
    return matchesFilter && matchesFavorites;
  });

  const toggleFavorite = (id: string) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(id)) {
        newFavorites.delete(id);
      } else {
        newFavorites.add(id);
      }
      return newFavorites;
    });
  };

  const getPriceSymbol = (level: number) => {
    return '$'.repeat(level);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'cafe':
        return <Coffee className="w-5 h-5" />;
      case 'restaurant':
        return <UtensilsCrossed className="w-5 h-5" />;
      case 'quick-bites':
        return <Sandwich className="w-5 h-5" />;
      case 'dessert':
        return <IceCream className="w-5 h-5" />;
      default:
        return <UtensilsCrossed className="w-5 h-5" />;
    }
  };

  const filters = [
    { id: 'all', label: 'All', icon: UtensilsCrossed },
    { id: 'deals', label: 'Student Deals', icon: Tag },
    { id: 'cafe', label: 'Cafes', icon: Coffee },
    { id: 'restaurant', label: 'Restaurants', icon: UtensilsCrossed },
    { id: 'quick-bites', label: 'Quick Bites', icon: Sandwich },
    { id: 'dessert', label: 'Dessert', icon: IceCream },
  ];

  const dealsCount = MOCK_EATS.filter(eat => eat.studentDiscount).length;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] rounded-3xl p-8 text-white mb-6 shadow-xl">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-6 h-6" />
          <span className="text-white/80 text-sm font-medium">Student Discounts</span>
        </div>
        <h1 className="text-4xl font-bold mb-2">Local Eats</h1>
        <p className="text-white/80 text-lg">
          Save money with exclusive student deals 💰
        </p>
        <div className="mt-4 bg-white/20 rounded-xl p-3 backdrop-blur-sm">
          <p className="text-white font-semibold">
            🎉 {dealsCount} restaurants offering student discounts!
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl p-4 mb-6 border border-[var(--color-border)] shadow-sm">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {filters.map(filter => {
            const Icon = filter.icon;
            const isActive = selectedFilter === filter.id;
            return (
              <button
                key={filter.id}
                onClick={() => setSelectedFilter(filter.id as any)}
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

        {/* Favorites Toggle */}
        <button
          onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          className={`mt-3 flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
            showFavoritesOnly
              ? 'bg-pink-100 text-pink-700 border-2 border-pink-300'
              : 'bg-[var(--color-accent)] text-[var(--color-textSecondary)] hover:bg-[var(--color-border)]'
          }`}
        >
          <Heart className={`w-4 h-4 ${showFavoritesOnly ? 'fill-pink-700' : ''}`} />
          Favorites Only
        </button>
      </div>

      {/* Results Count */}
      <div className="mb-4 px-2">
        <p className="text-sm text-[var(--color-textMuted)]">
          Found {filteredEats.length} {filteredEats.length === 1 ? 'place' : 'places'}
          {showFavoritesOnly && ' in favorites'}
        </p>
      </div>

      {/* Eats List */}
      <div className="space-y-4">
        {filteredEats.map(eat => (
          <div
            key={eat.id}
            className={`bg-white rounded-2xl p-5 border-2 shadow-sm hover:shadow-md transition-all ${
              eat.studentDiscount
                ? 'border-[var(--color-primary)] bg-gradient-to-br from-white to-[var(--color-accent)]'
                : 'border-[var(--color-border)]'
            }`}
          >
            {/* Student Discount Banner */}
            {eat.studentDiscount && (
              <div className="mb-4 -mt-2 -mx-2 px-4 py-3 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] rounded-t-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                      <Percent className="w-5 h-5 text-[var(--color-primary)]" />
                    </div>
                    <div>
                      <p className="text-white font-bold text-lg">
                        {eat.studentDiscount.percentage}% OFF
                      </p>
                      <p className="text-white/90 text-xs">Student Discount</p>
                    </div>
                  </div>
                  {eat.studentDiscount.isNew && (
                    <div className="bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                      NEW! 🎉
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-start justify-between mb-3">
              <div className="flex items-start gap-3 flex-1">
                {/* Emoji Icon */}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${
                  eat.studentDiscount
                    ? 'bg-gradient-to-br from-[var(--color-accent)] to-white ring-2 ring-[var(--color-primary)]'
                    : 'bg-gradient-to-br from-[var(--color-accent)] to-white'
                }`}>
                  {eat.emoji}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="text-lg font-bold text-[var(--color-textPrimary)]">{eat.name}</h3>
                    {!eat.isOpen && (
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                        Closed
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[var(--color-textMuted)] mb-2">{eat.cuisineType}</p>
                  <p className="text-sm text-[var(--color-textSecondary)]">{eat.description}</p>

                  {/* Student Discount Details */}
                  {eat.studentDiscount && (
                    <div className="mt-3 bg-white border-2 border-[var(--color-primary)] rounded-xl p-3">
                      <div className="flex items-start gap-2">
                        <Tag className="w-4 h-4 text-[var(--color-primary)] mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-[var(--color-textPrimary)]">
                            {eat.studentDiscount.details}
                          </p>
                          {eat.studentDiscount.validUntil && (
                            <p className="text-xs text-[var(--color-textMuted)] mt-1">
                              Valid until: {eat.studentDiscount.validUntil}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Favorite Button */}
              <button
                onClick={() => toggleFavorite(eat.id)}
                className="ml-2 p-2 rounded-full hover:bg-pink-50 transition-colors flex-shrink-0"
              >
                <Heart
                  className={`w-5 h-5 ${
                    favorites.has(eat.id)
                      ? 'fill-pink-500 text-pink-500'
                      : 'text-gray-300'
                  }`}
                />
              </button>
            </div>

            {/* Stats Row */}
            <div className="flex items-center gap-4 mb-3 flex-wrap">
              {/* Rating */}
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-medium text-[var(--color-textPrimary)]">{eat.rating}</span>
              </div>

              {/* Price */}
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium text-green-600">{getPriceSymbol(eat.priceLevel)}</span>
                <span className="text-xs text-gray-400">{getPriceSymbol(4 - eat.priceLevel)}</span>
              </div>

              {/* Distance */}
              <div className="flex items-center gap-1">
                <Navigation className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-[var(--color-textSecondary)]">{eat.distance} mi</span>
              </div>

              {/* Walk Time */}
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4 text-[var(--color-primary)]" />
                <span className="text-sm text-[var(--color-textSecondary)]">{eat.walkTime} min walk</span>
              </div>
            </div>

            {/* Address & Hours */}
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

      {/* Empty State */}
      {filteredEats.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🍽️</div>
          <h3 className="text-xl font-bold text-[var(--color-textPrimary)] mb-2">No places found</h3>
          <p className="text-[var(--color-textMuted)]">
            {showFavoritesOnly
              ? 'You haven\'t favorited any places yet'
              : 'Try adjusting your filters'}
          </p>
        </div>
      )}
    </div>
  );
}
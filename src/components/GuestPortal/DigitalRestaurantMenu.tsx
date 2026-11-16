import React, { useMemo, useState } from 'react';
import { useHotel } from '../../context/HotelContext';
import { MenuItem, RestaurantOrder } from '../../types/hotel';
import { formatCurrency, convertPrice, getThemeClasses } from '../../utils/theme';
import {
  Utensils,
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  Tag,
  Leaf,
  Flame,
  Star,
  Clock,
  CheckCircle2,
  MapPin,
  ArrowRight,
} from 'lucide-react';

interface DigitalRestaurantMenuProps {
  onOrderPlaced?: (order: RestaurantOrder) => void;
  onViewOrders?: () => void;
}

const ORDERED_CATEGORIES = [
  'All',
  'Nepali Heritage & Newari',
  'Starters',
  'Himalayan Specials',
  'Main Course',
  'Rooftop Bar & Beverages',
  'Desserts',
] as const;

export const DigitalRestaurantMenu: React.FC<DigitalRestaurantMenuProps> = ({
  onOrderPlaced,
  onViewOrders,
}) => {
  const {
    activeGuestSession,
    menuItems,
    restaurantOrders,
    placeRestaurantOrder,
    themeConfig,
    currentCurrency,
    validateAndApplyCoupon,
    redeemCoupon,
    showToast,
  } = useHotel();

  const themeClasses = getThemeClasses(themeConfig.palette);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [dietaryFilter, setDietaryFilter] = useState<'all' | 'veg' | 'chef' | 'spicy'>('all');
  const [destinationMode, setDestinationMode] = useState<'room' | 'rooftop_table'>('room');
  const [rooftopTableNote, setRooftopTableNote] = useState<string>('Rooftop Terrace · Window');

  const [cart, setCart] = useState<{ item: MenuItem; quantity: number }[]>([]);
  const [specialNote, setSpecialNote] = useState<string>('');
  const [couponInput, setCouponInput] = useState<string>('');
  const [couponError, setCouponError] = useState<string>('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountUSD: number;
    description: string;
  } | null>(null);
  const [lastSubmittedOrder, setLastSubmittedOrder] = useState<RestaurantOrder | null>(null);

  const availableCategories = useMemo(() => {
    const present = new Set(menuItems.map((m) => m.category));
    return ORDERED_CATEGORIES.filter((cat) => cat === 'All' || present.has(cat));
  }, [menuItems]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return menuItems.filter((item) => {
      if (selectedCategory !== 'All' && item.category !== selectedCategory) return false;
      if (dietaryFilter === 'veg' && !item.isVegetarian) return false;
      if (dietaryFilter === 'chef' && !item.isChefSpecial) return false;
      if (dietaryFilter === 'spicy' && !item.isSpicy) return false;
      if (q) {
        const hay = `${item.name} ${item.description} ${item.category}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [menuItems, selectedCategory, dietaryFilter, searchQuery]);

  const activeRoomOrders = useMemo(() => {
    if (!activeGuestSession) return [];
    const roomLower = activeGuestSession.roomNumber.toLowerCase();
    return restaurantOrders.filter(
      (o) =>
        (o.roomNumber?.toLowerCase() === roomLower ||
          o.tableOrRoomNo?.toLowerCase() === roomLower) &&
        o.status !== 'delivered' &&
        o.status !== 'cancelled'
    );
  }, [restaurantOrders, activeGuestSession]);

  if (!activeGuestSession) return null;

  const getCartQuantity = (menuItemId: string): number => {
    return cart.find((c) => c.item.id === menuItemId)?.quantity || 0;
  };

  const handleAddToCart = (item: MenuItem) => {
    if (!item.available) return;
    setLastSubmittedOrder(null);
    setCart((prev) => {
      const existing = prev.find((c) => c.item.id === item.id);
      if (existing) {
        return prev.map((c) => (c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const handleUpdateQty = (menuItemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.item.id !== menuItemId) return c;
          const next = c.quantity + delta;
          return next > 0 ? { ...c, quantity: next } : null;
        })
        .filter(Boolean) as { item: MenuItem; quantity: number }[]
    );
  };

  const rawSubtotalUSD = cart.reduce((acc, c) => acc + c.item.priceUSD * c.quantity, 0);
  const discountUSD = appliedCoupon ? Math.min(appliedCoupon.discountUSD, rawSubtotalUSD) : 0;
  const taxableSubtotalUSD = Math.max(0, rawSubtotalUSD - discountUSD);
  const serviceChargeUSD = taxableSubtotalUSD * 0.10;
  const taxUSD = (taxableSubtotalUSD + serviceChargeUSD) * 0.13;
  const grandTotalUSD = taxableSubtotalUSD + serviceChargeUSD + taxUSD;

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError('');
    if (!couponInput.trim()) return;

    const res = validateAndApplyCoupon(couponInput.trim(), rawSubtotalUSD, 'dining');
    if (res.valid && res.coupon) {
      setAppliedCoupon({
        code: res.coupon.code,
        discountUSD: res.discountAmountUSD,
        description: res.coupon.description,
      });
      showToast('Dining Voucher Applied', `${res.coupon.code} applied to your rooftop order.`, 'success');
    } else {
      setCouponError(res.message);
    }
  };

  const handlePlaceOrder = () => {
    if (cart.length === 0) return;

    const destinationLabel =
      destinationMode === 'room'
        ? activeGuestSession.roomNumber
        : `${rooftopTableNote} (${activeGuestSession.roomNumber})`;

    const kitchenNotesParts = [
      destinationMode === 'rooftop_table'
        ? `Guest dining on Rooftop (${rooftopTableNote}) · Billed to ${activeGuestSession.roomNumber}`
        : `In-Room Dining Delivery to ${activeGuestSession.roomNumber}`,
      specialNote.trim() ? `Notes: ${specialNote.trim()}` : '',
      appliedCoupon ? `Voucher: ${appliedCoupon.code} (-$${discountUSD.toFixed(2)})` : '',
    ].filter(Boolean);

    const created = placeRestaurantOrder({
      roomNumber: activeGuestSession.roomNumber,
      tableOrRoomNo: destinationLabel,
      guestName: activeGuestSession.guestName,
      destination: destinationMode,
      items: cart.map((c) => ({
        menuItemId: c.item.id,
        name: c.item.name,
        quantity: c.quantity,
        unitPriceUSD: c.item.priceUSD,
        specialInstructions: specialNote.trim() || undefined,
      })),
      subtotalUSD: taxableSubtotalUSD,
      taxUSD,
      serviceChargeUSD,
      totalAmountUSD: grandTotalUSD,
      paymentMode: 'charge_to_room',
      kitchenNotes: kitchenNotesParts.join(' | '),
    });

    if (appliedCoupon) {
      redeemCoupon(appliedCoupon.code);
      setAppliedCoupon(null);
      setCouponInput('');
    }

    setCart([]);
    setSpecialNote('');
    setLastSubmittedOrder(created);
    if (onOrderPlaced) onOrderPlaced(created);
  };

  const rooftopStatusLabel =
    themeConfig.rooftopDiningStatus === 'open'
      ? 'Rooftop Kitchen Open · Live Service'
      : themeConfig.rooftopDiningStatus === 'renovation'
      ? 'Rooftop Terrace Upgrades · In-Room Kitchen Active'
      : themeConfig.rooftopOpeningDateText || 'Rooftop & In-Room Culinary Service Open';

  return (
    <div className="space-y-6">
      {/* Header & Rooftop Offerings Overview */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
              <Utensils className="w-3.5 h-3.5" />
              <span>{themeConfig.hotelName} · Rooftop Restaurant &amp; Sky Lounge Menu</span>
            </div>
            <h3 className="text-xl font-serif font-bold text-stone-900 dark:text-stone-50">
              Digital Restaurant Menu
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {rooftopStatusLabel} · Orders route directly to the Staff Service Requests queue &amp; Rooftop Kitchen.
            </p>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search momos, thali, coffee..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-600/30"
            />
          </div>
        </div>

        {/* Category Tabs & Dietary Filter */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2 border-t border-stone-100 dark:border-stone-800">
          <div className="flex flex-wrap items-center gap-1.5">
            {availableCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'veg', label: 'Vegetarian' },
                { id: 'chef', label: 'Chef Picks' },
                { id: 'spicy', label: 'Spiced' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setDietaryFilter(opt.id)}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer border ${
                  dietaryFilter === opt.id
                    ? 'border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
                    : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Confirmation Banner on Order Placement */}
      {lastSubmittedOrder && (
        <div className="p-4 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-emerald-950 dark:text-emerald-100">
                Order #{lastSubmittedOrder.orderNumber} sent to Staff Service Requests Queue
              </div>
              <div className="text-emerald-800 dark:text-emerald-300 mt-0.5">
                {lastSubmittedOrder.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')} · Billed to{' '}
                {activeGuestSession.roomNumber} (
                {formatCurrency(
                  convertPrice(lastSubmittedOrder.totalAmountUSD, currentCurrency, themeConfig.exchangeRates),
                  currentCurrency
                )}
                )
              </div>
            </div>
          </div>

          {onViewOrders && (
            <button
              type="button"
              onClick={onViewOrders}
              className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Track Live Status</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Active Orders Progress Strip */}
      {activeRoomOrders.length > 0 && (
        <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-stone-700 dark:text-stone-200">
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="font-semibold tabular-nums">
              {activeRoomOrders.length} active dining request{activeRoomOrders.length > 1 ? 's' : ''} in progress:
            </span>
            <span className="text-stone-500 dark:text-stone-400 truncate">
              {activeRoomOrders
                .slice(0, 2)
                .map((o) => `#${o.orderNumber} (${o.status.replace(/_/g, ' ')})`)
                .join(' · ')}
            </span>
          </div>
          {onViewOrders && (
            <button
              type="button"
              onClick={onViewOrders}
              className="text-amber-700 dark:text-amber-400 font-semibold hover:underline whitespace-nowrap shrink-0 cursor-pointer"
            >
              View Order Queue &rarr;
            </button>
          )}
        </div>
      )}

      {/* Main Split: Menu Offerings Grid + Order Tray */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Offerings Grid */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredItems.length === 0 ? (
            <div className="col-span-full p-10 rounded-xl border border-dashed border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-center text-xs text-stone-500 dark:text-stone-400">
              No rooftop menu dishes match your current filter. Try clearing your search or selecting All dishes.
            </div>
          ) : (
            filteredItems.map((dish) => {
              const qty = getCartQuantity(dish.id);
              const convertedPrice = convertPrice(
                dish.priceUSD,
                currentCurrency,
                themeConfig.exchangeRates
              );

              return (
                <div
                  key={dish.id}
                  className={`p-4 rounded-xl border bg-white dark:bg-stone-900 shadow-sm flex flex-col justify-between transition-colors ${
                    qty > 0
                      ? 'border-amber-500 dark:border-amber-600'
                      : 'border-stone-200 dark:border-stone-800'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-[10px] font-mono uppercase tracking-wider text-stone-400">
                          {dish.category}
                        </div>
                        <h4 className="font-serif font-bold text-base text-stone-900 dark:text-stone-50 leading-snug">
                          {dish.name}
                        </h4>
                      </div>
                      <span className="font-mono font-bold text-sm text-amber-700 dark:text-amber-400 tabular-nums shrink-0">
                        {formatCurrency(convertedPrice, currentCurrency)}
                      </span>
                    </div>

                    <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed line-clamp-2">
                      {dish.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-mono text-stone-500 dark:text-stone-400 pt-1">
                      {dish.isVegetarian && (
                        <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                          <Leaf className="w-3 h-3" /> Veg
                        </span>
                      )}
                      {dish.isVegetarian && (dish.isSpicy || dish.isChefSpecial) && <span>·</span>}
                      {dish.isSpicy && (
                        <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400">
                          <Flame className="w-3 h-3" /> Spicy
                        </span>
                      )}
                      {dish.isSpicy && dish.isChefSpecial && <span>·</span>}
                      {dish.isChefSpecial && (
                        <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400">
                          <Star className="w-3 h-3" /> Chef Pick
                        </span>
                      )}
                      {(dish.isVegetarian || dish.isSpicy || dish.isChefSpecial) && <span>·</span>}
                      <span className="tabular-nums">{dish.preparationTimeMinutes} min prep</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800">
                    {!dish.available ? (
                      <div className="w-full py-2 text-center text-xs font-semibold text-stone-400 bg-stone-100 dark:bg-stone-800 rounded-lg">
                        Currently Unavailable
                      </div>
                    ) : qty > 0 ? (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                          In your order
                        </span>
                        <div className="flex items-center border border-stone-200 dark:border-stone-700 rounded-lg bg-stone-50 dark:bg-stone-800">
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(dish.id, -1)}
                            className="p-1.5 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white cursor-pointer"
                            aria-label={`Decrease quantity of ${dish.name}`}
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-3 font-mono text-xs font-bold text-stone-900 dark:text-stone-100 tabular-nums">
                            {qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(dish.id, 1)}
                            className="p-1.5 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white cursor-pointer"
                            aria-label={`Increase quantity of ${dish.name}`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleAddToCart(dish)}
                        className="w-full py-2 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-amber-800 hover:text-white dark:hover:bg-amber-700 text-stone-800 dark:text-stone-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add to Order</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Sticky Order Dispatch Tray */}
        <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-4 text-xs sticky top-24">
          <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
            <h4 className="font-serif font-bold text-base text-stone-900 dark:text-stone-50 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Your Dining Order</span>
            </h4>
            <span className="font-mono text-[11px] text-stone-500 dark:text-stone-400 tabular-nums">
              {cart.reduce((acc, c) => acc + c.quantity, 0)} items
            </span>
          </div>

          {/* Service Destination Selector */}
          <div className="space-y-2">
            <label className="block font-semibold text-stone-700 dark:text-stone-300">
              Service Delivery Location
            </label>
            <div className="grid grid-cols-2 gap-1.5 bg-stone-100 dark:bg-stone-800 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setDestinationMode('room')}
                className={`py-1.5 px-2 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                  destinationMode === 'room'
                    ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-50 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400'
                }`}
              >
                Deliver to {activeGuestSession.roomNumber}
              </button>
              <button
                type="button"
                onClick={() => setDestinationMode('rooftop_table')}
                className={`py-1.5 px-2 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                  destinationMode === 'rooftop_table'
                    ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-50 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400'
                }`}
              >
                Dine at Rooftop
              </button>
            </div>

            {destinationMode === 'rooftop_table' && (
              <div className="flex items-center gap-1.5 pt-1">
                <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <input
                  type="text"
                  value={rooftopTableNote}
                  onChange={(e) => setRooftopTableNote(e.target.value)}
                  placeholder="Table or zone preference (e.g. T-02 Terrace)"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs text-stone-900 dark:text-stone-100"
                />
              </div>
            )}
          </div>

          {/* Cart Items */}
          <div className="divide-y divide-stone-100 dark:divide-stone-800 max-h-60 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="py-8 text-center text-stone-400 text-xs">
                Select dishes from the Rooftop Restaurant Menu to build your order.
              </div>
            ) : (
              cart.map((c) => (
                <div key={c.item.id} className="py-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-stone-900 dark:text-stone-100 truncate">
                      {c.item.name}
                    </div>
                    <div className="text-[11px] text-stone-500 font-mono tabular-nums">
                      {formatCurrency(
                        convertPrice(c.item.priceUSD * c.quantity, currentCurrency, themeConfig.exchangeRates),
                        currentCurrency
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <div className="flex items-center border border-stone-200 dark:border-stone-700 rounded bg-stone-50 dark:bg-stone-800">
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(c.item.id, -1)}
                        className="px-2 py-0.5 text-stone-500 hover:text-stone-900 dark:hover:text-white cursor-pointer"
                      >
                        -
                      </button>
                      <span className="px-2 font-mono font-bold tabular-nums">{c.quantity}</span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(c.item.id, 1)}
                        className="px-2 py-0.5 text-stone-500 hover:text-stone-900 dark:hover:text-white cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUpdateQty(c.item.id, -c.quantity)}
                      className="p-1 text-stone-400 hover:text-rose-600 cursor-pointer"
                      aria-label={`Remove ${c.item.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {cart.length > 0 && (
            <div className="space-y-3 pt-3 border-t border-stone-200 dark:border-stone-800">
              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Dietary / Chef Instructions
                </label>
                <input
                  type="text"
                  value={specialNote}
                  onChange={(e) => setSpecialNote(e.target.value)}
                  placeholder="e.g. Mild spice, extra timur sauce, gluten-free"
                  className="w-full p-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100"
                />
              </div>

              {/* Coupon Input */}
              <div className="pt-2 border-t border-stone-100 dark:border-stone-800">
                {appliedCoupon ? (
                  <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-medium">
                      <Tag className="w-3.5 h-3.5" />
                      <span>Voucher: {appliedCoupon.code}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                        -
                        {formatCurrency(
                          convertPrice(discountUSD, currentCurrency, themeConfig.exchangeRates),
                          currentCurrency
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setAppliedCoupon(null);
                          setCouponInput('');
                          setCouponError('');
                        }}
                        className="text-stone-400 hover:text-rose-600 font-bold px-1 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleApplyCoupon} className="space-y-1">
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={couponInput}
                        onChange={(e) => {
                          setCouponInput(e.target.value.toUpperCase());
                          setCouponError('');
                        }}
                        placeholder="Dining Voucher (e.g. ROOFTOP10)"
                        className="flex-1 px-2.5 py-1.5 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-mono uppercase text-stone-900 dark:text-stone-100"
                      />
                      <button
                        type="submit"
                        className="px-3 py-1.5 rounded-lg bg-amber-800 hover:bg-amber-900 text-white font-semibold text-xs whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Apply
                      </button>
                    </div>
                    {couponError && (
                      <p className="text-[11px] text-rose-600 dark:text-rose-400">{couponError}</p>
                    )}
                  </form>
                )}
              </div>

              {/* Statutory Totals */}
              <div className="space-y-1 text-xs font-mono pt-1">
                <div className="flex justify-between text-stone-500">
                  <span>Subtotal:</span>
                  <span className="tabular-nums">
                    {formatCurrency(
                      convertPrice(rawSubtotalUSD, currentCurrency, themeConfig.exchangeRates),
                      currentCurrency
                    )}
                  </span>
                </div>
                {appliedCoupon && (
                  <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                    <span>Voucher ({appliedCoupon.code}):</span>
                    <span className="tabular-nums">
                      -
                      {formatCurrency(
                        convertPrice(discountUSD, currentCurrency, themeConfig.exchangeRates),
                        currentCurrency
                      )}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-stone-500">
                  <span>Service Charge (10%):</span>
                  <span className="tabular-nums">
                    +
                    {formatCurrency(
                      convertPrice(serviceChargeUSD, currentCurrency, themeConfig.exchangeRates),
                      currentCurrency
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-stone-500">
                  <span>Nepal VAT (13%):</span>
                  <span className="tabular-nums">
                    +
                    {formatCurrency(
                      convertPrice(taxUSD, currentCurrency, themeConfig.exchangeRates),
                      currentCurrency
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-bold font-sans text-stone-900 dark:text-stone-100 pt-2 border-t border-stone-200 dark:border-stone-800">
                  <span>Total (Room Folio):</span>
                  <span className="tabular-nums">
                    {formatCurrency(
                      convertPrice(grandTotalUSD, currentCurrency, themeConfig.exchangeRates),
                      currentCurrency
                    )}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handlePlaceOrder}
                className={`w-full py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider shadow-sm transition-colors cursor-pointer ${themeClasses.primary}`}
              >
                Place Food Order ({activeGuestSession.roomNumber})
              </button>
              <p className="text-[11px] text-stone-400 text-center leading-relaxed">
                Routed immediately to Staff Service Requests queue &amp; charged to your stay folio.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

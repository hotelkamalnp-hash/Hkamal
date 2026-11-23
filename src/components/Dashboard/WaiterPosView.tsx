import React, { useState } from 'react';
import { useHotel } from '../../context/HotelContext';
import { 
  MenuItem, 
  MenuItemCategory, 
  RestaurantOrder, 
  RestaurantTable 
} from '../../types/hotel';
import { formatCurrency, convertPrice } from '../../utils/theme';
import { 
  UtensilsCrossed, 
  Plus, 
  Minus, 
  Trash2, 
  Send, 
  CheckCircle, 
  Clock, 
  ChefHat, 
  Search, 
  Flame, 
  Leaf, 
  Star,
  Users,
  MapPin,
  BellRing
} from 'lucide-react';

export const WaiterPosView: React.FC = () => {
  const { 
    menuItems, 
    restaurantOrders, 
    restaurantTables, 
    updateTableStatus, 
    clearTable,
    placeRestaurantOrder, 
    updateOrderStatus,
    currentCurrency,
    activeUser,
    roomUnits,
    showToast
  } = useHotel();

  const [selectedDestinationType, setSelectedDestinationType] = useState<'table' | 'room'>('table');
  const [selectedTableId, setSelectedTableId] = useState<string>('tbl-1');
  const [selectedRoomNumber, setSelectedRoomNumber] = useState<string>('Room 302');
  const [guestNameInput, setGuestNameInput] = useState<string>('Eleanor Vance');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Cart state
  const [cart, setCart] = useState<{
    item: MenuItem;
    quantity: number;
    spiceLevel?: 'Mild' | 'Medium' | 'Hot';
    notes?: string;
  }[]>([]);

  const categories: ('All' | MenuItemCategory)[] = [
    'All',
    'Nepali Heritage & Cuisine',
    'Main Course',
    'Himalayan Specials',
    'Starters',
    'Ground-Floor Bar & Beverages',
    'Desserts'
  ];

  const currentSelectedTable = restaurantTables.find((t) => t.id === selectedTableId);

  const filteredMenu = menuItems.filter((item) => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleAddToCart = (dish: MenuItem) => {
    if (!dish.available) {
      showToast('Item 86\'d', `${dish.name} is currently out of stock.`, 'warning');
      return;
    }

    setCart((prev) => {
      const existing = prev.find((c) => c.item.id === dish.id);
      if (existing) {
        return prev.map((c) => (c.item.id === dish.id ? { ...c, quantity: c.quantity + 1 } : c));
      }
      return [...prev, { item: dish, quantity: 1, spiceLevel: dish.isSpicy ? 'Medium' : 'Mild' }];
    });
  };

  const handleUpdateQty = (dishId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.item.id === dishId) {
            const newQty = c.quantity + delta;
            return newQty > 0 ? { ...c, quantity: newQty } : null;
          }
          return c;
        })
        .filter(Boolean) as typeof cart
    );
  };

  const handleRemoveFromCart = (dishId: string) => {
    setCart((prev) => prev.filter((c) => c.item.id !== dishId));
  };

  const handleSetSpice = (dishId: string, spice: 'Mild' | 'Medium' | 'Hot') => {
    setCart((prev) =>
      prev.map((c) => (c.item.id === dishId ? { ...c, spiceLevel: spice } : c))
    );
  };

  const handleSetNotes = (dishId: string, notes: string) => {
    setCart((prev) =>
      prev.map((c) => (c.item.id === dishId ? { ...c, notes } : c))
    );
  };

  // Statutory Nepal Calculations
  const cartSubtotalUSD = cart.reduce((acc, c) => acc + c.item.priceUSD * c.quantity, 0);
  const cartServiceChargeUSD = Math.round(cartSubtotalUSD * 0.10 * 100) / 100;
  const cartVatBaseUSD = cartSubtotalUSD + cartServiceChargeUSD;
  const cartVatUSD = Math.round(cartVatBaseUSD * 0.13 * 100) / 100;
  const cartTotalUSD = Math.round((cartVatBaseUSD + cartVatUSD) * 100) / 100;

  const handleDispatchKOT = () => {
    if (cart.length === 0) return;

    const destinationLabel =
      selectedDestinationType === 'table'
        ? (currentSelectedTable?.tableNumber || 'Table T-01')
        : selectedRoomNumber;

    const destinationZone =
      selectedDestinationType === 'room'
        ? 'room'
        : currentSelectedTable?.zone === 'courtyard'
        ? 'courtyard'
        : 'rooftop_table';

    placeRestaurantOrder({
      roomNumber: selectedDestinationType === 'room' ? selectedRoomNumber : '',
      tableOrRoomNo: destinationLabel,
      guestName: guestNameInput || (selectedDestinationType === 'table' ? currentSelectedTable?.guestName || 'Table Guest' : 'Room Guest'),
      destination: destinationZone,
      items: cart.map((c) => ({
        menuItemId: c.item.id,
        name: `${c.item.name}${c.spiceLevel ? ` [${c.spiceLevel}]` : ''}${c.notes ? ` (${c.notes})` : ''}`,
        quantity: c.quantity,
        unitPriceUSD: c.item.priceUSD,
        specialInstructions: c.notes,
      })),
      subtotalUSD: cartSubtotalUSD,
      taxUSD: cartVatUSD,
      serviceChargeUSD: cartServiceChargeUSD,
      totalAmountUSD: cartTotalUSD,
      waiterAssigned: activeUser?.name || 'Prakash Lama (Service Lead)',
      paymentMode: selectedDestinationType === 'room' ? 'charge_to_room' : 'cash_on_delivery',
    });

    if (selectedDestinationType === 'table' && currentSelectedTable) {
      updateTableStatus(
        currentSelectedTable.id,
        'order_placed',
        guestNameInput || currentSelectedTable.guestName || 'Dine-in Guest',
        activeUser?.name || 'Prakash Lama'
      );
    }

    setCart([]);
    showToast('KOT Dispatched to Chef!', `Order sent to kitchen for ${destinationLabel}.`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Waiter Terminal Header */}
      <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5 text-amber-700 dark:text-amber-400" />
            <h2 className="text-lg font-serif font-bold text-stone-900 dark:text-stone-100">
              Waiter POS & Table Terminal
            </h2>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Service Station · Assigned Waiter: <span className="font-semibold text-stone-700 dark:text-stone-300">{activeUser?.name || 'Prakash Lama'}</span>. Fast table floor plan, special culinary notes, and live KOT kitchen dispatch.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 p-1 rounded-lg text-xs font-semibold">
            <button
              type="button"
              onClick={() => setSelectedDestinationType('table')}
              className={`px-3 py-1.5 rounded transition cursor-pointer ${
                selectedDestinationType === 'table'
                  ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-sm'
                  : 'text-stone-600 dark:text-stone-400'
              }`}
            >
              Ground-Floor & Courtyard Tables
            </button>
            <button
              type="button"
              onClick={() => setSelectedDestinationType('room')}
              className={`px-3 py-1.5 rounded transition cursor-pointer ${
                selectedDestinationType === 'room'
                  ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-sm'
                  : 'text-stone-600 dark:text-stone-400'
              }`}
            >
              In-Room Service
            </button>
          </div>
        </div>
      </div>

      {/* Table Floor Map / Room Picker */}
      <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-serif font-bold text-stone-900 dark:text-stone-100 text-sm">
            {selectedDestinationType === 'table' ? 'Select Active Dining Table' : 'Select In-House Guest Room'}
          </h3>
          <div className="flex items-center gap-2 text-[11px] text-stone-500 font-mono">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Vacant</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Seated</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Order Active</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500"></span> Reserved</span>
          </div>
        </div>

        {selectedDestinationType === 'table' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {restaurantTables.map((tbl) => {
              const isSelected = selectedTableId === tbl.id;
              const statusBg =
                tbl.status === 'vacant'
                  ? 'border-emerald-300 dark:border-emerald-800/60 bg-emerald-50/30'
                  : tbl.status === 'seated'
                  ? 'border-blue-300 dark:border-blue-800/60 bg-blue-50/30'
                  : tbl.status === 'order_placed'
                  ? 'border-amber-400 dark:border-amber-800/60 bg-amber-50/30'
                  : 'border-purple-300 dark:border-purple-800/60 bg-purple-50/30';

              return (
                <div
                  key={tbl.id}
                  onClick={() => {
                    setSelectedTableId(tbl.id);
                    if (tbl.guestName) setGuestNameInput(tbl.guestName);
                  }}
                  className={`p-3 rounded-xl border cursor-pointer transition text-center space-y-1 ${statusBg} ${
                    isSelected ? 'ring-2 ring-amber-600 shadow-md' : 'hover:scale-102'
                  }`}
                >
                  <div className="font-bold font-serif text-base text-stone-900 dark:text-stone-100">
                    {tbl.tableNumber}
                  </div>
                  <div className="text-[10px] text-stone-500 uppercase font-mono">
                    {tbl.zone} · {tbl.capacity} Pax
                  </div>
                  <div className="text-[10px] font-semibold capitalize font-mono text-stone-700 dark:text-stone-300">
                    {tbl.status.replace('_', ' ')}
                  </div>
                  {tbl.guestName && (
                    <div className="text-[11px] truncate text-stone-800 dark:text-stone-200 font-medium pt-1 border-t border-stone-200 dark:border-stone-800">
                      {tbl.guestName}
                    </div>
                  )}
                  {tbl.status !== 'vacant' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearTable(tbl.id);
                      }}
                      className="mt-1 text-[10px] text-stone-400 hover:text-red-500 underline"
                    >
                      Clear Table
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {roomUnits.map((u) => {
              const isSelected = selectedRoomNumber === `Room ${u.roomNumber}`;
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => {
                    setSelectedRoomNumber(`Room ${u.roomNumber}`);
                    if (u.currentGuestName) setGuestNameInput(u.currentGuestName);
                  }}
                  className={`p-3 rounded-xl border text-center transition cursor-pointer ${
                    isSelected
                      ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/40 ring-2 ring-amber-600'
                      : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 hover:bg-stone-50'
                  }`}
                >
                  <div className="font-serif font-bold text-base text-stone-900 dark:text-stone-100">
                    Room {u.roomNumber}
                  </div>
                  <div className="text-[11px] text-stone-500 truncate">
                    {u.currentGuestName || 'Vacant Room'}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* POS Menu Grid & Cart Split Screen */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Category & Menu Catalog */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-stone-900 p-4 rounded-xl border border-stone-200 dark:border-stone-800 shadow-sm">
            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-amber-700 text-white shadow-xs'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:text-stone-900'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-stone-400" />
              <input
                type="text"
                placeholder="Search dishes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100"
              />
            </div>
          </div>

          {/* Dishes Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {filteredMenu.map((dish) => (
              <div
                key={dish.id}
                onClick={() => handleAddToCart(dish)}
                className={`p-3.5 rounded-xl border transition shadow-xs flex flex-col justify-between cursor-pointer ${
                  dish.available
                    ? 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-amber-500'
                    : 'border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-950 opacity-60 cursor-not-allowed'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-1">
                    <span className="font-serif font-bold text-sm text-stone-900 dark:text-stone-100">
                      {dish.name}
                    </span>
                    {dish.isSpicy && <Flame className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />}
                  </div>

                  <p className="text-[11px] text-stone-500 line-clamp-2 mt-1">
                    {dish.description}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
                  <span className="font-mono font-bold text-sm text-stone-900 dark:text-stone-100">
                    {formatCurrency(convertPrice(dish.priceUSD, currentCurrency), currentCurrency)}
                  </span>
                  {dish.available ? (
                    <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400">
                      + Add
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-red-100 dark:bg-red-950 text-red-700">
                      86'd
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 1 Column: Active KOT Cart & Nepal Math */}
        <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-5 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
              <div>
                <span className="text-xs font-mono uppercase text-amber-600 font-bold">KOT Kitchen Ticket</span>
                <div className="font-serif font-bold text-stone-900 dark:text-stone-100 text-base">
                  {selectedDestinationType === 'table' ? `Table: ${currentSelectedTable?.tableNumber || 'T-01'}` : selectedRoomNumber}
                </div>
              </div>
              <div className="text-right">
                <input
                  type="text"
                  placeholder="Guest name..."
                  value={guestNameInput}
                  onChange={(e) => setGuestNameInput(e.target.value)}
                  className="text-xs px-2 py-1 rounded border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 w-32"
                />
              </div>
            </div>

            {/* Cart Items List */}
            {cart.length === 0 ? (
              <div className="py-12 text-center text-xs text-stone-400 space-y-2">
                <ChefHat className="w-8 h-8 mx-auto text-stone-300 dark:text-stone-700" />
                <p>Cart is currently empty.</p>
                <p className="text-[11px] text-stone-500">Tap dishes on the menu to build the KOT ticket.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {cart.map((c) => (
                  <div
                    key={c.item.id}
                    className="p-3 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950/50 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between font-semibold text-stone-900 dark:text-stone-100">
                      <span>{c.item.name}</span>
                      <span className="font-mono">{formatCurrency(convertPrice(c.item.priceUSD * c.quantity, currentCurrency), currentCurrency)}</span>
                    </div>

                    {/* Quantity & Spice Controls */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1">
                        {(['Mild', 'Medium', 'Hot'] as const).map((lvl) => (
                          <button
                            key={lvl}
                            type="button"
                            onClick={() => handleSetSpice(c.item.id, lvl)}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono cursor-pointer ${
                              c.spiceLevel === lvl
                                ? 'bg-amber-600 text-white font-bold'
                                : 'bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
                            }`}
                          >
                            {lvl}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(c.item.id, -1)}
                          className="w-5 h-5 rounded bg-stone-200 dark:bg-stone-800 flex items-center justify-center hover:bg-stone-300 cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-mono font-bold">{c.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(c.item.id, 1)}
                          className="w-5 h-5 rounded bg-stone-200 dark:bg-stone-800 flex items-center justify-center hover:bg-stone-300 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveFromCart(c.item.id)}
                          className="text-stone-400 hover:text-red-500 ml-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <input
                      type="text"
                      placeholder="Chef instructions (e.g. no garlic)..."
                      value={c.notes || ''}
                      onChange={(e) => handleSetNotes(c.item.id, e.target.value)}
                      className="w-full text-[11px] px-2 py-1 rounded border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Statutory Nepal Math Summary & Dispatch */}
          <div className="pt-4 border-t border-stone-200 dark:border-stone-800 space-y-2 text-xs">
            <div className="flex justify-between text-stone-600 dark:text-stone-400 font-mono">
              <span>Items Subtotal:</span>
              <span className="tabular-nums">{formatCurrency(convertPrice(cartSubtotalUSD, currentCurrency), currentCurrency)}</span>
            </div>
            <div className="flex justify-between text-stone-600 dark:text-stone-400 font-mono">
              <span>10% Service Charge:</span>
              <span className="tabular-nums">{formatCurrency(convertPrice(cartServiceChargeUSD, currentCurrency), currentCurrency)}</span>
            </div>
            <div className="flex justify-between text-stone-600 dark:text-stone-400 font-mono">
              <span>13% Nepal VAT:</span>
              <span className="tabular-nums">{formatCurrency(convertPrice(cartVatUSD, currentCurrency), currentCurrency)}</span>
            </div>
            <div className="flex justify-between text-stone-900 dark:text-stone-100 font-serif font-bold text-sm pt-1 border-t border-stone-100 dark:border-stone-800">
              <span>Grand Total:</span>
              <span className="font-mono tabular-nums text-amber-700 dark:text-amber-400">
                {formatCurrency(convertPrice(cartTotalUSD, currentCurrency), currentCurrency)}
              </span>
            </div>

            <button
              type="button"
              disabled={cart.length === 0}
              onClick={handleDispatchKOT}
              className={`w-full py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition shadow-sm mt-3 cursor-pointer ${
                cart.length > 0
                  ? 'bg-amber-700 hover:bg-amber-800 text-white'
                  : 'bg-stone-200 dark:bg-stone-800 text-stone-400 cursor-not-allowed'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Dispatch KOT to Kitchen</span>
            </button>
          </div>
        </div>
      </div>

      {/* Active Orders Tracker for Waiter */}
      <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-5 shadow-sm space-y-4">
        <h3 className="font-serif font-bold text-stone-900 dark:text-stone-100">
          Live Restaurant & In-Room Active Orders ({restaurantOrders.length})
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {restaurantOrders.map((ord) => (
            <div
              key={ord.id}
              className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950/50 space-y-2 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-amber-700 dark:text-amber-400">
                  {ord.orderNumber}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                    ord.status === 'ready_for_delivery'
                      ? 'bg-emerald-600 text-white animate-pulse'
                      : ord.status === 'preparing'
                      ? 'bg-amber-600 text-white'
                      : ord.status === 'delivered'
                      ? 'bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
                      : 'bg-blue-600 text-white'
                  }`}
                >
                  {ord.status.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="font-semibold text-stone-900 dark:text-stone-100">
                {ord.tableOrRoomNo} · {ord.guestName}
              </div>

              <div className="text-stone-500 space-y-0.5 text-[11px]">
                {ord.items.map((i, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>{i.quantity}x {i.name}</span>
                    <span className="font-mono">{formatCurrency(convertPrice(i.unitPriceUSD * i.quantity, currentCurrency), currentCurrency)}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between font-mono">
                <span className="text-stone-500">Total Bill:</span>
                <span className="font-bold text-stone-900 dark:text-stone-100">{formatCurrency(convertPrice(ord.totalAmountUSD, currentCurrency), currentCurrency)}</span>
              </div>

              {ord.status === 'ready_for_delivery' && (
                <button
                  type="button"
                  onClick={() => updateOrderStatus(ord.id, 'delivered')}
                  className="w-full py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs mt-2 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <BellRing className="w-3 h-3" />
                  <span>Mark Delivered to Table/Room</span>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

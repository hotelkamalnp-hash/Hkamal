import React, { useState, useEffect } from 'react';
import { useHotel } from '../../context/HotelContext';
import { RestaurantOrder, MenuItem } from '../../types/hotel';
import { formatCurrency, convertPrice } from '../../utils/theme';
import { 
  ChefHat, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Flame, 
  BellRing, 
  Ban, 
  Utensils, 
  RotateCw,
  Sparkles
} from 'lucide-react';

export const KitchenKdsView: React.FC = () => {
  const { 
    restaurantOrders, 
    updateOrderStatus, 
    menuItems, 
    updateMenuItem,
    activeUser,
    currentCurrency,
    showToast
  } = useHotel();

  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'preparing' | 'ready'>('all');
  const [showOutStockManager, setShowOutStockManager] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Clock tick for live elapsed timers
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  const pendingOrders = restaurantOrders.filter((o) => o.status === 'placed');
  const preparingOrders = restaurantOrders.filter((o) => o.status === 'preparing');
  const readyOrders = restaurantOrders.filter((o) => o.status === 'ready_for_delivery');
  const deliveredOrders = restaurantOrders.filter((o) => o.status === 'delivered');

  const filteredOrders = restaurantOrders.filter((o) => {
    if (activeFilter === 'pending') return o.status === 'placed';
    if (activeFilter === 'preparing') return o.status === 'preparing';
    if (activeFilter === 'ready') return o.status === 'ready_for_delivery';
    return o.status !== 'delivered';
  });

  const getElapsedMinutes = (createdAt: string) => {
    const elapsedMs = currentTime - new Date(createdAt).getTime();
    return Math.floor(elapsedMs / 60000);
  };

  const handleStartPrep = (order: RestaurantOrder) => {
    updateOrderStatus(order.id, 'preparing', activeUser?.name || 'Chef Ramesh');
    showToast('Preparation Started', `Ticket #${order.orderNumber} is now in the kitchen cook queue.`);
  };

  const handleMarkReady = (order: RestaurantOrder) => {
    updateOrderStatus(order.id, 'ready_for_delivery', activeUser?.name || 'Chef Ramesh');
    showToast('Food Ready!', `Ringing Waiter for ${order.tableOrRoomNo} (#${order.orderNumber}).`, 'success');
  };

  const handleBumpDelivered = (order: RestaurantOrder) => {
    updateOrderStatus(order.id, 'delivered', activeUser?.name || 'Chef Ramesh');
    showToast('Ticket Bumped', `Order #${order.orderNumber} archived as delivered.`);
  };

  const handleToggleStock = (dish: MenuItem) => {
    updateMenuItem(dish.id, { available: !dish.available });
    showToast(
      dish.available ? 'Dish 86\'d' : 'Dish Restocked',
      `${dish.name} is now ${dish.available ? 'OFF the menu (86\'d)' : 'ACTIVE on menu'}.`
    );
  };

  return (
    <div className="space-y-6">
      {/* Kitchen Display System Header */}
      <div className="bg-stone-900 text-stone-100 rounded-xl border border-stone-800 p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ChefHat className="w-6 h-6 text-amber-400" />
            <h2 className="text-xl font-serif font-bold text-white">
              Kitchen Display System (KDS & Chef Station)
            </h2>
          </div>
          <p className="text-xs text-stone-400 mt-1">
            Station Lead: <span className="text-amber-300 font-semibold">{activeUser?.name || 'Chef Ramesh Magar'}</span> · Real-time KOT tickets, prep timers, waiter ready chimes, and instant 86'd out-of-stock toggles.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowOutStockManager(!showOutStockManager)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 transition cursor-pointer"
          >
            <Ban className="w-3.5 h-3.5 text-red-400" />
            <span>Manage 86'd Dishes ({menuItems.filter((m) => !m.available).length})</span>
          </button>
        </div>
      </div>

      {/* 86'd Item Manager Drawer (if toggled) */}
      {showOutStockManager && (
        <div className="bg-white dark:bg-stone-900 rounded-xl border border-amber-300 dark:border-amber-900 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-stone-900 dark:text-stone-100">
              <Ban className="w-4 h-4 text-red-500" />
              <h3 className="font-serif font-bold text-sm">
                Chef 86'd (Out of Stock) Catalog Controls
              </h3>
            </div>
            <span className="text-xs text-stone-500">
              Disabling an item here immediately prevents Waiters and In-Room Guests from ordering it.
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {menuItems.map((dish) => (
              <div
                key={dish.id}
                className="p-3 rounded-lg border border-stone-200 dark:border-stone-800 flex items-center justify-between gap-2 text-xs"
              >
                <div className="truncate">
                  <div className="font-semibold text-stone-900 dark:text-stone-100 truncate">{dish.name}</div>
                  <div className="text-[10px] text-stone-500 font-mono">{formatCurrency(convertPrice(dish.priceUSD, currentCurrency), currentCurrency)}</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleStock(dish)}
                  className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition cursor-pointer ${
                    dish.available
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 hover:bg-red-100 hover:text-red-700'
                      : 'bg-red-600 text-white hover:bg-emerald-600'
                  }`}
                >
                  {dish.available ? 'In Stock' : '86\'d'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Tabs & Kitchen Counters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveFilter('all')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
            activeFilter === 'all'
              ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
              : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
          }`}
        >
          <span>All Active ({pendingOrders.length + preparingOrders.length + readyOrders.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('pending')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
            activeFilter === 'pending'
              ? 'bg-blue-600 text-white'
              : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
          }`}
        >
          <span>New Orders ({pendingOrders.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('preparing')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
            activeFilter === 'preparing'
              ? 'bg-amber-600 text-white'
              : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
          }`}
        >
          <span>In Cooking ({preparingOrders.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('ready')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
            activeFilter === 'ready'
              ? 'bg-emerald-600 text-white'
              : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
          }`}
        >
          <span>Ready to Serve ({readyOrders.length})</span>
        </button>
      </div>

      {/* KDS Ticket Cards Grid */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-12 text-center text-stone-400 space-y-3">
          <ChefHat className="w-12 h-12 mx-auto text-stone-300 dark:text-stone-700" />
          <h4 className="font-serif font-bold text-stone-900 dark:text-stone-100 text-base">
            Kitchen Queue Clear!
          </h4>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            All guest room service and ground-floor dining tickets have been completed and served. New orders placed by Waiters will appear here in real time.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((ord) => {
            const elapsedMins = getElapsedMinutes(ord.createdAt);
            const timerColor =
              elapsedMins > 25
                ? 'bg-red-500 text-white animate-pulse'
                : elapsedMins > 15
                ? 'bg-amber-500 text-white'
                : 'bg-stone-800 text-stone-200';

            return (
              <div
                key={ord.id}
                className="bg-white dark:bg-stone-900 rounded-xl border-2 border-stone-300 dark:border-stone-700 shadow-md flex flex-col justify-between overflow-hidden"
              >
                {/* Ticket Top Banner */}
                <div className="bg-stone-900 text-white p-3 flex items-center justify-between">
                  <div>
                    <div className="font-mono font-bold text-sm text-amber-400">
                      #{ord.orderNumber}
                    </div>
                    <div className="font-serif font-bold text-base">
                      {ord.tableOrRoomNo}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${timerColor}`}>
                      <Clock className="w-3 h-3 inline mr-1" />
                      {elapsedMins} min
                    </span>
                    <div className="text-[10px] text-stone-400 truncate mt-1">
                      {ord.guestName}
                    </div>
                  </div>
                </div>

                {/* Ticket Items List */}
                <div className="p-4 space-y-2 flex-1">
                  <div className="text-[11px] text-stone-500 font-mono flex items-center justify-between pb-1 border-b border-stone-100 dark:border-stone-800">
                    <span>Waiter: {ord.waiterAssigned || 'Prakash Lama'}</span>
                    <span className="capitalize">{ord.destination.replace('_', ' ')}</span>
                  </div>

                  <div className="space-y-2 pt-1">
                    {ord.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-start justify-between text-xs py-1 border-b border-stone-100 dark:border-stone-800/60 last:border-0"
                      >
                        <div>
                          <div className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                            <span className="text-amber-700 dark:text-amber-400 mr-1.5">{item.quantity}x</span>
                            {item.name}
                          </div>
                          {item.specialInstructions && (
                            <div className="text-[11px] text-amber-700 dark:text-amber-300 italic font-mono mt-0.5">
                              Note: {item.specialInstructions}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Ticket Bottom Actions */}
                <div className="p-3 bg-stone-50 dark:bg-stone-950 border-t border-stone-200 dark:border-stone-800">
                  {ord.status === 'placed' && (
                    <button
                      type="button"
                      onClick={() => handleStartPrep(ord)}
                      className="w-full py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Flame className="w-3.5 h-3.5" />
                      <span>Start Cooking (Prep)</span>
                    </button>
                  )}

                  {ord.status === 'preparing' && (
                    <button
                      type="button"
                      onClick={() => handleMarkReady(ord)}
                      className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm animate-pulse"
                    >
                      <BellRing className="w-3.5 h-3.5" />
                      <span>Food Ready (Ring Waiter)</span>
                    </button>
                  )}

                  {ord.status === 'ready_for_delivery' && (
                    <button
                      type="button"
                      onClick={() => handleBumpDelivered(ord)}
                      className="w-full py-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-white dark:bg-stone-100 dark:text-stone-900 font-semibold text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Bump / Delivered</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

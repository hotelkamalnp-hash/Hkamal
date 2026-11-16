import React, { useMemo, useState } from 'react';
import { useHotel } from '../../context/HotelContext';
import { OrderStatus, RoomServiceRequestStatus } from '../../types/hotel';
import { formatCurrency, convertPrice } from '../../utils/theme';
import {
  BellRing,
  Utensils,
  ConciergeBell,
  Search,
  Clock,
  CheckCircle2,
  ChefHat,
  Truck,
  XCircle,
  UserCheck,
} from 'lucide-react';

type QueueKindFilter = 'all' | 'food_orders' | 'room_amenities';
type QueueStatusFilter = 'active' | 'completed' | 'all';

export const ServiceRequestsQueuePanel: React.FC = () => {
  const {
    restaurantOrders,
    updateOrderStatus,
    roomServiceRequests,
    updateRoomServiceRequestStatus,
    staff,
    activeUser,
    currentCurrency,
    themeConfig,
  } = useHotel();

  const [kindFilter, setKindFilter] = useState<QueueKindFilter>('all');
  const [statusFilter, setStatusFilter] = useState<QueueStatusFilter>('active');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedRunners, setSelectedRunners] = useState<Record<string, string>>({});

  const staffOptions = useMemo(() => {
    const filtered = staff.filter(
      (s) =>
        s.role === 'waiter' ||
        s.role === 'housekeeping' ||
        s.role === 'receptionist' ||
        s.role === 'chef' ||
        s.role === 'hotel_manager'
    );
    return filtered.length > 0 ? filtered : staff;
  }, [staff]);

  const activeFoodOrders = useMemo(
    () =>
      restaurantOrders.filter(
        (o) => o.status !== 'delivered' && o.status !== 'cancelled'
      ),
    [restaurantOrders]
  );

  const activeAmenityRequests = useMemo(
    () =>
      roomServiceRequests.filter(
        (r) => r.status === 'pending' || r.status === 'acknowledged' || r.status === 'in_progress'
      ),
    [roomServiceRequests]
  );

  const completedTodayCount = useMemo(() => {
    const doneFood = restaurantOrders.filter((o) => o.status === 'delivered').length;
    const doneAmenities = roomServiceRequests.filter((r) => r.status === 'delivered').length;
    return doneFood + doneAmenities;
  }, [restaurantOrders, roomServiceRequests]);

  const query = searchTerm.trim().toLowerCase();

  const filteredFoodOrders = useMemo(() => {
    if (kindFilter === 'room_amenities') return [];
    return restaurantOrders.filter((ord) => {
      const isDone = ord.status === 'delivered' || ord.status === 'cancelled';
      if (statusFilter === 'active' && isDone) return false;
      if (statusFilter === 'completed' && !isDone) return false;
      if (query) {
        const hay = `${ord.orderNumber} ${ord.roomNumber} ${ord.tableOrRoomNo} ${ord.guestName} ${ord.items
          .map((i) => i.name)
          .join(' ')}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });
  }, [restaurantOrders, kindFilter, statusFilter, query]);

  const filteredAmenities = useMemo(() => {
    if (kindFilter === 'food_orders') return [];
    return roomServiceRequests.filter((req) => {
      const isDone = req.status === 'delivered' || req.status === 'cancelled';
      if (statusFilter === 'active' && isDone) return false;
      if (statusFilter === 'completed' && !isDone) return false;
      if (query) {
        const hay = `${req.requestCode} ${req.roomNumber} ${req.guestName} ${req.items
          .map((i) => i.name)
          .join(' ')}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });
  }, [roomServiceRequests, kindFilter, statusFilter, query]);

  const getOrderStatusDisplay = (status: OrderStatus) => {
    switch (status) {
      case 'placed':
        return { label: 'New Order · Awaiting Accept', cls: 'text-rose-700 dark:text-rose-400' };
      case 'confirmed_by_waiter':
        return { label: 'Accepted by Service Desk', cls: 'text-amber-700 dark:text-amber-400' };
      case 'preparing':
        return { label: 'Preparing in Kitchen', cls: 'text-amber-700 dark:text-amber-300' };
      case 'ready_for_delivery':
        return { label: 'Ready for Room Delivery', cls: 'text-sky-700 dark:text-sky-400' };
      case 'delivered':
        return { label: 'Delivered & Billed', cls: 'text-emerald-700 dark:text-emerald-400' };
      case 'cancelled':
        return { label: 'Cancelled', cls: 'text-stone-400' };
    }
  };

  const getAmenityStatusDisplay = (status: RoomServiceRequestStatus) => {
    switch (status) {
      case 'pending':
        return { label: 'Pending Dispatch', cls: 'text-rose-700 dark:text-rose-400' };
      case 'acknowledged':
        return { label: 'Assigned', cls: 'text-amber-700 dark:text-amber-400' };
      case 'in_progress':
        return { label: 'Out for Delivery', cls: 'text-sky-700 dark:text-sky-400' };
      case 'delivered':
        return { label: 'Delivered', cls: 'text-emerald-700 dark:text-emerald-400' };
      case 'cancelled':
        return { label: 'Cancelled', cls: 'text-stone-400' };
    }
  };

  const totalVisible = filteredFoodOrders.length + filteredAmenities.length;

  return (
    <div className="space-y-6">
      {/* KPI Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-stone-900 p-4 rounded-xl border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span>Open Service Requests</span>
            <BellRing className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-1.5 text-2xl font-serif font-bold text-stone-900 dark:text-stone-50 tabular-nums">
            {activeFoodOrders.length + activeAmenityRequests.length}
          </div>
          <div className="text-[11px] text-stone-400 mt-0.5">
            Live food orders &amp; guest requests
          </div>
        </div>

        <div className="bg-white dark:bg-stone-900 p-4 rounded-xl border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span>Active Dining / Food Orders</span>
            <Utensils className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="mt-1.5 text-2xl font-serif font-bold text-stone-900 dark:text-stone-50 tabular-nums">
            {activeFoodOrders.length}
          </div>
          <div className="text-[11px] text-stone-400 mt-0.5">
            Routed from Digital Menu &amp; POS
          </div>
        </div>

        <div className="bg-white dark:bg-stone-900 p-4 rounded-xl border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span>Pending Room Amenities</span>
            <ConciergeBell className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="mt-1.5 text-2xl font-serif font-bold text-stone-900 dark:text-stone-50 tabular-nums">
            {activeAmenityRequests.length}
          </div>
          <div className="text-[11px] text-stone-400 mt-0.5">
            Towels, pillows &amp; room supplies
          </div>
        </div>

        <div className="bg-white dark:bg-stone-900 p-4 rounded-xl border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span>Fulfilled Requests</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-1.5 text-2xl font-serif font-bold text-stone-900 dark:text-stone-50 tabular-nums">
            {completedTodayCount}
          </div>
          <div className="text-[11px] text-stone-400 mt-0.5">
            Completed &amp; synced to guest folios
          </div>
        </div>
      </div>

      {/* Unified Service Requests Console */}
      <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-5 shadow-sm space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-4">
          <div>
            <h3 className="text-lg font-serif font-bold text-stone-900 dark:text-stone-50">
              Service Requests Dispatch Queue
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Incoming Digital Restaurant Menu orders and in-room amenity requests arrive here for live dispatch.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Room, guest, order #..."
                className="pl-8 pr-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs text-stone-900 dark:text-stone-100 w-44 sm:w-52"
              />
            </div>

            <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 p-1 rounded-lg">
              {(
                [
                  { id: 'all', label: 'All Types' },
                  { id: 'food_orders', label: `Food Orders (${restaurantOrders.length})` },
                  { id: 'room_amenities', label: `Amenities (${roomServiceRequests.length})` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setKindFilter(tab.id)}
                  className={`px-2.5 py-1 rounded-md font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                    kindFilter === tab.id
                      ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-50 shadow-xs'
                      : 'text-stone-600 dark:text-stone-400'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 p-1 rounded-lg">
              {(
                [
                  { id: 'active', label: 'Active' },
                  { id: 'completed', label: 'Completed' },
                  { id: 'all', label: 'All' },
                ] as const
              ).map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setStatusFilter(st.id)}
                  className={`px-2.5 py-1 rounded-md font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                    statusFilter === st.id
                      ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-50 shadow-xs'
                      : 'text-stone-600 dark:text-stone-400'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {totalVisible === 0 ? (
          <div className="py-12 text-center text-xs text-stone-500 dark:text-stone-400">
            No service requests match the active filters.
          </div>
        ) : (
          <div className="space-y-6">
            {/* Food & Rooftop Dining Orders */}
            {filteredFoodOrders.length > 0 && (
              <div className="space-y-3">
                <div className="text-xs font-mono font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                  <Utensils className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Food &amp; Rooftop Dining Orders ({filteredFoodOrders.length})</span>
                </div>

                <div className="divide-y divide-stone-200 dark:divide-stone-800 border border-stone-200 dark:border-stone-800 rounded-xl px-4">
                  {filteredFoodOrders.map((ord) => {
                    const statusInfo = getOrderStatusDisplay(ord.status);
                    const runner =
                      selectedRunners[ord.id] ||
                      ord.waiterAssigned ||
                      staffOptions[0]?.name ||
                      activeUser?.name ||
                      'Prakash Tamang';
                    const totalConverted = formatCurrency(
                      convertPrice(ord.totalAmountUSD, currentCurrency, themeConfig.exchangeRates),
                      currentCurrency
                    );

                    return (
                      <div
                        key={ord.id}
                        className="py-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4"
                      >
                        <div className="space-y-1.5 min-w-0">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                            <span className="font-mono font-bold text-stone-900 dark:text-stone-100 tabular-nums">
                              #{ord.orderNumber}
                            </span>
                            <span className="text-stone-300 dark:text-stone-700">·</span>
                            <span className="font-semibold text-stone-900 dark:text-stone-50">
                              {ord.tableOrRoomNo}
                            </span>
                            <span className="text-stone-300 dark:text-stone-700">·</span>
                            <span className="text-stone-600 dark:text-stone-300">{ord.guestName}</span>
                            <span className="text-stone-300 dark:text-stone-700">·</span>
                            <span className="text-stone-500 dark:text-stone-400 capitalize">
                              {ord.destination === 'room' ? 'In-Room Digital Menu' : 'Rooftop Dining'}
                            </span>
                            <span className="text-stone-300 dark:text-stone-700">·</span>
                            <span className={`font-semibold uppercase tracking-wide text-[11px] ${statusInfo.cls}`}>
                              {statusInfo.label}
                            </span>
                          </div>

                          <div className="text-sm font-semibold text-stone-900 dark:text-stone-50">
                            {ord.items.map((item) => `${item.quantity}× ${item.name}`).join(' · ')}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500 dark:text-stone-400">
                            <span className="inline-flex items-center gap-1 tabular-nums">
                              <Clock className="w-3 h-3" />
                              {new Date(ord.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            <span>·</span>
                            <span className="font-mono font-semibold text-stone-800 dark:text-stone-200 tabular-nums">
                              {totalConverted} ({ord.paymentMode.replace(/_/g, ' ')})
                            </span>
                            {ord.waiterAssigned && (
                              <>
                                <span>·</span>
                                <span className="inline-flex items-center gap-1 text-stone-700 dark:text-stone-300">
                                  <UserCheck className="w-3 h-3" />
                                  {ord.waiterAssigned}
                                </span>
                              </>
                            )}
                          </div>

                          {ord.kitchenNotes && (
                            <div className="text-xs text-stone-600 dark:text-stone-300 italic">
                              Notes: {ord.kitchenNotes}
                            </div>
                          )}
                        </div>

                        {ord.status !== 'delivered' && ord.status !== 'cancelled' && (
                          <div className="flex flex-wrap items-center gap-2 shrink-0 text-xs">
                            <select
                              value={runner}
                              onChange={(e) =>
                                setSelectedRunners((prev) => ({ ...prev, [ord.id]: e.target.value }))
                              }
                              className="px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                            >
                              {staffOptions.map((s) => (
                                <option key={s.id} value={s.name}>
                                  {s.name}
                                </option>
                              ))}
                            </select>

                            {ord.status === 'placed' && (
                              <button
                                type="button"
                                onClick={() => updateOrderStatus(ord.id, 'confirmed_by_waiter', runner)}
                                className="px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                              >
                                Accept Order
                              </button>
                            )}

                            {(ord.status === 'placed' || ord.status === 'confirmed_by_waiter') && (
                              <button
                                type="button"
                                onClick={() => updateOrderStatus(ord.id, 'preparing', runner)}
                                className="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-100 font-semibold flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                              >
                                <ChefHat className="w-3.5 h-3.5" />
                                <span>Send to Kitchen</span>
                              </button>
                            )}

                            {ord.status === 'preparing' && (
                              <button
                                type="button"
                                onClick={() => updateOrderStatus(ord.id, 'ready_for_delivery', runner)}
                                className="px-3 py-1.5 rounded-lg bg-sky-700 hover:bg-sky-800 text-white font-semibold flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                              >
                                <Truck className="w-3.5 h-3.5" />
                                <span>Ready for Delivery</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => updateOrderStatus(ord.id, 'delivered', runner)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Mark Delivered</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => updateOrderStatus(ord.id, 'cancelled', runner)}
                              className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 text-stone-400 hover:text-rose-600 hover:border-rose-300 cursor-pointer"
                              title="Cancel Order"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Room Service Amenity Requests */}
            {filteredAmenities.length > 0 && (
              <div className="space-y-3">
                <div className="text-xs font-mono font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                  <ConciergeBell className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>In-Room Amenity &amp; Housekeeping Requests ({filteredAmenities.length})</span>
                </div>

                <div className="divide-y divide-stone-200 dark:divide-stone-800 border border-stone-200 dark:border-stone-800 rounded-xl px-4">
                  {filteredAmenities.map((req) => {
                    const statusInfo = getAmenityStatusDisplay(req.status);
                    const attendant =
                      selectedRunners[req.id] ||
                      req.assignedHousekeeper ||
                      staffOptions[0]?.name ||
                      activeUser?.name ||
                      'Sunita Thapa';

                    return (
                      <div
                        key={req.id}
                        className="py-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4"
                      >
                        <div className="space-y-1.5 min-w-0">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                            <span className="font-mono font-bold text-stone-900 dark:text-stone-100 tabular-nums">
                              {req.requestCode}
                            </span>
                            <span className="text-stone-300 dark:text-stone-700">·</span>
                            <span className="font-semibold text-stone-900 dark:text-stone-50">
                              {req.roomNumber}
                            </span>
                            <span className="text-stone-300 dark:text-stone-700">·</span>
                            <span className="text-stone-600 dark:text-stone-300">{req.guestName}</span>
                            <span className="text-stone-300 dark:text-stone-700">·</span>
                            <span className={`font-semibold uppercase tracking-wide text-[11px] ${statusInfo.cls}`}>
                              {statusInfo.label}
                            </span>
                            {req.priority === 'urgent' && (
                              <>
                                <span className="text-stone-300 dark:text-stone-700">·</span>
                                <span className="font-semibold text-rose-600 dark:text-rose-400 uppercase text-[11px]">
                                  Urgent
                                </span>
                              </>
                            )}
                          </div>

                          <div className="text-sm font-semibold text-stone-900 dark:text-stone-50">
                            {req.items.map((item) => `${item.quantity}× ${item.name}`).join(' · ')}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-2 text-xs text-stone-500 dark:text-stone-400">
                            <span className="tabular-nums">Requested {req.requestedAt}</span>
                            {req.preferredTime && (
                              <>
                                <span>·</span>
                                <span>Window: {req.preferredTime}</span>
                              </>
                            )}
                            {req.assignedHousekeeper && (
                              <>
                                <span>·</span>
                                <span className="inline-flex items-center gap-1 text-stone-700 dark:text-stone-300">
                                  <UserCheck className="w-3 h-3" />
                                  {req.assignedHousekeeper}
                                </span>
                              </>
                            )}
                          </div>

                          {req.notes && (
                            <div className="text-xs text-stone-600 dark:text-stone-300 italic">
                              Guest note: &ldquo;{req.notes}&rdquo;
                            </div>
                          )}
                        </div>

                        {req.status !== 'delivered' && req.status !== 'cancelled' && (
                          <div className="flex flex-wrap items-center gap-2 shrink-0 text-xs">
                            <select
                              value={attendant}
                              onChange={(e) =>
                                setSelectedRunners((prev) => ({ ...prev, [req.id]: e.target.value }))
                              }
                              className="px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                            >
                              {staffOptions.map((s) => (
                                <option key={s.id} value={s.name}>
                                  {s.name}
                                </option>
                              ))}
                            </select>

                            {req.status === 'pending' && (
                              <button
                                type="button"
                                onClick={() =>
                                  updateRoomServiceRequestStatus(req.id, 'acknowledged', attendant)
                                }
                                className="px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                              >
                                Acknowledge &amp; Assign
                              </button>
                            )}

                            {(req.status === 'pending' || req.status === 'acknowledged') && (
                              <button
                                type="button"
                                onClick={() =>
                                  updateRoomServiceRequestStatus(req.id, 'in_progress', attendant)
                                }
                                className="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-100 font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                              >
                                Out for Delivery
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() =>
                                updateRoomServiceRequestStatus(req.id, 'delivered', attendant)
                              }
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              Mark Delivered
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useHotel } from '../context/HotelContext';
import { Room } from '../types/hotel';
import { getThemeClasses, formatCurrency, convertPrice } from '../utils/theme';
import { 
  Check, 
  ArrowRight, 
  LayoutGrid,
  Map as MapIcon
} from 'lucide-react';
import heroFallbackImg from '../assets/images/hero_hotel_exterior_1793848734140.jpg';
import { ModalDismissButton, useModalDismiss } from './Common/ModalDismissHandler';
import { InteractiveFloorPlanSelector } from './GuestPortal/InteractiveFloorPlanSelector';

interface RoomCatalogProps {
  filteredType?: string;
  minGuests?: number;
}

export const RoomCatalog: React.FC<RoomCatalogProps> = ({ filteredType = 'all', minGuests = 1 }) => {
  const { rooms, themeConfig, currentCurrency, openBookingModal } = useHotel();
  const [activeFilter, setActiveFilter] = useState<string>(filteredType);
  const [viewMode, setViewMode] = useState<'cards' | 'floorplan'>('cards');
  const [detailModalRoom, setDetailModalRoom] = useState<Room | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);

  useModalDismiss(Boolean(detailModalRoom), () => setDetailModalRoom(null));

  const themeClasses = getThemeClasses(themeConfig.palette);

  // Filter logic
  const filteredRooms = rooms.filter((room) => {
    if (activeFilter !== 'all' && room.type !== activeFilter) {
      return false;
    }
    if (minGuests > 1 && room.maxGuests < minGuests) {
      return false;
    }
    return true;
  });

  const getEffectivePriceInCurrentCurrency = (basePriceUSD: number) => {
    const surge = themeConfig.seasonalSurgeMultiplier || 1.0;
    const priceUSD = basePriceUSD * surge;
    return convertPrice(priceUSD, currentCurrency, themeConfig.exchangeRates);
  };

  const handleOpenDetail = (room: Room) => {
    setDetailModalRoom(room);
    setActiveImageIndex(0);
  };

  return (
    <section id="rooms" className="py-16 lg:py-24 bg-stone-50 dark:bg-stone-950 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Clean Editorial Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div className="max-w-xl">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-amber-800 dark:text-amber-400 mb-2">
              {themeConfig.roomsSectionSubtitle || 'Accommodations'}
            </p>
            <h2 className="text-3xl sm:text-4xl font-serif font-semibold text-stone-900 dark:text-stone-50 tracking-tight text-balance">
              {themeConfig.roomsSectionTitle || 'Suites & Private Rooms'}
            </h2>
            <p className="mt-2.5 text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
              {themeConfig.roomsSectionDescription ||
                'Handcrafted Newari woodwork, sunlit courtyard views, and quiet boutique comfort in the heart of Kamalpokhari.'}
            </p>
          </div>

          <div
            role="group"
            aria-label="Room browsing layout"
            className="inline-flex items-center rounded-lg bg-white dark:bg-stone-900 p-1 border border-stone-200 dark:border-stone-800 shrink-0 self-start md:self-auto"
          >
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Suites</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('floorplan')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                viewMode === 'floorplan'
                  ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>Floor Plan</span>
            </button>
          </div>
        </div>

        {/* Minimal Category Filter Bar */}
        <div className="flex flex-wrap items-center gap-1.5 mb-10 pb-4 border-b border-stone-200/80 dark:border-stone-800">
          {[
            { id: 'all', label: 'All' },
            { id: 'deluxe', label: 'Deluxe Heritage' },
            { id: 'executive-suite', label: 'Executive Suites' },
            { id: 'super-deluxe', label: 'Family Veranda' },
            { id: 'standard-cozy', label: 'Cozy Retreat' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveFilter(tab.id);
                setViewMode('cards');
              }}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                activeFilter === tab.id && viewMode === 'cards'
                  ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Interactive 2D Floor Plan Mode */}
        {viewMode === 'floorplan' ? (
          <InteractiveFloorPlanSelector compactHeader />
        ) : (
        <>
        {/* Clean 2-Column Editorial Suites Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {filteredRooms.map((room) => {
            const price = getEffectivePriceInCurrentCurrency(room.pricePerNightUSD);
            const original = room.originalPriceUSD ? getEffectivePriceInCurrentCurrency(room.originalPriceUSD) : null;
            const mainImg = room.images[0] || heroFallbackImg;

            return (
              <article
                key={room.id}
                className="group bg-white dark:bg-stone-900 rounded-xl overflow-hidden border border-stone-200/90 dark:border-stone-800 flex flex-col transition-shadow hover:shadow-md"
              >
                {/* Uninterrupted Clean Photography */}
                <button
                  type="button"
                  onClick={() => handleOpenDetail(room)}
                  className="relative aspect-[16/10] overflow-hidden bg-stone-200 dark:bg-stone-800 text-left cursor-pointer focus-visible:outline-none"
                  title={`Open gallery & details for ${room.name}`}
                >
                  <img
                    src={mainImg}
                    alt={room.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out"
                  />
                </button>

                {/* Editorial Content Area */}
                <div className="p-6 flex-1 flex flex-col justify-between space-y-5">
                  <div className="space-y-2.5">
                    {/* Quiet Unboxed Eyebrow */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500 dark:text-stone-400">
                      <span>
                        {room.view} <span aria-hidden="true">·</span> {room.floor}
                      </span>
                      <span className="tabular-nums text-stone-600 dark:text-stone-300">
                        {room.availableUnits > 0 ? `${room.availableUnits} available` : 'Booked'}
                      </span>
                    </div>

                    <h3 className="text-xl sm:text-2xl font-serif font-semibold text-stone-900 dark:text-stone-50 tracking-tight">
                      {room.name}
                    </h3>

                    {/* Unboxed Metadata Line */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 dark:text-stone-400 tabular-nums">
                      <span>{room.bedType}</span>
                      <span aria-hidden="true">·</span>
                      <span>{room.sizeSqFt} sq ft</span>
                      <span aria-hidden="true">·</span>
                      <span>Up to {room.maxGuests} {room.maxGuests === 1 ? 'guest' : 'guests'}</span>
                    </div>

                    <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed line-clamp-2 pt-0.5">
                      {room.description}
                    </p>
                  </div>

                  {/* Clean Pricing & Primary Action */}
                  <div className="pt-4 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl sm:text-2xl font-semibold font-serif text-stone-900 dark:text-stone-50 tabular-nums">
                          {formatCurrency(price, currentCurrency)}
                        </span>
                        {original && (
                          <span className="text-xs text-stone-400 line-through tabular-nums">
                            {formatCurrency(original, currentCurrency)}
                          </span>
                        )}
                        <span className="text-xs text-stone-500 dark:text-stone-400">/ night</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenDetail(room)}
                        className="px-3 py-2 text-xs font-medium text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white transition-colors whitespace-nowrap cursor-pointer"
                      >
                        Details
                      </button>
                      <button
                        type="button"
                        onClick={() => openBookingModal(room)}
                        disabled={room.availableUnits <= 0}
                        className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                          room.availableUnits > 0
                            ? themeClasses.primary
                            : 'bg-stone-200 dark:bg-stone-800 text-stone-500 cursor-not-allowed'
                        }`}
                      >
                        <span>{room.availableUnits > 0 ? 'Reserve' : 'Sold Out'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* Empty Search Fallback */}
        {filteredRooms.length === 0 && (
          <div className="p-12 text-center bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800">
            <h3 className="text-lg font-medium text-stone-900 dark:text-stone-100">No accommodations match your filter criteria</h3>
            <p className="mt-1 text-xs text-stone-500">Please choose a different capacity or room category.</p>
            <button
              onClick={() => setActiveFilter('all')}
              className="mt-4 px-4 py-2 text-xs font-semibold rounded bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900"
            >
              Reset Filters
            </button>
          </div>
        )}
        </>
        )}
      </div>

      {/* Room Detail & Photo Gallery Modal */}
      {detailModalRoom && (
        <div 
          className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setDetailModalRoom(null)}
        >
          <div 
            className="bg-white dark:bg-stone-900 rounded-2xl max-w-2xl w-full max-h-[85vh] border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden flex flex-col relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between gap-3 shrink-0">
              <div className="min-w-0">
                <span className="text-xs font-semibold uppercase tracking-widest text-amber-700 dark:text-amber-400">
                  Room Specification
                </span>
                <h3 className="text-lg sm:text-xl font-serif font-bold text-stone-900 dark:text-stone-50 truncate">
                  {detailModalRoom.name}
                </h3>
              </div>
              <ModalDismissButton onClose={() => setDetailModalRoom(null)} ariaLabel="Close Room Details" />
            </div>

            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
              <div className="relative aspect-[16/9] rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-800">
                <img
                  src={detailModalRoom.images[activeImageIndex] || detailModalRoom.images[0]}
                  alt={detailModalRoom.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-3 right-3 bg-stone-900/80 backdrop-blur text-white text-xs px-2.5 py-1 rounded font-mono">
                  {activeImageIndex + 1} of {detailModalRoom.images.length}
                </div>
              </div>

              {detailModalRoom.images.length > 1 && (
                <div className="flex items-center gap-3 overflow-x-auto pb-1">
                  {detailModalRoom.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`relative w-20 h-14 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                        activeImageIndex === idx
                          ? 'border-amber-600 scale-105'
                          : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt="Thumbnail" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 border-y border-stone-100 dark:border-stone-800 text-xs">
                <div>
                  <div className="text-stone-400">Bedding</div>
                  <div className="font-semibold text-stone-900 dark:text-stone-100 mt-0.5">{detailModalRoom.bedType}</div>
                </div>
                <div>
                  <div className="text-stone-400">Room Area</div>
                  <div className="font-semibold text-stone-900 dark:text-stone-100 mt-0.5">{detailModalRoom.sizeSqFt} sq.ft</div>
                </div>
                <div>
                  <div className="text-stone-400">Outlook</div>
                  <div className="font-semibold text-stone-900 dark:text-stone-100 mt-0.5">{detailModalRoom.view}</div>
                </div>
                <div>
                  <div className="text-stone-400">Location</div>
                  <div className="font-semibold text-stone-900 dark:text-stone-100 mt-0.5">{detailModalRoom.floor}</div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-500">About this Accommodation</h4>
                <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                  {detailModalRoom.description}
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-500">Included Amenities</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-stone-700 dark:text-stone-300">
                  {detailModalRoom.amenities.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between gap-4 border-t border-stone-200 dark:border-stone-800">
                <div>
                  <span className="text-2xl font-bold font-serif text-stone-900 dark:text-stone-100 tabular-nums">
                    {formatCurrency(getEffectivePriceInCurrentCurrency(detailModalRoom.pricePerNightUSD), currentCurrency)}
                  </span>
                  <span className="text-xs text-stone-500"> / night</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setDetailModalRoom(null)}
                    className="px-4 py-2 text-xs font-medium rounded border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      const roomToBook = detailModalRoom;
                      setDetailModalRoom(null);
                      openBookingModal(roomToBook);
                    }}
                    className={`px-5 py-2 text-xs font-semibold uppercase tracking-wider rounded ${themeClasses.primary}`}
                  >
                    Proceed to Reservation
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

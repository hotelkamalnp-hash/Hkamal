import React, { useMemo, useState } from 'react';
import { useHotel } from '../../context/HotelContext';
import { Room } from '../../types/hotel';
import { convertPrice, formatCurrency, getThemeClasses } from '../../utils/theme';
import floorPlanImg from '../../assets/images/hotel_floor_plan_1794655577850.jpg';
import {
  Bed,
  Check,
  Maximize2,
  Users,
  ArrowRight,
  Compass,
  Sparkles,
  Layers,
  MapPin,
} from 'lucide-react';

interface FloorWingHotspot {
  id: string;
  wingLabel: string;
  shortTitle: string;
  roomType: Room['type'];
  floorLevel: string;
  unitNumbers: string[];
  xPercent: number;
  yPercent: number;
  highlights: string[];
}

const FLOOR_WING_HOTSPOTS: FloorWingHotspot[] = [
  {
    id: 'wing-executive',
    wingLabel: 'West Terrace Wing',
    shortTitle: 'Executive Suites',
    roomType: 'executive-suite',
    floorLevel: '3rd & 4th Suite Level',
    unitNumbers: ['302', '401'],
    xPercent: 20,
    yPercent: 48,
    highlights: ['Private Sun Terrace', 'Separate Living Parlor', 'Himalayan Panorama'],
  },
  {
    id: 'wing-super-deluxe',
    wingLabel: 'North Garden Wing',
    shortTitle: 'Super Deluxe Family',
    roomType: 'super-deluxe',
    floorLevel: '2nd Floor',
    unitNumbers: ['205'],
    xPercent: 47,
    yPercent: 28,
    highlights: ['Private Dual Balcony', 'Queen + Twin Setup', 'Family Lounge Space'],
  },
  {
    id: 'wing-deluxe',
    wingLabel: 'North-East Sunrise Wing',
    shortTitle: 'Deluxe Mountain View',
    roomType: 'deluxe',
    floorLevel: '2nd & 3rd Floor',
    unitNumbers: ['201', '301'],
    xPercent: 79,
    yPercent: 29,
    highlights: ['Carved Nepali Woodwork', 'Work Desk & Wardrobe', 'Soundproof Glazing'],
  },
  {
    id: 'wing-standard',
    wingLabel: 'South Courtyard Wing',
    shortTitle: 'Cozy Standard Retreat',
    roomType: 'standard-cozy',
    floorLevel: 'Ground & 1st Floor',
    unitNumbers: ['101', '102', '104'],
    xPercent: 79,
    yPercent: 66,
    highlights: ['Quiet Courtyard Patio', 'Steps to Reception', 'Solar Rain Shower'],
  },
];

interface InteractiveFloorPlanSelectorProps {
  onSelectRoomForBooking?: (room: Room) => void;
  compactHeader?: boolean;
}

export const InteractiveFloorPlanSelector: React.FC<InteractiveFloorPlanSelectorProps> = ({
  onSelectRoomForBooking,
  compactHeader = false,
}) => {
  const { rooms, roomUnits, currentCurrency, themeConfig, openBookingModal } = useHotel();
  const themeClasses = getThemeClasses(themeConfig.palette);
  const [selectedWingId, setSelectedWingId] = useState<string>(FLOOR_WING_HOTSPOTS[0].id);

  const selectedHotspot = useMemo(
    () => FLOOR_WING_HOTSPOTS.find((w) => w.id === selectedWingId) || FLOOR_WING_HOTSPOTS[0],
    [selectedWingId]
  );

  const selectedRoom: Room | undefined = useMemo(
    () => rooms.find((r) => r.type === selectedHotspot.roomType) || rooms[0],
    [rooms, selectedHotspot]
  );

  const matchingUnits = useMemo(
    () => roomUnits.filter((u) => u.roomType === selectedHotspot.roomType),
    [roomUnits, selectedHotspot]
  );

  const effectivePrice = useMemo(() => {
    if (!selectedRoom) return 0;
    const surge = themeConfig.seasonalSurgeMultiplier || 1.0;
    return convertPrice(selectedRoom.pricePerNightUSD * surge, currentCurrency, themeConfig.exchangeRates);
  }, [selectedRoom, themeConfig.seasonalSurgeMultiplier, currentCurrency, themeConfig.exchangeRates]);

  const handleBookSelectedRoom = () => {
    if (!selectedRoom) return;
    if (onSelectRoomForBooking) {
      onSelectRoomForBooking(selectedRoom);
    } else {
      openBookingModal(selectedRoom);
    }
  };

  return (
    <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden">
      {!compactHeader && (
        <div className="p-5 border-b border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50/70 dark:bg-stone-900">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider font-bold text-amber-700 dark:text-amber-400">
              <Compass className="w-3.5 h-3.5" />
              <span>Interactive Architectural Layout</span>
            </div>
            <h3 className="text-lg sm:text-xl font-serif font-bold text-stone-900 dark:text-stone-50 mt-0.5">
              Kamal Hotel 2D Floor Plan &amp; Wing Room Selector
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Tap any wing on our architectural 2D floor plan to inspect suites, live availability, and reserve your preferred room category.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-mono bg-white dark:bg-stone-800 px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 shrink-0">
            <Layers className="w-3.5 h-3.5 text-amber-600" />
            <span>Kamalpokhari Courtyard Layout</span>
          </div>
        </div>
      )}

      {/* Wing Quick Selector Strip */}
      <div className="px-4 py-3 border-b border-stone-200 dark:border-stone-800 flex flex-wrap items-center gap-2 bg-white dark:bg-stone-900">
        {FLOOR_WING_HOTSPOTS.map((wing) => {
          const roomObj = rooms.find((r) => r.type === wing.roomType);
          const isSelected = wing.id === selectedWingId;
          return (
            <button
              key={wing.id}
              type="button"
              onClick={() => setSelectedWingId(wing.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                isSelected
                  ? 'bg-amber-700 text-white shadow-sm'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-amber-50 dark:hover:bg-stone-700'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span>{wing.shortTitle}</span>
              {roomObj && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    isSelected
                      ? 'bg-amber-900/50 text-amber-100'
                      : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400'
                  }`}
                >
                  {roomObj.availableUnits} free
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Floor Plan Interactive Canvas + Room Detail Side Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12">
        {/* Stylized 2D Floor Plan with Interactive Wing Pins */}
        <div className="lg:col-span-8 p-4 bg-stone-100/80 dark:bg-stone-950/60 flex items-center justify-center">
          <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden border border-stone-300 dark:border-stone-700 shadow-md bg-[#f5efe6]">
            <img
              src={floorPlanImg}
              alt="Kamal Hotel stylized 2D architectural floor plan showing Executive Suites, Super Deluxe Veranda Rooms, Deluxe Mountain View Rooms, Cozy Standard Rooms, and Courtyard Promenade"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />

            {/* Subtle Interactive Wing Hotspots */}
            {FLOOR_WING_HOTSPOTS.map((wing) => {
              const roomObj = rooms.find((r) => r.type === wing.roomType);
              const isSelected = wing.id === selectedWingId;
              return (
                <button
                  key={wing.id}
                  type="button"
                  onClick={() => setSelectedWingId(wing.id)}
                  style={{ left: `${wing.xPercent}%`, top: `${wing.yPercent}%` }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 shadow-lg transition-all cursor-pointer border whitespace-nowrap ${
                    isSelected
                      ? 'bg-amber-700 text-white border-amber-200 scale-110 z-20 ring-4 ring-amber-500/35'
                      : 'bg-stone-900/85 hover:bg-stone-900 text-stone-50 border-white/50 hover:scale-105 z-10'
                  }`}
                  aria-label={`Select ${wing.shortTitle} on floor plan`}
                >
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      (roomObj?.availableUnits ?? 0) > 0 ? 'bg-emerald-400' : 'bg-rose-400'
                    }`}
                  />
                  <span>{wing.shortTitle}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Room Wing Panel */}
        <div className="lg:col-span-4 p-5 border-t lg:border-t-0 lg:border-l border-stone-200 dark:border-stone-800 flex flex-col justify-between space-y-4 bg-white dark:bg-stone-900">
          {selectedRoom ? (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-amber-700 dark:text-amber-400">
                    {selectedHotspot.wingLabel}
                  </span>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                      selectedRoom.availableUnits > 0
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                    }`}
                  >
                    {selectedRoom.availableUnits} / {selectedRoom.totalUnits} Open
                  </span>
                </div>

                <h4 className="font-serif font-bold text-lg text-stone-900 dark:text-stone-50 leading-snug">
                  {selectedRoom.name}
                </h4>

                <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                  {selectedRoom.description}
                </p>

                <div className="grid grid-cols-2 gap-2 py-2.5 border-y border-stone-100 dark:border-stone-800 text-[11px] text-stone-600 dark:text-stone-300">
                  <div className="flex items-center gap-1.5">
                    <Bed className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="truncate">{selectedRoom.bedType}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Maximize2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>{selectedRoom.sizeSqFt} sq.ft</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Up to {selectedRoom.maxGuests} Guests</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="truncate">{selectedHotspot.floorLevel}</span>
                  </div>
                </div>

                {/* Architectural Wing Highlights */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-stone-400 font-semibold">
                    Wing Architectural Features
                  </div>
                  <div className="space-y-1 text-xs text-stone-700 dark:text-stone-300">
                    {selectedHotspot.highlights.map((h) => (
                      <div key={h} className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Live Room Unit Badges from PMS */}
                {matchingUnits.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-stone-400 font-semibold">
                      Live Units in This Wing
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {matchingUnits.map((unit) => (
                        <span
                          key={unit.id}
                          className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                            unit.occupancyStatus === 'vacant'
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                              : 'bg-stone-100 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400'
                          }`}
                        >
                          Rm {unit.roomNumber} · {unit.occupancyStatus}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Rate + Primary CTA */}
              <div className="pt-3 border-t border-stone-200 dark:border-stone-800 space-y-3">
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-2xl font-sans font-semibold tracking-tight text-stone-900 dark:text-stone-50 tabular-nums">
                      {formatCurrency(effectivePrice, currentCurrency)}
                    </span>
                    <span className="text-xs text-stone-500"> / night</span>
                  </div>
                  <span className="text-[10px] font-mono text-stone-400">
                    +{themeConfig.taxRatePercent}% VAT &amp; Service
                  </span>
                </div>

                <button
                  type="button"
                  disabled={selectedRoom.availableUnits <= 0}
                  onClick={handleBookSelectedRoom}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition shadow cursor-pointer ${
                    selectedRoom.availableUnits > 0
                      ? themeClasses.primary
                      : 'bg-stone-300 dark:bg-stone-800 text-stone-500 cursor-not-allowed'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {selectedRoom.availableUnits > 0 ? 'Select & Book This Room' : 'Currently Full'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          ) : (
            <div className="text-xs text-stone-500 py-8 text-center">
              Select a wing on the 2D floor plan to inspect room specifications.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

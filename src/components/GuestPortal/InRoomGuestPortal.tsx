import React, { useState } from 'react';
import { useHotel } from '../../context/HotelContext';
import { formatCurrency, convertPrice, getThemeClasses } from '../../utils/theme';
import { 
  Key, 
  DoorClosed, 
  Utensils, 
  PhoneCall, 
  MessageSquare, 
  ShoppingBag, 
  CheckCircle2, 
  Clock, 
  Send, 
  Sparkles, 
  LogOut, 
  AlertCircle,
  Mic,
  MicOff,
  PhoneOff,
  QrCode,
  Lock,
  Award,
  AlarmClock,
  ConciergeBell,
  Compass,
  Map as MapIcon
} from 'lucide-react';
import kamalLogo from '../../assets/images/kamal_hotel_logo_1794545954396.jpg';
import { DigitalKeycardDoorReader } from './DigitalKeycardDoorReader';
import { KamalRewardsPortalView } from './KamalRewardsPortalView';
import { WakeUpCallSchedulerView } from './WakeUpCallSchedulerView';
import { RoomServiceAmenityView } from './RoomServiceAmenityView';
import { DigitalRestaurantMenu } from './DigitalRestaurantMenu';
import { LocalEventsKathmanduWidget } from './LocalEventsKathmanduWidget';
import { InteractiveFloorPlanSelector } from './InteractiveFloorPlanSelector';

export const InRoomGuestPortal: React.FC = () => {
  const { 
    activeGuestSession, 
    loginGuestByRoom, 
    logoutGuestSession,
    restaurantOrders,
    guestChatMessages,
    sendGuestServiceMessage,
    isVoipCallActive,
    activeVoipTarget,
    startVoipCall,
    endVoipCall,
    themeConfig,
    currentCurrency,
    invoices,
    bookings,
    getGuestLoyaltyAccount,
    wakeUpCalls,
    roomServiceRequests
  } = useHotel();

  const themeClasses = getThemeClasses(themeConfig.palette);

  // Login form state
  const [inputRoom, setInputRoom] = useState('Room 302');
  const [inputPasscode, setInputPasscode] = useState('4829');
  const [loginError, setLoginError] = useState('');

  // Active in-portal tab
  const [activeTab, setActiveTab] = useState<'dining' | 'floor_plan' | 'local_guide' | 'room_service' | 'intercom' | 'orders' | 'bill' | 'door_lock' | 'rewards' | 'wake_up'>('dining');
  const [showPreLoginReader, setShowPreLoginReader] = useState<boolean>(false);
  const [showPreLoginFloorPlan, setShowPreLoginFloorPlan] = useState<boolean>(false);

  // Chat message input
  const [chatInput, setChatInput] = useState('');
  const [selectedServiceTag, setSelectedServiceTag] = useState<'room_service' | 'housekeeping' | 'concierge' | 'front_desk'>('concierge');

  // Handle guest login
  const handleGuestLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoginError('');
    const res = loginGuestByRoom(inputRoom, inputPasscode);
    if (!res.success) {
      setLoginError(res.message);
    }
  };

  // Auto-login from QR Code scan if room and pin query params exist
  React.useEffect(() => {
    if (typeof window !== 'undefined' && !activeGuestSession) {
      const urlParams = new URLSearchParams(window.location.search);
      const roomParam = urlParams.get('room');
      const pinParam = urlParams.get('pin');
      if (roomParam && pinParam) {
        setInputRoom(roomParam);
        setInputPasscode(pinParam);
        const res = loginGuestByRoom(roomParam, pinParam);
        if (!res.success) {
          setLoginError(res.message);
        }
      }
    }
  }, [activeGuestSession, loginGuestByRoom]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendGuestServiceMessage(chatInput.trim(), selectedServiceTag);
    setChatInput('');
  };

  const myOrders = restaurantOrders.filter(
    (o) => o.tableOrRoomNo.toLowerCase() === activeGuestSession?.roomNumber.toLowerCase()
  );

  const linkedGuestBooking = activeGuestSession
    ? bookings.find((b) => b.bookingCode.toLowerCase() === activeGuestSession.bookingCode.toLowerCase())
    : undefined;

  const guestLoyaltyAccount = activeGuestSession
    ? getGuestLoyaltyAccount(
        linkedGuestBooking?.guestEmail,
        activeGuestSession.guestName,
        activeGuestSession.bookingCode
      )
    : undefined;

  const guestPointsBalance = guestLoyaltyAccount?.pointsBalance ?? 0;
  const guestLoyaltyTier = guestLoyaltyAccount?.tier ?? 'Silver Explorer';

  const activeWakeUpCallsCount = activeGuestSession
    ? wakeUpCalls.filter(
        (w) =>
          (w.roomNumber.toLowerCase() === activeGuestSession.roomNumber.toLowerCase() ||
            w.bookingCode.toLowerCase() === activeGuestSession.bookingCode.toLowerCase()) &&
          (w.status === 'scheduled' || w.status === 'alerted' || w.status === 'acknowledged')
      ).length
    : 0;

  const activeRoomServiceCount = activeGuestSession
    ? roomServiceRequests.filter(
        (r) =>
          (r.roomNumber.toLowerCase() === activeGuestSession.roomNumber.toLowerCase() ||
            r.bookingCode.toLowerCase() === activeGuestSession.bookingCode.toLowerCase()) &&
          (r.status === 'pending' || r.status === 'acknowledged' || r.status === 'in_progress')
      ).length
    : 0;

  // If NOT logged in as a guest, display the login gate
  if (!activeGuestSession) {
    return (
      <div className="py-12 px-4 max-w-5xl mx-auto">
        <div className="max-w-md mx-auto bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 sm:p-8 shadow-xl text-xs space-y-5">
          <div className="text-center space-y-2.5">
            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-[#f8f6f0] border border-amber-700/25 shadow-sm mx-auto flex items-center justify-center">
              <img
                src={kamalLogo}
                alt={`${themeConfig.hotelName} Himalayan emblem`}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
              <Key className="w-3.5 h-3.5" />
              <span>{themeConfig.hotelName} · Room Keycard Login</span>
            </div>
            <h2 className="text-xl font-serif font-bold text-stone-900 dark:text-stone-50">
              In-Room Guest Digital Concierge
            </h2>
            <p className="text-stone-500 text-[11px] leading-relaxed">
              Log in with your assigned room number and the 4-digit stay passcode provided on your keycard envelope.
            </p>
          </div>

          {loginError && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300">
              {loginError}
            </div>
          )}

          <form onSubmit={handleGuestLogin} className="space-y-4">
            <div>
              <label className="block font-semibold mb-1">Room Number</label>
              <input
                type="text"
                placeholder="e.g. Room 302"
                value={inputRoom}
                onChange={(e) => setInputRoom(e.target.value)}
                required
                className="w-full p-2.5 rounded-lg bg-stone-50 dark:bg-stone-800 border font-mono text-stone-900 dark:text-stone-100"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">4-Digit Stay Passcode (PIN)</label>
              <input
                type="password"
                maxLength={4}
                placeholder="••••"
                value={inputPasscode}
                onChange={(e) => setInputPasscode(e.target.value)}
                required
                className="w-full p-2.5 rounded-lg bg-stone-50 dark:bg-stone-800 border font-mono text-center text-lg tracking-widest text-stone-900 dark:text-stone-100"
              />
              <span className="text-[10px] text-stone-400 block mt-1">
                Dynamic passcode changes with every guest check-in and resets on checkout.
              </span>
            </div>

            <button
              type="submit"
              className={`w-full py-3 rounded-lg font-semibold uppercase tracking-wider text-xs shadow-md transition-all ${themeClasses.primary}`}
            >
              Access My Room Services
            </button>
          </form>

          {/* Quick Demo Fill */}
          <div className="pt-2 border-t border-stone-200 dark:border-stone-800 text-center space-y-3">
            <div>
              <span className="text-[10px] text-stone-400 block uppercase font-mono mb-2">Quick Test Check-Ins:</span>
              <div className="flex justify-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setInputRoom('Room 302');
                    setInputPasscode('4829');
                  }}
                  className="px-2.5 py-1 rounded bg-stone-100 dark:bg-stone-800 text-[11px] hover:bg-amber-100 font-mono text-amber-800 dark:text-amber-300"
                >
                  Room 302 (PIN 4829)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInputRoom('Room 205');
                    setInputPasscode('6312');
                  }}
                  className="px-2.5 py-1 rounded bg-stone-100 dark:bg-stone-800 text-[11px] hover:bg-amber-100 font-mono text-amber-800 dark:text-amber-300"
                >
                  Room 205 (PIN 6312)
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowPreLoginReader((prev) => !prev)}
              className="w-full py-2 px-3 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5 text-amber-600" />
              <span>{showPreLoginReader ? 'Hide Smart Door Lock QR Reader' : `Open Smart Door Lock Reader (${inputRoom || 'Room 302'})`}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowPreLoginFloorPlan((prev) => !prev)}
              className="w-full py-2 px-3 rounded-lg border border-amber-300 dark:border-amber-700/70 bg-amber-50/70 dark:bg-amber-950/30 hover:bg-amber-100/80 dark:hover:bg-amber-900/40 text-amber-900 dark:text-amber-200 font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <MapIcon className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
              <span>{showPreLoginFloorPlan ? 'Hide 2D Floor Plan Room Selector' : 'Browse 2D Floor Plan & Select Room'}</span>
            </button>
          </div>
        </div>

        {showPreLoginFloorPlan && (
          <div className="mt-6 max-w-5xl mx-auto">
            <InteractiveFloorPlanSelector />
          </div>
        )}

        {showPreLoginReader && (
          <div className="mt-6 max-w-5xl mx-auto">
            <DigitalKeycardDoorReader roomNumber={inputRoom || 'Room 302'} />
          </div>
        )}
      </div>
    );
  }

  // LOGGED-IN IN-HOUSE GUEST INTERFACE
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 w-full overflow-x-hidden">
      
      {/* Active Guest Banner */}
      <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-700 text-white flex items-center justify-center font-bold">
            <DoorClosed className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-serif font-bold text-stone-900 dark:text-stone-50">
                {activeGuestSession.roomNumber} · {activeGuestSession.guestName}
              </h2>
              <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-mono text-[10px] font-bold">
                PASSCODE: {activeGuestSession.passcode}
              </span>
            </div>
            <p className="text-xs text-stone-500 font-mono">
              Reservation: {activeGuestSession.bookingCode} · Checkout: {activeGuestSession.checkOutDate} at 12:00 PM
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('rewards')}
            className="px-3.5 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700/70 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            title="View Kamal Rewards Balance & Redeem Perks"
          >
            <Award className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span className="tabular-nums">
              Kamal Rewards: {guestPointsBalance.toLocaleString()} pts
            </span>
            <span className="text-[10px] font-mono text-amber-700 dark:text-amber-400">
              · {guestLoyaltyTier}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('door_lock')}
            className="px-3.5 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow whitespace-nowrap shrink-0 cursor-pointer"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Unlock Room Door (QR)</span>
          </button>

          <button
            onClick={() => startVoipCall('Reception Desk')}
            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow whitespace-nowrap shrink-0 cursor-pointer"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>VoIP Intercom to Reception</span>
          </button>

          <button
            onClick={logoutGuestSession}
            className="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-semibold flex items-center gap-1 text-stone-600 dark:text-stone-300 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Exit Portal</span>
          </button>
        </div>
      </div>

      {/* VoIP Call Bar (If connected) */}
      {isVoipCallActive && (
        <div className="p-4 rounded-xl bg-emerald-900 text-emerald-100 border border-emerald-700 shadow-lg flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-emerald-800">
              <PhoneCall className="w-5 h-5 text-emerald-200 animate-bounce" />
            </div>
            <div>
              <div className="font-bold text-sm">VoIP Intercom Call Live with {activeVoipTarget}</div>
              <div className="text-[11px] text-emerald-300 font-mono">
                Kamal Hotel In-House High-Definition Audio Link (Zero Call Charges)
              </div>
            </div>
          </div>

          <button
            onClick={endVoipCall}
            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5"
          >
            <PhoneOff className="w-4 h-4" />
            <span>End Call</span>
          </button>
        </div>
      )}

      {/* Live Kathmandu Weather & Cultural Events Preview Strip */}
      {activeTab !== 'local_guide' && (
        <LocalEventsKathmanduWidget
          compact
          onExpandFull={() => setActiveTab('local_guide')}
        />
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-stone-200 dark:border-stone-800 pb-2 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('door_lock')}
          className={`px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'door_lock' ? 'bg-amber-800 text-white' : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Smart Door Lock (QR)</span>
        </button>

        <button
          onClick={() => setActiveTab('dining')}
          className={`px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'dining' ? 'bg-amber-800 text-white' : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
          }`}
        >
          <Utensils className="w-4 h-4" />
          <span>Digital Restaurant Menu</span>
        </button>

        <button
          onClick={() => setActiveTab('floor_plan')}
          className={`px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'floor_plan' ? 'bg-amber-800 text-white' : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
          }`}
        >
          <MapIcon className="w-4 h-4" />
          <span>2D Floor Plan &amp; Rooms</span>
        </button>

        <button
          onClick={() => setActiveTab('local_guide')}
          className={`px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'local_guide' ? 'bg-amber-800 text-white' : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>Local Events &amp; Attractions</span>
        </button>

        <button
          onClick={() => setActiveTab('room_service')}
          className={`px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'room_service' ? 'bg-amber-800 text-white' : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
          }`}
        >
          <ConciergeBell className="w-4 h-4" />
          <span className="tabular-nums">
            Room Service{activeRoomServiceCount > 0 ? ` (${activeRoomServiceCount})` : ''}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'orders' ? 'bg-amber-800 text-white' : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>My Orders ({myOrders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('bill')}
          className={`px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'bill' ? 'bg-amber-800 text-white' : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Live Room Bill & Folio</span>
        </button>

        <button
          onClick={() => setActiveTab('intercom')}
          className={`px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'intercom' ? 'bg-amber-800 text-white' : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Direct Reception & Waiter Chat</span>
        </button>

        <button
          onClick={() => setActiveTab('rewards')}
          className={`px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'rewards' ? 'bg-amber-800 text-white' : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
          }`}
        >
          <Award className="w-4 h-4" />
          <span className="tabular-nums">Kamal Rewards ({guestPointsBalance.toLocaleString()} pts)</span>
        </button>

        <button
          onClick={() => setActiveTab('wake_up')}
          className={`px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'wake_up' ? 'bg-amber-800 text-white' : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
          }`}
        >
          <AlarmClock className="w-4 h-4" />
          <span className="tabular-nums">
            Wake-up Call{activeWakeUpCallsCount > 0 ? ` (${activeWakeUpCallsCount})` : ''}
          </span>
        </button>
      </div>

      {/* ===================== TAB 0: SMART DOOR LOCK READER ===================== */}
      {activeTab === 'door_lock' && (
        <DigitalKeycardDoorReader roomNumber={activeGuestSession.roomNumber} />
      )}

      {/* ===================== TAB 1: DIGITAL RESTAURANT MENU ===================== */}
      {activeTab === 'dining' && (
        <DigitalRestaurantMenu onViewOrders={() => setActiveTab('orders')} />
      )}

      {/* ===================== TAB 1A: 2D FLOOR PLAN ROOM SELECTOR ===================== */}
      {activeTab === 'floor_plan' && (
        <InteractiveFloorPlanSelector />
      )}

      {/* ===================== TAB 1B: LOCAL EVENTS & ATTRACTIONS (KATHMANDU) ===================== */}
      {activeTab === 'local_guide' && (
        <LocalEventsKathmanduWidget />
      )}

      {/* ===================== TAB 2: MY ORDERS ===================== */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myOrders.length === 0 ? (
              <div className="col-span-full p-12 text-center text-xs text-stone-400 bg-white dark:bg-stone-900 rounded-xl border border-dashed border-stone-300 dark:border-stone-800">
                You have not placed any room dining orders yet.
              </div>
            ) : (
              myOrders.map((ord) => (
                <div key={ord.id} className="p-5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm space-y-3 text-xs">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono font-bold text-amber-700 dark:text-amber-400">Order #{ord.orderNumber}</span>
                      <div className="text-sm font-serif font-bold text-stone-900 dark:text-stone-100">
                        {ord.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                      ord.status === 'delivered'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}>
                      {ord.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="text-[11px] text-stone-500 font-mono flex justify-between pt-2 border-t">
                    <span>Total: {formatCurrency(convertPrice(ord.totalAmountUSD, currentCurrency), currentCurrency)}</span>
                    <span>Placed at: {new Date(ord.createdAt).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ===================== TAB 3: DIRECT INTERCOM CHAT ===================== */}
      {activeTab === 'intercom' && (
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 shadow-sm space-y-4 max-w-2xl mx-auto">
          <div className="flex items-center justify-between border-b pb-3 border-stone-100 dark:border-stone-800">
            <div>
              <h4 className="font-serif font-bold text-sm text-stone-900 dark:text-stone-100">
                Front Desk & Service Intercom
              </h4>
              <p className="text-[11px] text-stone-500 font-mono">
                Direct two-way channel with Receptionist Bikash & Waiter Staff
              </p>
            </div>

            <div className="flex items-center gap-1">
              {(['concierge', 'room_service', 'housekeeping', 'front_desk'] as const).map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedServiceTag(tag)}
                  className={`px-2 py-1 rounded text-[10px] font-mono capitalize transition-colors ${
                    selectedServiceTag === tag
                      ? 'bg-amber-700 text-white font-bold'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
                  }`}
                >
                  {tag.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Messages list */}
          <div className="space-y-3 h-80 overflow-y-auto p-2 bg-stone-50 dark:bg-stone-800/40 rounded-xl">
            {guestChatMessages.map((msg) => {
              const isGuest = msg.sender === 'guest';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isGuest ? 'items-end' : 'items-start'} text-xs`}
                >
                  <div className="flex items-center gap-1.5 text-[10px] text-stone-400 mb-0.5">
                    <span className="font-semibold">{msg.guestName || (isGuest ? 'You' : 'Staff')}</span>
                    <span>·</span>
                    <span>{msg.time}</span>
                  </div>
                  <div
                    className={`p-3 rounded-2xl max-w-sm text-xs leading-relaxed shadow-sm ${
                      isGuest
                        ? 'bg-slate-900 text-white rounded-tr-none border border-slate-800 font-normal'
                        : 'bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-tl-none font-medium'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Message input */}
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              placeholder={`Message receptionist about ${selectedServiceTag.replace('_', ' ')}...`}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-1 p-2.5 rounded-lg bg-stone-50 dark:bg-stone-800 border text-xs"
            />
            <button
              type="submit"
              className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-1 shadow ${themeClasses.primary}`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </form>
        </div>
      )}

      {/* ===================== TAB 4: LIVE ROOM BILL & ONGOING FOLIO ===================== */}
      {activeTab === 'bill' && (() => {
        // Find matching invoice for this room or guest
        const matchedInv = invoices.find(
          (inv) => inv.roomNumber.toLowerCase() === activeGuestSession.roomNumber.toLowerCase() ||
                   inv.bookingCode === activeGuestSession.bookingCode
        );

        // Calculate live ongoing orders total
        const diningTotalUSD = myOrders.reduce((acc, o) => acc + o.totalAmountUSD, 0);

        return (
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm space-y-6 max-w-3xl mx-auto text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
              <div>
                <span className="font-mono font-bold uppercase text-amber-700 dark:text-amber-400">
                  Live Guest Statement & Folio
                </span>
                <h3 className="text-xl font-serif font-bold text-stone-900 dark:text-stone-50">
                  {activeGuestSession.roomNumber} · {activeGuestSession.guestName}
                </h3>
                <p className="text-stone-500 text-[11px] font-mono">
                  Stay Dates: {activeGuestSession.checkInDate} &rarr; {activeGuestSession.checkOutDate} · PIN: {activeGuestSession.passcode}
                </p>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-stone-400 uppercase font-mono block">Current Balance Due</span>
                <span className="text-2xl font-serif font-bold text-amber-900 dark:text-amber-300">
                  {matchedInv 
                    ? formatCurrency(convertPrice(matchedInv.balanceDueUSD + diningTotalUSD, currentCurrency), currentCurrency)
                    : formatCurrency(convertPrice(diningTotalUSD || 43.5, currentCurrency), currentCurrency)
                  }
                </span>
              </div>
            </div>

            {/* Services Taken Breakdown */}
            <div className="space-y-3">
              <h4 className="font-serif font-bold text-sm text-stone-900 dark:text-stone-100">
                Services & Charges Consumed During Stay
              </h4>

              <div className="divide-y divide-stone-100 dark:divide-stone-800 rounded-xl border border-stone-200 dark:border-stone-800 overflow-hidden bg-stone-50/50 dark:bg-stone-800/30">
                {/* Room Stay charge */}
                <div className="p-3.5 flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-stone-900 dark:text-stone-100">
                      Room Accommodation Stay ({activeGuestSession.roomNumber})
                    </div>
                    <div className="text-[11px] text-stone-400 font-mono">
                      Ref: {activeGuestSession.bookingCode} · Includes solar hot water & high-speed optical Wi-Fi
                    </div>
                  </div>
                  <div className="font-mono font-bold text-stone-800 dark:text-stone-200">
                    {matchedInv 
                      ? formatCurrency(convertPrice(matchedInv.subtotalUSD, currentCurrency), currentCurrency)
                      : formatCurrency(convertPrice(110, currentCurrency), currentCurrency)
                    }
                  </div>
                </div>

                {/* Dining orders items */}
                {myOrders.map((ord) => (
                  <div key={ord.id} className="p-3.5 flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-stone-900 dark:text-stone-100">
                        Rooftop Kitchen Order #{ord.orderNumber}
                      </div>
                      <div className="text-[11px] text-stone-400 font-mono">
                        {ord.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')} · Status: {ord.status.replace(/_/g, ' ')}
                      </div>
                    </div>
                    <div className="font-mono font-bold text-stone-800 dark:text-stone-200">
                      {formatCurrency(convertPrice(ord.totalAmountUSD, currentCurrency), currentCurrency)}
                    </div>
                  </div>
                ))}

                {/* Standard tax and service charge summary */}
                <div className="p-3.5 bg-stone-100/60 dark:bg-stone-800/70 space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between text-stone-600 dark:text-stone-400">
                    <span>Taxable Base Subtotal:</span>
                    <span className="font-semibold text-stone-900 dark:text-stone-100 tabular-nums">
                      {formatCurrency(convertPrice(matchedInv?.subtotalUSD || 110, currentCurrency), currentCurrency)}
                    </span>
                  </div>
                  <div className="flex justify-between text-stone-600 dark:text-stone-400">
                    <span>10% Hotel Service Charge:</span>
                    <span className="font-semibold text-stone-900 dark:text-stone-100 tabular-nums">
                      {formatCurrency(convertPrice(matchedInv?.serviceChargeAmountUSD || 11, currentCurrency), currentCurrency)}
                    </span>
                  </div>
                  <div className="flex justify-between text-stone-600 dark:text-stone-400">
                    <span>13% Nepal VAT (IRD Nepal):</span>
                    <span className="font-semibold text-stone-900 dark:text-stone-100 tabular-nums">
                      {formatCurrency(convertPrice(matchedInv?.taxAmountUSD || 15.73, currentCurrency), currentCurrency)}
                    </span>
                  </div>
                  <div className="flex justify-between text-stone-900 dark:text-stone-100 font-bold pt-1 border-t border-stone-200 dark:border-stone-700">
                    <span>Total Grand Bill:</span>
                    <span className="tabular-nums">
                      {formatCurrency(convertPrice(matchedInv?.grandTotalUSD || 136.73, currentCurrency), currentCurrency)}
                    </span>
                  </div>
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Payments / Advance Credited:</span>
                    <span className="tabular-nums">
                      -{formatCurrency(convertPrice(matchedInv?.amountPaidUSD || 0, currentCurrency), currentCurrency)}
                    </span>
                  </div>
                  <div className="flex justify-between text-amber-800 dark:text-amber-400 font-bold text-sm pt-1 border-t border-stone-200 dark:border-stone-700">
                    <span>Current Balance Payable:</span>
                    <span className="tabular-nums">
                      {formatCurrency(convertPrice(matchedInv?.balanceDueUSD || 136.73, currentCurrency), currentCurrency)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Note on checkout */}
            <div className="p-4 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 space-y-1">
              <div className="font-bold">Checkout & Payment Information</div>
              <p className="text-[11px] leading-relaxed text-amber-800/90 dark:text-amber-300">
                You can settle your balance at the Front Desk counter using Card, eSewa QR, Khalti, Fonepay, or Cash upon checkout at 12:00 PM. All room dining and addon records will be automatically reconciled on your final printed tax invoice.
              </p>
            </div>
          </div>
        );
      })()}

      {/* ===================== TAB 5: KAMAL REWARDS LOYALTY PORTAL ===================== */}
      {activeTab === 'rewards' && (
        <KamalRewardsPortalView session={activeGuestSession} />
      )}

      {/* ===================== TAB 6: WAKE-UP CALL SCHEDULER ===================== */}
      {activeTab === 'wake_up' && (
        <WakeUpCallSchedulerView session={activeGuestSession} />
      )}

      {/* ===================== TAB 7: ROOM SERVICE AMENITIES ===================== */}
      {activeTab === 'room_service' && (
        <RoomServiceAmenityView />
      )}

    </div>
  );
};

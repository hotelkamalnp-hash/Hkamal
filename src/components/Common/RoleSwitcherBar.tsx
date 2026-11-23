import React, { useState, useEffect } from 'react';
import { useHotel } from '../../context/HotelContext';
import { StaffRole } from '../../types/hotel';
import { 
  User, 
  ConciergeBell, 
  UtensilsCrossed, 
  ChefHat, 
  Sparkles, 
  ShieldAlert, 
  Briefcase, 
  RotateCcw,
  KeyRound,
  Check,
  LogOut
} from 'lucide-react';

interface RoleSwitcherBarProps {
  currentView: 'guest' | 'dashboard' | 'in_room_guest';
  setCurrentView: (view: 'guest' | 'dashboard' | 'in_room_guest') => void;
}

export const RoleSwitcherBar: React.FC<RoleSwitcherBarProps> = ({
  currentView,
  setCurrentView,
}) => {
  if (!import.meta.env.DEV) {
    return null;
  }

  const { 
    activeRole, 
    activeUser, 
    fastSwitchRole, 
    openLoginModal, 
    logoutStaff,
    resetAllHotelDataToDefault,
  } = useHotel();

  const [pendingResetConfirm, setPendingResetConfirm] = useState(false);

  useEffect(() => {
    if (!pendingResetConfirm) return;
    const timer = setTimeout(() => setPendingResetConfirm(false), 5000);
    return () => clearTimeout(timer);
  }, [pendingResetConfirm]);

  const rolesConfig: {
    id: StaffRole | 'guest';
    label: string;
    description: string;
    icon: React.ReactNode;
    view: 'guest' | 'dashboard' | 'in_room_guest';
  }[] = [
    {
      id: 'guest',
      label: 'Guest / Traveler',
      description: 'Public Booking & In-Room Passkey',
      icon: <User className="w-3.5 h-3.5" />,
      view: 'guest',
    },
    {
      id: 'receptionist',
      label: 'Receptionist',
      description: 'Front Desk, Check-In, Tax Folios',
      icon: <ConciergeBell className="w-3.5 h-3.5" />,
      view: 'dashboard',
    },
    {
      id: 'waiter',
      label: 'Waiter POS',
      description: 'Tables, Dine-in & KOT Dispatch',
      icon: <UtensilsCrossed className="w-3.5 h-3.5" />,
      view: 'dashboard',
    },
    {
      id: 'chef',
      label: 'Head Chef (KDS)',
      description: 'Kitchen Display & 86 Item Stock',
      icon: <ChefHat className="w-3.5 h-3.5" />,
      view: 'dashboard',
    },
    {
      id: 'housekeeping',
      label: 'Housekeeping',
      description: 'Turnaround, Linen & Lost/Found',
      icon: <Sparkles className="w-3.5 h-3.5" />,
      view: 'dashboard',
    },
    {
      id: 'restaurant_owner',
      label: 'Restaurant Owner',
      description: 'Ground-Floor Dining POS, KDS & P&L',
      icon: <UtensilsCrossed className="w-3.5 h-3.5" />,
      view: 'dashboard',
    },
    {
      id: 'hotel_manager',
      label: 'Hotel Manager',
      description: 'Operations, Pricing & Reports',
      icon: <Briefcase className="w-3.5 h-3.5" />,
      view: 'dashboard',
    },
    {
      id: 'admin',
      label: 'Hotel Admin',
      description: 'CMS, Rates, Rooms & Bookings',
      icon: <ShieldAlert className="w-3.5 h-3.5" />,
      view: 'dashboard',
    },
    {
      id: 'super_admin',
      label: 'Super Admin',
      description: 'Credentials, RBAC & Balances',
      icon: <ShieldAlert className="w-3.5 h-3.5" />,
      view: 'dashboard',
    },
  ];

  const handleRoleSelect = (roleItem: typeof rolesConfig[0]) => {
    if (roleItem.id === 'guest') {
      fastSwitchRole('guest');
      setCurrentView('guest');
    } else {
      fastSwitchRole(roleItem.id);
      setCurrentView('dashboard');
    }
  };

  const handleResetConfirm = () => {
    if (!pendingResetConfirm) {
      setPendingResetConfirm(true);
      return;
    }
    setPendingResetConfirm(false);
    resetAllHotelDataToDefault();
    setCurrentView('guest');
  };

  return (
    <div className="bg-stone-900 text-stone-100 border-b border-stone-800 text-xs px-3 py-1.5 shadow-md">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2">
        {/* Active Role Indicator */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-semibold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            Role Simulator:
          </span>
          <span className="font-semibold text-stone-200">
            {activeRole === 'guest'
              ? 'Public Guest'
              : `${activeUser?.name || 'Authorized Staff'} (${activeRole.replace('_', ' ').toUpperCase()})`}
          </span>
          <span className="hidden lg:inline text-stone-500">·</span>
          <span className="hidden lg:inline text-stone-400 font-mono text-[11px]">
            {activeRole === 'guest' ? 'Direct Booking Engine' : activeUser?.department}
          </span>
        </div>

        {/* 1-Click Role Segmented Switcher */}
        <div className="flex items-center gap-1 overflow-x-auto max-w-full pb-1 md:pb-0 scrollbar-none">
          {rolesConfig.map((r) => {
            const isSelected =
              (r.id === 'guest' && currentView === 'guest') ||
              (activeRole === r.id && currentView === 'dashboard');

            return (
              <button
                key={r.id}
                type="button"
                onClick={() => handleRoleSelect(r)}
                title={r.description}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-all whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-amber-600 text-white shadow font-semibold'
                    : 'text-stone-300 hover:text-white hover:bg-stone-800'
                }`}
              >
                {r.icon}
                <span>{r.label}</span>
                {isSelected && <Check className="w-3 h-3 text-white ml-0.5" />}
              </button>
            );
          })}
        </div>

        {/* Fast Action Tools */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => openLoginModal()}
            className="flex items-center gap-1 px-2 py-1 rounded text-[11px] bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition cursor-pointer"
            title="Log in with authentic username & password"
          >
            <KeyRound className="w-3 h-3 text-amber-400" />
            <span className="hidden sm:inline">Login PIN</span>
          </button>

          <button
            type="button"
            onClick={handleResetConfirm}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] transition cursor-pointer ${
              pendingResetConfirm
                ? 'bg-red-700 text-white font-semibold'
                : 'bg-stone-800 hover:bg-red-950/80 hover:text-red-300 text-stone-400'
            }`}
            title="Reset simulated orders, folios, and room turnaround to initial demo fixtures"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">{pendingResetConfirm ? 'Confirm Reset?' : 'Reset Demo'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              logoutStaff();
              setCurrentView('guest');
            }}
            className="flex items-center gap-1 px-2 py-1 rounded text-[11px] bg-rose-950/70 hover:bg-rose-900 border border-rose-800 text-rose-200 transition cursor-pointer font-medium"
            title="Log out and return to public guest website"
          >
            <LogOut className="w-3 h-3 text-rose-400" />
            <span>Lock & Exit</span>
          </button>
        </div>
      </div>
    </div>
  );
};

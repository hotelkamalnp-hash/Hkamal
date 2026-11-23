import React, { useState } from 'react';
import { useHotel } from '../context/HotelContext';
import { getThemeClasses } from '../utils/theme';
import { StaffRole, CurrencyCode } from '../types/hotel';
import { 
  Sun, 
  Moon, 
  UserCheck, 
  ChevronDown, 
  Building2, 
  Menu, 
  X,
  ShieldCheck,
  Briefcase,
  Users,
  Utensils,
  LogIn,
  LogOut,
  Key
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { NotificationBell } from './Common/NotificationBell';
import kamalLogo from '../assets/images/kamal_hotel_logo_1794545954396.jpg';

interface HeaderProps {
  currentView: 'guest' | 'dashboard' | 'in_room_guest';
  setCurrentView: (view: 'guest' | 'dashboard' | 'in_room_guest') => void;
}

export const Header: React.FC<HeaderProps> = ({ currentView, setCurrentView }) => {
  const { 
    themeConfig, 
    activeRole, 
    activeUser,
    setActiveRole, 
    darkMode, 
    setDarkMode, 
    currentCurrency,
    setCurrentCurrency,
    openBookingModal,
    isStaffLoggedIn,
    openLoginModal,
    logoutStaff,
    fastSwitchRole,
    showToast
  } = useHotel();

  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const themeClasses = getThemeClasses(themeConfig.palette);

  const roles: { role: StaffRole | 'guest'; label: string; icon: React.ReactNode; desc: string }[] = [
    { 
      role: 'guest', 
      label: 'Guest View', 
      icon: <Users className="w-4 h-4 text-stone-500" />,
      desc: 'Public website & real-time booking'
    },
    { 
      role: 'super_admin', 
      label: 'Super Admin', 
      icon: <ShieldCheck className="w-4 h-4 text-rose-600 dark:text-rose-400" />,
      desc: 'Platform Owner (all modules, health, staff balance)'
    },
    { 
      role: 'admin', 
      label: 'Hotel Admin', 
      icon: <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
      desc: 'Hotel Manager & Customizer (rates, rooms, CMS)'
    },
    { 
      role: 'hotel_manager', 
      label: 'Hotel Operations Manager', 
      icon: <Briefcase className="w-4 h-4 text-amber-700 dark:text-amber-500" />,
      desc: 'Daily operations, bookings & occupancy'
    },
    { 
      role: 'restaurant_owner', 
      label: 'Restaurant Owner', 
      icon: <Utensils className="w-4 h-4 text-orange-600 dark:text-orange-400" />,
      desc: 'Ground-floor dining POS, live KOTs & revenue'
    },
    { 
      role: 'receptionist', 
      label: 'Receptionist / Front Desk', 
      icon: <Building2 className="w-4 h-4 text-sky-600 dark:text-sky-400" />,
      desc: 'Room assignment, check-in/out & billing print'
    },
    { 
      role: 'chef', 
      label: 'Head Chef', 
      icon: <Utensils className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
      desc: 'Ground-floor kitchen & dining menu'
    },
    { 
      role: 'waiter', 
      label: 'Service Staff / Waiter', 
      icon: <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />,
      desc: 'Dining tables & room service orders'
    },
    { 
      role: 'housekeeping', 
      label: 'Housekeeping', 
      icon: <Building2 className="w-4 h-4 text-stone-600 dark:text-stone-400" />,
      desc: 'Room cleaning & inspection matrix'
    },
  ];

  const handleRoleSelect = (newRole: StaffRole | 'guest') => {
    setRoleDropdownOpen(false);
    fastSwitchRole(newRole);
    if (newRole === 'guest') {
      setCurrentView('guest');
    } else {
      setCurrentView('dashboard');
    }
  };

  const currencyOptions: { code: CurrencyCode; label: string; desc: string }[] = [
    { code: 'USD', label: '$ USD', desc: 'US Dollar' },
    { code: 'NPR', label: 'रू NPR', desc: 'Nepali Rupee' },
    { code: 'INR', label: '₹ INR', desc: 'Indian Rupee' }
  ];

  const currentCurrencyLabel = currencyOptions.find(c => c.code === currentCurrency)?.label || '$ USD';

  return (
    <>
      {/* Clean 3-Zone Editorial Header */}
      <header className="sticky top-0 z-40 w-full bg-[#FAF7F2]/92 dark:bg-[#0F0D0B]/92 backdrop-blur-md border-b border-[#E6DFD3]/90 dark:border-[#2A241E] transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
          
          {/* Zone 1: Clean Single-Line Wordmark */}
          <button
            type="button"
            onClick={() => setCurrentView('guest')}
            className="flex items-center gap-2.5 text-left group cursor-pointer focus-visible:outline-none shrink-0"
          >
            <img
              src={kamalLogo}
              alt={`${themeConfig.hotelName} emblem`}
              referrerPolicy="no-referrer"
              className="w-8 h-8 rounded-md object-cover border border-[#E6DFD3] dark:border-[#2E2720] shrink-0"
            />
            <span className="text-lg sm:text-xl font-serif font-semibold tracking-tight text-[#1A1714] dark:text-[#F4EFE6] group-hover:text-[#96682E] dark:group-hover:text-[#D4A76A] transition-colors whitespace-nowrap">
              {themeConfig.hotelName}
            </span>
          </button>

          {/* Zone 2: Minimalist Single-Line Nav Links */}
          <nav className="hidden lg:flex items-center gap-8 text-sm font-medium text-[#5E554C] dark:text-[#AFA699]">
            {currentView === 'guest' ? (
              <>
                <a href="#rooms" className="hover:text-[#1A1714] dark:hover:text-[#FAF7F2] underline-offset-4 hover:underline transition-colors whitespace-nowrap shrink-0">
                  Suites
                </a>
                <a href="#dining" className="hover:text-[#1A1714] dark:hover:text-[#FAF7F2] underline-offset-4 hover:underline transition-colors whitespace-nowrap shrink-0">
                  Dining
                </a>
                <a href="#amenities" className="hover:text-[#1A1714] dark:hover:text-[#FAF7F2] underline-offset-4 hover:underline transition-colors whitespace-nowrap shrink-0">
                  Amenities
                </a>
                <a href="#location" className="hover:text-[#1A1714] dark:hover:text-[#FAF7F2] underline-offset-4 hover:underline transition-colors whitespace-nowrap shrink-0">
                  Neighborhood
                </a>
              </>
            ) : (
              <div className="flex items-center gap-2 text-xs text-[#6B6258] dark:text-[#A69C8F]">
                <span className="text-[#1A1714] dark:text-[#F4EFE6] font-medium">Operations Portal</span>
                <span aria-hidden="true">/</span>
                <span className="capitalize">{activeRole.replace('_', ' ')}</span>
              </div>
            )}
          </nav>

          {/* Zone 3: Streamlined Utility & Primary Action */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Compact Currency Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setCurrencyDropdownOpen(!currencyDropdownOpen)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-900 transition-colors whitespace-nowrap cursor-pointer"
                title="Select Display Currency"
              >
                <span className="tabular-nums">{currentCurrency}</span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>

              {currencyDropdownOpen && (
                <div 
                  className="absolute right-0 mt-1.5 w-36 bg-white dark:bg-stone-900 rounded-lg shadow-xl border border-stone-200 dark:border-stone-800 py-1 z-50"
                  onClick={() => setCurrencyDropdownOpen(false)}
                >
                  {currencyOptions.map(({ code, label, desc }) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => {
                        setCurrentCurrency(code);
                        setCurrencyDropdownOpen(false);
                        showToast('Currency Switched', `Rates now displayed in ${label}`, 'info');
                      }}
                      className={`w-full px-3 py-1.5 text-left text-xs flex items-center justify-between hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors ${
                        currentCurrency === code 
                          ? 'font-semibold text-amber-800 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20' 
                          : 'text-stone-700 dark:text-stone-300'
                      }`}
                    >
                      <span>{label}</span>
                      <span className="text-[10px] text-stone-400">{desc}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* In-Room Guest Portal */}
            <button
              type="button"
              onClick={() => setCurrentView(currentView === 'in_room_guest' ? 'guest' : 'in_room_guest')}
              className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                currentView === 'in_room_guest'
                  ? 'bg-[#1A1714] text-[#FAF7F2] dark:bg-[#F4EFE6] dark:text-[#14110E]'
                  : 'text-[#5E554C] dark:text-[#C8BFB2] hover:bg-[#EFE8DC] dark:hover:bg-[#1E1A16]'
              }`}
              title="Guest In-Room Portal"
            >
              <Key className="w-3.5 h-3.5 opacity-75" />
              <span>In-Room</span>
            </button>

            {/* Operational Notification Bell for Staff */}
            {(isStaffLoggedIn || activeRole !== 'guest') && (
              <NotificationBell />
            )}

            {/* Staff Role Switcher or Staff Login */}
            {isStaffLoggedIn && activeUser ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-[#E6DFD3] dark:border-[#2E2720] bg-[#FFFFFF] dark:bg-[#171411] text-[#1A1714] dark:text-[#F4EFE6] hover:bg-[#F3EDE2] dark:hover:bg-[#1E1A16] transition-colors cursor-pointer whitespace-nowrap"
                  aria-label="Staff Profile"
                >
                  <UserCheck className="w-3.5 h-3.5 text-[#96682E] dark:text-[#C69553]" />
                  <span className="hidden sm:inline max-w-[80px] truncate">
                    {activeUser.name.split(' ')[0]}
                  </span>
                  <ChevronDown className="w-3 h-3 opacity-60" />
                </button>

                {roleDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-stone-900 rounded-lg shadow-xl border border-stone-200 dark:border-stone-800 py-1.5 z-50 text-left">
                    <div className="px-3 py-2 border-b border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/40">
                      <div className="font-semibold text-xs text-stone-900 dark:text-stone-100">{activeUser.name}</div>
                      <div className="text-[11px] text-stone-400 font-mono">{activeUser.email}</div>
                      <div className="text-[10px] text-amber-600 dark:text-amber-400 uppercase font-mono font-bold mt-0.5">
                        Role: {activeRole.replace('_', ' ')}
                      </div>
                    </div>

                    <div className="p-2 border-b border-stone-100 dark:border-stone-800">
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentView(currentView === 'guest' ? 'dashboard' : 'guest');
                          setRoleDropdownOpen(false);
                        }}
                        className="w-full py-1.5 px-2 rounded text-xs font-semibold bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700 transition"
                      >
                        {currentView === 'guest' ? 'Open Staff PMS Dashboard' : 'View Public Website'}
                      </button>
                    </div>

                    {import.meta.env.DEV ? (
                      <>
                        <div className="px-3 py-1 text-[10px] font-semibold text-stone-400 uppercase tracking-wider">
                          Dev Role Switcher
                        </div>

                        {roles.map((item) => (
                          <button
                            key={item.role}
                            type="button"
                            onClick={() => handleRoleSelect(item.role)}
                            className={`w-full px-3 py-1.5 text-left flex items-start gap-2 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors ${
                              activeRole === item.role ? 'bg-amber-50 dark:bg-stone-800/80 font-medium' : ''
                            }`}
                          >
                            <div className="mt-0.5">{item.icon}</div>
                            <div>
                              <div className="text-xs text-stone-900 dark:text-stone-100">{item.label}</div>
                              <div className="text-[10px] text-stone-500 dark:text-stone-400 leading-tight">{item.desc}</div>
                            </div>
                          </button>
                        ))}
                      </>
                    ) : (
                      <div className="p-2 border-b border-stone-100 dark:border-stone-800">
                        <button
                          type="button"
                          onClick={() => {
                            setRoleDropdownOpen(false);
                            openLoginModal();
                          }}
                          className="w-full py-1.5 px-2 rounded text-xs font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition text-left flex items-center gap-2"
                        >
                          <Key className="w-3.5 h-3.5 text-amber-600" />
                          <span>Switch Staff Account (Sign In)</span>
                        </button>
                      </div>
                    )}

                    <div className="pt-1.5 mt-1 border-t border-stone-100 dark:border-stone-800">
                      <button
                        type="button"
                        onClick={() => {
                          setRoleDropdownOpen(false);
                          logoutStaff();
                        }}
                        className="w-full px-3 py-1.5 text-left flex items-center gap-2 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-medium transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out ({activeUser.username})</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => openLoginModal()}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-900 transition-colors cursor-pointer whitespace-nowrap"
                title="Staff Sign In"
              >
                <LogIn className="w-3.5 h-3.5 opacity-75" />
                <span className="hidden sm:inline">Staff</span>
              </button>
            )}

            {/* 4. Dark Mode Toggle */}
            <button
              type="button"
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
              aria-label="Toggle theme"
              title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* 5. Primary Action Button */}
            {currentView === 'guest' ? (
              <button
                type="button"
                onClick={() => openBookingModal()}
                className={`px-4 py-2 text-xs font-semibold rounded-lg shadow-xs transition-all whitespace-nowrap cursor-pointer ${themeClasses.primary}`}
              >
                Reserve
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCurrentView('guest')}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-stone-900 text-white hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white transition-all shadow-xs whitespace-nowrap cursor-pointer"
              >
                Guest View
              </button>
            )}

            {/* 6. Mobile Menu Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-stone-50 dark:bg-stone-950 border-b border-stone-200 dark:border-stone-800 px-4 py-4 space-y-3">
            <nav className="flex flex-col space-y-2 text-sm font-medium text-stone-700 dark:text-stone-200">
              <a
                href="#rooms"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-amber-700"
              >
                Rooms & Suites
              </a>
              <a
                href="#dining"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-amber-700"
              >
                Ground-Floor Dining
              </a>
              <a
                href="#amenities"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-amber-700"
              >
                Amenities & Services
              </a>
              <a
                href="#location"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-amber-700"
              >
                Kamalpokhari Map & Directions
              </a>
            </nav>

            <div className="pt-3 border-t border-stone-200 dark:border-stone-800 flex flex-col gap-2">
              <PWAInstallButton
                className="w-full py-2.5 px-3 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-medium text-xs flex items-center justify-center gap-2 shadow"
                variant="full"
              />
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  openBookingModal();
                }}
                className={`w-full py-2.5 text-center text-xs font-semibold tracking-wide uppercase rounded-lg ${themeClasses.primary}`}
              >
                Book Your Stay
              </button>
              {isStaffLoggedIn && (
                <button
                  type="button"
                  onClick={() => {
                    setCurrentView(currentView === 'guest' ? 'dashboard' : 'guest');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2 text-center text-xs font-medium rounded-lg border border-stone-300 dark:border-stone-700 text-stone-800 dark:text-stone-200"
                >
                  {currentView === 'guest' ? 'Open Staff Operations PMS' : 'Return to Guest Website'}
                </button>
              )}
            </div>
          </div>
        )}
      </header>
    </>
  );
};

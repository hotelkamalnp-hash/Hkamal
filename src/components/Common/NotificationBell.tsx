import React, { useState, useRef, useEffect } from 'react';
import { useHotel } from '../../context/HotelContext';
import { StaffRole } from '../../types/hotel';

export const NotificationBell: React.FC = () => {
  const {
    operationalAlerts,
    unreadAlertsCount,
    markAlertAsRead,
    markAllAlertsAsRead,
    clearAlerts,
    activeRole,
  } = useHotel();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter alerts relevant to the current user's role
  const relevantAlerts = operationalAlerts.filter(
    (a) =>
      a.targetRoles.includes('all') ||
      a.targetRoles.includes(activeRole as StaffRole) ||
      activeRole === 'super_admin' ||
      activeRole === 'admin'
  );

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'booking':
        return (
          <span className="w-7 h-7 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </span>
        );
      case 'check_in':
        return (
          <span className="w-7 h-7 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
          </span>
        );
      case 'check_out':
        return (
          <span className="w-7 h-7 rounded bg-blue-500/10 text-blue-700 dark:text-blue-400 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </span>
        );
      case 'room_assigned':
        return (
          <span className="w-7 h-7 rounded bg-purple-500/10 text-purple-700 dark:text-purple-400 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </span>
        );
      case 'dining_order':
      case 'kot':
        return (
          <span className="w-7 h-7 rounded bg-orange-500/10 text-orange-700 dark:text-orange-400 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </span>
        );
      case 'chat':
        return (
          <span className="w-7 h-7 rounded bg-teal-500/10 text-teal-700 dark:text-teal-400 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </span>
        );
      case 'wake_up_call':
        return (
          <span className="w-7 h-7 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
        );
      case 'room_service_amenity':
        return (
          <span className="w-7 h-7 rounded bg-amber-500/15 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </span>
        );
      case 'vip_checkin':
        return (
          <span className="w-7 h-7 rounded bg-rose-500/15 text-rose-700 dark:text-rose-400 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </span>
        );
      default:
        return (
          <span className="w-7 h-7 rounded bg-stone-500/10 text-stone-700 dark:text-stone-400 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
        );
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Operational Notifications"
        className="relative p-2 rounded-lg text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors focus:outline-none"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {unreadAlertsCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-black leading-none text-white bg-red-600 rounded-full animate-pulse shadow-sm">
            {unreadAlertsCount > 99 ? '99+' : unreadAlertsCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl shadow-2xl z-[9999] overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 bg-stone-50 dark:bg-stone-950 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="font-serif font-bold text-stone-900 dark:text-stone-100 text-sm">
                Operational Alerts
              </span>
              {unreadAlertsCount > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 rounded">
                  {unreadAlertsCount} Unread
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2 text-xs">
              {unreadAlertsCount > 0 && (
                <button
                  onClick={() => markAllAlertsAsRead()}
                  className="text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white underline font-medium"
                >
                  Mark read
                </button>
              )}
              {relevantAlerts.length > 0 && (
                <button
                  onClick={() => clearAlerts()}
                  className="text-stone-400 hover:text-red-600 dark:hover:text-red-400"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Alert Feed */}
          <div className="max-h-96 overflow-y-auto divide-y divide-stone-100 dark:divide-stone-800/60">
            {relevantAlerts.length === 0 ? (
              <div className="p-8 text-center text-stone-400 dark:text-stone-500">
                <svg className="w-10 h-10 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <p className="text-xs font-medium">All caught up! No active operational alerts.</p>
              </div>
            ) : (
              relevantAlerts.map((alert) => (
                <div
                  key={alert.id}
                  onClick={() => markAlertAsRead(alert.id)}
                  className={`p-3.5 transition-colors cursor-pointer flex items-start space-x-3 ${
                    alert.isRead
                      ? 'bg-white dark:bg-stone-900 opacity-80 hover:opacity-100 hover:bg-stone-50 dark:hover:bg-stone-800/40'
                      : 'bg-amber-50/60 dark:bg-amber-950/20 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                  }`}
                >
                  {getAlertIcon(alert.type)}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className={`text-xs ${alert.isRead ? 'font-medium text-stone-800 dark:text-stone-200' : 'font-bold text-stone-900 dark:text-white'}`}>
                        {alert.title}
                      </p>
                      <span className="text-[10px] text-stone-400 whitespace-nowrap ml-2">
                        {alert.timestamp}
                      </span>
                    </div>

                    <p className="text-[11px] text-stone-600 dark:text-stone-400 leading-snug break-words">
                      {alert.message}
                    </p>

                    <div className="mt-1.5 flex items-center space-x-2 text-[10px]">
                      {alert.roomNumber && (
                        <span className="font-mono bg-stone-200/70 dark:bg-stone-800 text-stone-800 dark:text-stone-200 px-1.5 py-0.5 rounded font-semibold">
                          Room {alert.roomNumber}
                        </span>
                      )}
                      {alert.bookingCode && (
                        <span className="font-mono text-stone-500 dark:text-stone-400">
                          {alert.bookingCode}
                        </span>
                      )}
                      {!alert.isRead && (
                        <span className="inline-block w-1.5 h-1.5 bg-amber-600 rounded-full" />
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer broadcast info */}
          <div className="px-4 py-2 bg-stone-50 dark:bg-stone-950 border-t border-stone-200 dark:border-stone-800 text-[10px] text-stone-500 dark:text-stone-400 flex items-center justify-between">
            <span>Broadcast: Admin · Super Admin · Reception · Owner</span>
            <span className="font-mono text-[9px] uppercase tracking-wider text-amber-700 dark:text-amber-400 font-bold">
              Live Feed
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

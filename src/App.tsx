import React, { useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './services/queryClient';
import { HotelProvider } from './context/HotelContext';
import { Header } from './components/Header';
import { GuestLanding } from './components/GuestLanding';
import { StaffDashboard } from './components/Dashboard/StaffDashboard';
import { BookingCheckoutModal } from './components/BookingCheckoutModal';
import { StaffLoginModal } from './components/StaffLoginModal';
import { CSRWidget } from './components/CSRWidget';
import { ToastContainer } from './components/ToastContainer';

import { InRoomGuestPortal } from './components/GuestPortal/InRoomGuestPortal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { RoleSwitcherBar } from './components/Common/RoleSwitcherBar';
import { GuestSurveyModal } from './components/GuestPortal/GuestSurveyModal';
import { NewBookingAlertModal } from './components/Common/NewBookingAlertModal';
import { AlertTriangle, X } from 'lucide-react';

import { useHotel } from './context/HotelContext';

function HotelAppContent() {
  const [currentView, setCurrentView] = useState<'guest' | 'dashboard' | 'in_room_guest'>('guest');
  const [mapsQuotaExceeded, setMapsQuotaExceeded] = useState<boolean>(false);
  const { isStaffLoggedIn, openLoginModal, activeRole, refreshBootstrapFromServer, showToast } = useHotel();

  // Listen to global Demo Key quota/billing failure events (Case A Tier 2)
  React.useEffect(() => {
    const handleQuotaExceeded = () => setMapsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuotaExceeded);
  }, []);

  // Verify gateway return callbacks (eSewa ePay v2, Khalti v2, Stripe Hosted Checkout)
  React.useEffect(() => {
    const url = new URL(window.location.href);
    const paymentParam = url.searchParams.get('payment');
    if (!paymentParam) return;

    const cleanUrl = () => {
      url.searchParams.delete('payment');
      url.searchParams.delete('data');
      url.searchParams.delete('pidx');
      url.searchParams.delete('ref');
      url.searchParams.delete('session_id');
      url.searchParams.delete('status');
      url.searchParams.delete('transaction_id');
      window.history.replaceState({}, '', url.pathname + url.search + url.hash);
    };

    const runVerification = async () => {
      if (paymentParam === 'esewa_success') {
        const encodedData = url.searchParams.get('data') || '';
        if (encodedData) {
          const res = await fetch('/api/payments/esewa/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: encodedData }),
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok && data?.ok) {
            await refreshBootstrapFromServer().catch(() => {});
            showToast(
              'eSewa Payment Verified',
              `Booking ${data.booking?.bookingCode || ''} confirmed and paid.`,
              'success'
            );
          } else {
            showToast(
              'eSewa Verification Issue',
              data?.error || 'Could not confirm eSewa signature.',
              'error'
            );
          }
        }
      } else if (paymentParam === 'esewa_failed') {
        showToast('eSewa Payment Cancelled', 'Your eSewa payment was cancelled or failed. Your room has not been charged.', 'warning');
      } else if (paymentParam === 'khalti_callback') {
        const pidx = url.searchParams.get('pidx') || '';
        if (pidx) {
          const res = await fetch('/api/payments/khalti/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pidx }),
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok && data?.ok) {
            await refreshBootstrapFromServer().catch(() => {});
            showToast(
              'Khalti Payment Verified',
              `Booking ${data.booking?.bookingCode || ''} confirmed and paid.`,
              'success'
            );
          } else {
            showToast('Khalti Verification Issue', data?.error || 'Could not verify Khalti payment.', 'error');
          }
        }
      } else if (paymentParam === 'card_success') {
        await refreshBootstrapFromServer().catch(() => {});
        const ref = url.searchParams.get('ref') || '';
        showToast(
          'Card Checkout Completed',
          `Your hosted card session${ref ? ` (${ref})` : ''} is being confirmed via webhook.`,
          'success'
        );
      } else if (paymentParam === 'card_cancelled') {
        showToast('Card Checkout Cancelled', 'Card payment was cancelled before charging.', 'warning');
      }
      cleanUrl();
    };

    runVerification().catch(() => cleanUrl());
  }, [refreshBootstrapFromServer, showToast]);

  // Guard: if user logs out or unauthorized guest attempts dashboard, redirect to guest
  React.useEffect(() => {
    if (currentView === 'dashboard' && !isStaffLoggedIn) {
      setCurrentView('guest');
    }
  }, [currentView, isStaffLoggedIn]);

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-100 transition-colors w-full max-w-full overflow-x-hidden">
      {/* Sticky Google Maps Platform Quota Exceeded Warning Banner (Case A Tier 2) */}
      {mapsQuotaExceeded && (
        <div
          role="alert"
          className="sticky top-0 z-50 bg-amber-50 dark:bg-amber-950 border-b border-amber-300 dark:border-amber-800 px-4 py-2.5 text-amber-950 dark:text-amber-100 text-xs"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
              <span>
                The demo Google Maps API key has reached its request quota limit. Interactive map or neighborhood directory features may be temporarily limited.{' '}
                <a
                  href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold underline hover:text-amber-800 dark:hover:text-amber-300"
                >
                  Learn how to resolve quota errors
                </a>
                .
              </span>
            </div>
            <button
              type="button"
              onClick={() => setMapsQuotaExceeded(false)}
              aria-label="Dismiss Google Maps quota warning"
              className="p-1 rounded hover:bg-amber-200/60 dark:hover:bg-amber-900 text-amber-800 dark:text-amber-200 cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Operational Role Switcher Bar: DEV-only debugging tool, disabled in production */}
      {import.meta.env.DEV && isStaffLoggedIn && currentView === 'dashboard' && (
        <RoleSwitcherBar currentView={currentView} setCurrentView={setCurrentView} />
      )}

      {/* 3-Zone Top Navigation Header */}
      <Header currentView={currentView} setCurrentView={setCurrentView} />

      {/* Main View Router with responsive mobile padding */}
      <main className="flex-1 pb-20 md:pb-0">
        {currentView === 'guest' ? (
          <GuestLanding 
            onOpenDashboard={() => {
              if (isStaffLoggedIn) {
                setCurrentView('dashboard');
              } else {
                openLoginModal();
              }
            }} 
            onOpenInRoomPortal={() => setCurrentView('in_room_guest')}
          />
        ) : currentView === 'in_room_guest' ? (
          <InRoomGuestPortal />
        ) : isStaffLoggedIn ? (
          <StaffDashboard onPreviewGuestSite={() => setCurrentView('guest')} />
        ) : (
          <GuestLanding 
            onOpenDashboard={() => openLoginModal()} 
            onOpenInRoomPortal={() => setCurrentView('in_room_guest')}
          />
        )}
      </main>

      {/* Mobile Fixed Bottom Navigation Bar (hidden on desktop/laptop) */}
      <MobileBottomNav currentView={currentView} setCurrentView={setCurrentView} />

      {/* Real-time Secure Booking & Checkout Modal */}
      <BookingCheckoutModal />

      {/* Staff Role & Super Admin Login Modal */}
      <StaffLoginModal onSuccess={() => setCurrentView('dashboard')} />

      {/* Post-Checkout Automated Email/SMS Stay Survey Modal */}
      <GuestSurveyModal />

      {/* Real-time Pop-up Alert for Authorized Staff when New Guest Booking Arrives */}
      <NewBookingAlertModal
        onViewReservations={() => {
          setCurrentView('dashboard');
          setTimeout(() => {
            if (activeRole === 'receptionist') {
              window.dispatchEvent(
                new CustomEvent('kamal-open-dashboard-tab', { detail: { tab: 'reception' } })
              );
              window.dispatchEvent(
                new CustomEvent('kamal-open-reception-subtab', { detail: { subTab: 'arrivals' } })
              );
            } else {
              window.dispatchEvent(
                new CustomEvent('kamal-open-dashboard-tab', { detail: { tab: 'bookings' } })
              );
            }
          }, 60);
        }}
      />

      {/* Real-Time CSR Concierge & WhatsApp Assistant */}
      <CSRWidget />

      {/* Real-Time Notification Toasts (Booking alerts, SMS, Email, CMS saves) */}
      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HotelProvider>
        <HotelAppContent />
      </HotelProvider>
    </QueryClientProvider>
  );
}

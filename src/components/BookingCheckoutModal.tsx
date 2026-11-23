import React, { useState, useEffect } from 'react';
import { useHotel } from '../context/HotelContext';
import { Room, Booking, BookingAddon, PaymentMethod, CurrencyCode } from '../types/hotel';
import { getThemeClasses, formatCurrency, convertPrice, calculateStayDuration } from '../utils/theme';
import { 
  X, 
  CreditCard, 
  ShieldCheck, 
  Lock, 
  CheckCircle2, 
  Calendar, 
  Users, 
  Mail, 
  Phone, 
  Printer, 
  Download,
  MessageSquare, 
  ArrowRight, 
  ChevronLeft, 
  Smartphone,
  MapPin,
  Coins,
  Tag,
  Ticket,
  KeyRound,
  AlertCircle
} from 'lucide-react';
import { useModalDismiss, ModalDismissButton } from './Common/ModalDismissHandler';
import { printElement, downloadBookingVoucherPdf } from '../utils/printUtility';

const AVAILABLE_ADDONS: BookingAddon[] = [
  {
    id: 'addon-breakfast',
    name: 'Ground-Floor Himalayan Breakfast Buffet',
    priceUSD: 8,
    description: 'Fresh organic fruits, highland coffee, eggs, and freshly baked pastries daily.',
    selected: true,
  },
  {
    id: 'addon-airport',
    name: 'Private Tribhuvan Airport (TIA) Pickup',
    priceUSD: 18,
    description: 'Private hotel sedan meets you right outside the arrivals terminal in Kathmandu.',
    selected: false,
  },
  {
    id: 'addon-tour',
    name: 'Kathmandu Valley Heritage Tour',
    priceUSD: 25,
    description: 'Private driver excursion to Pashupatinath, Boudhanath, and Swayambhunath.',
    selected: false,
  },
  {
    id: 'addon-massage',
    name: 'Traditional Ayurvedic Relaxation Massage',
    priceUSD: 35,
    description: '60-minute therapeutic herbal oil massage by certified wellness therapists.',
    selected: false,
  },
];

export const BookingCheckoutModal: React.FC = () => {
  const { 
    isBookingModalOpen, 
    closeBookingModal, 
    selectedRoomForBooking, 
    themeConfig, 
    billSettings,
    currentCurrency, 
    setCurrentCurrency, 
    applyServerCreatedBooking,
    refreshBootstrapFromServer,
    markBookingEmailSent,
    validateAndApplyCoupon,
    showToast
  } = useHotel();

  const themeClasses = getThemeClasses(themeConfig.palette);

  // Today & Tomorrow default
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const checkoutDefault = new Date(today);
  checkoutDefault.setDate(today.getDate() + 4);

  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  // Steps: 1: Details & Addons, 2: Payment, 3: Success Confirmation
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form State
  const [checkIn, setCheckIn] = useState<string>(formatDate(tomorrow));
  const [checkOut, setCheckOut] = useState<string>(formatDate(checkoutDefault));
  const [adults, setAdults] = useState<number>(2);
  const [children, setChildren] = useState<number>(0);
  const [guestName, setGuestName] = useState<string>('Boutique Traveler');
  const [guestEmail, setGuestEmail] = useState<string>('hotelkamal.np@gmail.com');
  const [guestPhone, setGuestPhone] = useState<string>('+977 9801234567');
  const [guestCountry, setGuestCountry] = useState<string>('Nepal');
  const [specialRequests, setSpecialRequests] = useState<string>('');

  // Addons State
  const [addons, setAddons] = useState<BookingAddon[]>(AVAILABLE_ADDONS);

  // Coupon State
  const [couponInput, setCouponInput] = useState<string>('');
  const [appliedCouponData, setAppliedCouponData] = useState<{
    code: string;
    discountUSD: number;
    description: string;
  } | null>(null);
  const [couponError, setCouponError] = useState<string>('');

  // Payment & Gateway State (Zero raw PAN/CVV fields — hosted redirects / pay at check-in only)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('onsite');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [paymentError, setPaymentError] = useState<string>('');
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() =>
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `idem-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  );
  const [gatewayStatus, setGatewayStatus] = useState<{
    esewa?: { configured: boolean; env?: string };
    khalti?: { configured: boolean; env?: string };
    stripeCard?: { configured: boolean; webhookConfigured?: boolean };
  } | null>(null);

  // Live room availability state from server
  const [availabilityState, setAvailabilityState] = useState<{
    loading: boolean;
    availableCount: number | null;
    error?: string;
  }>({ loading: false, availableCount: null });

  // Confirmed booking state
  const [confirmedBookingCode, setConfirmedBookingCode] = useState<string>('');
  const [confirmedSummary, setConfirmedSummary] = useState<{
    booking: Booking;
    authCode: string;
    roomSubtotalFormatted: string;
    addons: { name: string; priceFormatted: string }[];
    couponCode?: string;
    discountFormatted?: string;
    serviceChargeFormatted: string;
    taxFormatted: string;
    totalAmountFormatted: string;
    currency: CurrencyCode;
  } | null>(null);

  // Mandatory Email OTP Verification State
  const [emailVerified, setEmailVerified] = useState<boolean>(false);
  const [verifiedEmail, setVerifiedEmail] = useState<string>('');
  const [verifiedAt, setVerifiedAt] = useState<string>('');
  const [emailVerificationToken, setEmailVerificationToken] = useState<string>('');
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [otpCodeInput, setOtpCodeInput] = useState<string>('');
  const [otpPreviewCode, setOtpPreviewCode] = useState<string>('');
  const [otpDeliveryMode, setOtpDeliveryMode] = useState<'smtp' | 'sandbox_preview' | ''>('');
  const [otpLoading, setOtpLoading] = useState<boolean>(false);
  const [otpVerifying, setOtpVerifying] = useState<boolean>(false);
  const [otpError, setOtpError] = useState<string>('');
  const [otpMessage, setOtpMessage] = useState<string>('');

  // Real confirmation email status after booking completes
  const [confirmationEmailStatus, setConfirmationEmailStatus] = useState<{
    state: 'idle' | 'sending' | 'sent' | 'unconfigured' | 'failed';
    message?: string;
    messageId?: string;
  }>({ state: 'idle' });

  const isStaticGithubPagesHost =
    typeof window !== 'undefined' && window.location.hostname === 'hotelkamalnp-hash.github.io';

  useEffect(() => {
    if (isBookingModalOpen && selectedRoomForBooking) {
      setStep(1);
      setIsProcessing(false);
      setPaymentError('');
      setIdempotencyKey(
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `idem-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
      );
      setConfirmedBookingCode('');
      setConfirmedSummary(null);
      setEmailVerified(false);
      setVerifiedEmail('');
      setVerifiedAt('');
      setEmailVerificationToken('');
      setOtpSent(false);
      setOtpCodeInput('');
      setOtpPreviewCode('');
      setOtpDeliveryMode('');
      setOtpError('');
      setOtpMessage('');
      setConfirmationEmailStatus({ state: 'idle' });

      fetch('/api/payments/status')
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d?.ok && d?.gateways) {
            setGatewayStatus(d.gateways);
          }
        })
        .catch(() => {});
    }
  }, [isBookingModalOpen, selectedRoomForBooking?.id]);

  // Live server-side date-overlap availability lookup
  useEffect(() => {
    if (!isBookingModalOpen || !selectedRoomForBooking) return;
    if (!checkIn || !checkOut || checkOut <= checkIn) {
      setAvailabilityState({
        loading: false,
        availableCount: 0,
        error: 'Check-out date must be after check-in date.',
      });
      return;
    }

    let cancelled = false;
    setAvailabilityState((prev) => ({ ...prev, loading: true, error: undefined }));
    const params = new URLSearchParams({
      checkIn,
      checkOut,
      guests: String(adults + children),
    });
    fetch(`/api/availability?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.ok || !Array.isArray(data.availability)) return;
        const match = data.availability.find(
          (a: any) =>
            a.roomId === selectedRoomForBooking.id || a.roomTypeId === selectedRoomForBooking.id
        );
        setAvailabilityState({
          loading: false,
          availableCount: match ? Number(match.availableCount || 0) : null,
          error: match && match.availableCount <= 0 ? 'No physical rooms available for these exact dates.' : undefined,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setAvailabilityState({ loading: false, availableCount: null });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isBookingModalOpen, selectedRoomForBooking?.id, checkIn, checkOut, adults, children]);

  useModalDismiss({
    isOpen: isBookingModalOpen && Boolean(selectedRoomForBooking),
    onClose: closeBookingModal,
  });

  if (!isBookingModalOpen || !selectedRoomForBooking) {
    return null;
  }

  const room = selectedRoomForBooking;
  const nights = calculateStayDuration(checkIn, checkOut);
  const surgeMultiplier = themeConfig.seasonalSurgeMultiplier || 1.0;

  // Rate in selected currency
  const baseRateInCurrency = convertPrice(room.pricePerNightUSD * surgeMultiplier, currentCurrency, themeConfig.exchangeRates);
  const roomSubtotal = baseRateInCurrency * nights;

  const selectedAddons = addons.filter((a) => a.selected);
  const addonsSubtotal = selectedAddons.reduce((sum, item) => {
    const itemPriceInCurrency = convertPrice(item.priceUSD, currentCurrency, themeConfig.exchangeRates);
    if (item.id === 'addon-breakfast') {
      return sum + itemPriceInCurrency * nights * adults;
    }
    return sum + itemPriceInCurrency;
  }, 0);

  // Base USD subtotal for coupon logic
  const roomSubtotalUSD = (room.pricePerNightUSD * surgeMultiplier) * nights;
  const addonsSubtotalUSD = selectedAddons.reduce((sum, item) => {
    if (item.id === 'addon-breakfast') {
      return sum + item.priceUSD * nights * adults;
    }
    return sum + item.priceUSD;
  }, 0);
  const rawSubtotalUSD = roomSubtotalUSD + addonsSubtotalUSD;

  const rawSubtotal = roomSubtotal + addonsSubtotal;

  // Coupon discount calculation
  const couponDiscountInCurrency = appliedCouponData 
    ? convertPrice(appliedCouponData.discountUSD, currentCurrency, themeConfig.exchangeRates)
    : 0;

  const discountedSubtotal = Math.max(0, rawSubtotal - couponDiscountInCurrency);
  // Nepal Statutory Standard: 10% Service Charge + 13% VAT
  const serviceChargeAmount = Number((discountedSubtotal * 0.10).toFixed(2));
  const vatBase = discountedSubtotal + serviceChargeAmount;
  const taxAmount = Number((vatBase * 0.13).toFixed(2));
  const grandTotal = Number((vatBase + taxAmount).toFixed(2));

  const handleApplyCoupon = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setCouponError('');
    if (!couponInput.trim()) return;

    const res = validateAndApplyCoupon(couponInput.trim(), rawSubtotalUSD, 'rooms');
    if (res.valid && res.coupon) {
      setAppliedCouponData({
        code: res.coupon.code,
        discountUSD: res.discountAmountUSD,
        description: res.coupon.description,
      });
      showToast('Coupon Applied!', `Saved $${res.discountAmountUSD.toFixed(2)} with code ${res.coupon.code}`, 'success');
    } else {
      setCouponError(res.message);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCouponData(null);
    setCouponInput('');
    setCouponError('');
    showToast('Coupon Removed', 'Standard booking rate restored.', 'info');
  };

  const toggleAddon = (id: string) => {
    setAddons((prev) =>
      prev.map((addon) => (addon.id === id ? { ...addon, selected: !addon.selected } : addon))
    );
  };

  const handleSendVerificationCode = async () => {
    const cleanEmail = guestEmail.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setOtpError('Please enter a valid email address before requesting a verification code.');
      return;
    }
    setOtpLoading(true);
    setOtpError('');
    setOtpMessage('');
    setOtpPreviewCode('');
    try {
      const res = await fetch('/api/bookings/send-verification-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          guestName: guestName.trim() || 'Guest',
          hotelName: themeConfig.hotelName,
        }),
      });
      const contentType = res.headers.get('content-type') || '';
      if ((res.status === 404 || !contentType.includes('application/json')) && isStaticGithubPagesHost) {
        const fallbackCode = String(Math.floor(100000 + Math.random() * 900000));
        sessionStorage.setItem(
          `kamal_static_otp_${cleanEmail}`,
          JSON.stringify({ code: fallbackCode, expiresAt: Date.now() + 10 * 60 * 1000 })
        );
        setOtpSent(true);
        setOtpPreviewCode(fallbackCode);
        setOtpDeliveryMode('sandbox_preview');
        setOtpMessage(`Static-host sandbox code ready for ${cleanEmail} (valid 10 mins).`);
        showToast('Verification Code Ready', `Use sandbox code ${fallbackCode} to verify ${cleanEmail}.`, 'info');
        return;
      }
      if (!contentType.includes('application/json')) {
        setOtpError('Verification server returned an unexpected response. Please retry shortly.');
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        setOtpError(data?.error || data?.message || 'Unable to send verification code. Please check your SMTP settings or email.');
        return;
      }
      setOtpSent(true);
      const preview = data?.previewCode || data?.verificationCodePreview || '';
      setOtpPreviewCode(preview ? String(preview) : '');
      setOtpDeliveryMode(data?.deliveryMode === 'smtp' ? 'smtp' : 'sandbox_preview');
      setOtpMessage(data?.message || `6-digit verification code sent to ${cleanEmail}`);
      showToast(
        data?.smtpSent ? 'Verification Email Sent' : 'Verification Code Ready',
        data?.smtpSent
          ? `Check ${cleanEmail} inbox for your 6-digit verification code.`
          : `Verification code generated for ${cleanEmail}. Configure SMTP in CMS for live inbox delivery.`,
        data?.smtpSent ? 'success' : 'info'
      );
    } catch {
      if (isStaticGithubPagesHost) {
        const fallbackCode = String(Math.floor(100000 + Math.random() * 900000));
        sessionStorage.setItem(
          `kamal_static_otp_${cleanEmail}`,
          JSON.stringify({ code: fallbackCode, expiresAt: Date.now() + 10 * 60 * 1000 })
        );
        setOtpSent(true);
        setOtpPreviewCode(fallbackCode);
        setOtpDeliveryMode('sandbox_preview');
        setOtpMessage(`Offline/static sandbox code ready for ${cleanEmail}.`);
      } else {
        setOtpError('Unable to reach the verification server. Please check your connection and try again.');
      }
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyEmailCode = async () => {
    const cleanEmail = guestEmail.trim().toLowerCase();
    const cleanCode = otpCodeInput.trim();
    if (!cleanCode) {
      setOtpError('Enter the 6-digit verification code sent to your email.');
      return;
    }
    setOtpVerifying(true);
    setOtpError('');
    try {
      const res = await fetch('/api/bookings/verify-email-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          code: cleanCode,
        }),
      });
      const contentType = res.headers.get('content-type') || '';
      if ((res.status === 404 || !contentType.includes('application/json')) && isStaticGithubPagesHost) {
        const storedRaw = sessionStorage.getItem(`kamal_static_otp_${cleanEmail}`);
        const stored = storedRaw ? JSON.parse(storedRaw) : null;
        if (!stored || stored.expiresAt < Date.now() || stored.code !== cleanCode) {
          setOtpError('Invalid or expired verification code.');
          return;
        }
        sessionStorage.removeItem(`kamal_static_otp_${cleanEmail}`);
        setEmailVerified(true);
        setVerifiedEmail(cleanEmail);
        setVerifiedAt(new Date().toISOString());
        setOtpMessage('Email verified. You may continue to confirm your booking.');
        showToast('Email Verified', `${cleanEmail} confirmed for reservation.`, 'success');
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.verified) {
        setOtpError(data?.error || data?.message || 'Invalid or expired verification code.');
        return;
      }
      setEmailVerified(true);
      setVerifiedEmail(cleanEmail);
      setVerifiedAt(data?.verifiedAt || new Date().toISOString());
      setEmailVerificationToken(typeof data?.verificationToken === 'string' ? data.verificationToken : '');
      setOtpMessage('Email verified. You may continue to confirm your booking.');
      showToast('Email Verified', `${cleanEmail} confirmed for reservation.`, 'success');
    } catch {
      if (isStaticGithubPagesHost) {
        const storedRaw = sessionStorage.getItem(`kamal_static_otp_${cleanEmail}`);
        const stored = storedRaw ? JSON.parse(storedRaw) : null;
        if (stored && stored.expiresAt >= Date.now() && stored.code === cleanCode) {
          sessionStorage.removeItem(`kamal_static_otp_${cleanEmail}`);
          setEmailVerified(true);
          setVerifiedEmail(cleanEmail);
          setVerifiedAt(new Date().toISOString());
          setOtpMessage('Email verified. You may continue to confirm your booking.');
          return;
        }
      }
      setOtpError('Network error verifying code. Please try again.');
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkIn || !checkOut || checkOut <= checkIn) {
      showToast('Invalid Stay Dates', 'Check-out date must be after check-in date.', 'warning');
      return;
    }
    if (availabilityState.availableCount !== null && availabilityState.availableCount <= 0) {
      showToast('Room Unavailable', 'All units of this suite type are booked for your selected dates. Please pick another date or room.', 'error');
      return;
    }
    const cleanEmail = guestEmail.trim().toLowerCase();
    if (!emailVerified || verifiedEmail !== cleanEmail) {
      setOtpError('Please verify your email address with the 6-digit code before continuing.');
      showToast(
        'Email Verification Required',
        'Verify your email with the 6-digit confirmation code so unauthorized bookings are prevented.',
        'warning'
      );
      return;
    }
    setPaymentError('');
    setStep(2);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = guestEmail.trim().toLowerCase();
    if (!emailVerified || verifiedEmail !== cleanEmail) {
      setOtpError('Email verification is required before confirming this booking.');
      showToast('Email Verification Required', 'Please verify your email address in Step 1.', 'warning');
      setStep(1);
      return;
    }

    setIsProcessing(true);
    setPaymentError('');

    const bookingPayload = {
      guestName: guestName.trim(),
      guestEmail: cleanEmail,
      guestPhone: guestPhone.trim(),
      guestCountry: guestCountry.trim() || 'Nepal',
      roomTypeId: room.id,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      adults,
      children,
      addons: selectedAddons,
      couponCode: appliedCouponData?.code,
      currency: currentCurrency,
      paymentMethod,
      specialRequests: appliedCouponData
        ? `${specialRequests ? specialRequests + ' | ' : ''}Promo applied: ${appliedCouponData.code} (-$${appliedCouponData.discountUSD.toFixed(2)})`
        : specialRequests,
      emailVerified: true,
      verifiedAt: verifiedAt || new Date().toISOString(),
      emailVerificationToken,
      idempotencyKey,
    };

    try {
      if (paymentMethod === 'onsite') {
        const res = await fetch('/api/bookings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': idempotencyKey,
          },
          credentials: 'include',
          body: JSON.stringify(bookingPayload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.ok || !data?.booking) {
          const msg = data?.error || data?.message || 'Unable to lock room reservation. Please try again.';
          setPaymentError(msg);
          showToast('Booking Failed', msg, 'error');
          if (data?.code === 'INVALID_OTP_PROOF' || data?.code === 'EMAIL_VERIFICATION_REQUIRED') {
            setStep(1);
          }
          setIsProcessing(false);
          return;
        }

        const createdBooking: Booking = data.booking;
        applyServerCreatedBooking({
          booking: createdBooking,
          invoice: data.invoice,
          guestSession: data.guestSession,
        });
        await refreshBootstrapFromServer().catch(() => {});

        const formattedAddons = selectedAddons.map((addon) => {
          const unitCurr = convertPrice(addon.priceUSD, currentCurrency, themeConfig.exchangeRates);
          const lineCurr = addon.id === 'addon-breakfast' ? unitCurr * nights * adults : unitCurr;
          return {
            name: addon.id === 'addon-breakfast' ? `${addon.name} (${adults} guests × ${nights}n)` : addon.name,
            priceFormatted: formatCurrency(lineCurr, currentCurrency),
          };
        });

        const serverTotals = data.quote || {};
        const summarySnapshot = {
          booking: createdBooking,
          authCode: 'ONSITE-HOLD',
          roomSubtotalFormatted: formatCurrency(
            serverTotals.roomSubtotalCurr ?? roomSubtotal,
            currentCurrency
          ),
          addons: formattedAddons,
          couponCode: appliedCouponData?.code,
          discountFormatted:
            appliedCouponData || serverTotals.discountCurr
              ? formatCurrency(serverTotals.discountCurr ?? couponDiscountInCurrency, currentCurrency)
              : undefined,
          serviceChargeFormatted: formatCurrency(
            serverTotals.serviceChargeCurr ?? serviceChargeAmount,
            currentCurrency
          ),
          taxFormatted: formatCurrency(serverTotals.taxCurr ?? taxAmount, currentCurrency),
          totalAmountFormatted: formatCurrency(
            serverTotals.totalCurr ?? createdBooking.totalAmount ?? grandTotal,
            currentCurrency
          ),
          currency: currentCurrency,
        };

        setConfirmedBookingCode(createdBooking.bookingCode);
        setConfirmedSummary(summarySnapshot);
        setIsProcessing(false);
        setStep(3);
        dispatchConfirmationEmail(summarySnapshot, cleanEmail);
        return;
      }

      if (paymentMethod === 'esewa') {
        const res = await fetch('/api/payments/esewa/initiate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': idempotencyKey,
          },
          credentials: 'include',
          body: JSON.stringify({ bookingPayload, idempotencyKey }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.ok || !data?.actionUrl || !data?.formFields) {
          const msg =
            data?.error ||
            'eSewa ePay v2 is currently unavailable on the server. Choose Pay at Check-In or another active gateway.';
          setPaymentError(msg);
          showToast('eSewa Unavailable', msg, 'warning');
          setIsProcessing(false);
          return;
        }
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = data.actionUrl;
        Object.entries(data.formFields as Record<string, string>).forEach(([k, v]) => {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = k;
          input.value = String(v);
          form.appendChild(input);
        });
        document.body.appendChild(form);
        form.submit();
        return;
      }

      if (paymentMethod === 'khalti') {
        const res = await fetch('/api/payments/khalti/initiate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': idempotencyKey,
          },
          credentials: 'include',
          body: JSON.stringify({ bookingPayload, idempotencyKey }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.ok || !data?.paymentUrl) {
          const msg =
            data?.error ||
            'Khalti ePayment v2 is currently unavailable on the server. Choose Pay at Check-In or another active gateway.';
          setPaymentError(msg);
          showToast('Khalti Unavailable', msg, 'warning');
          setIsProcessing(false);
          return;
        }
        window.location.href = data.paymentUrl;
        return;
      }

      if (paymentMethod === 'card') {
        const res = await fetch('/api/payments/card/initiate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': idempotencyKey,
          },
          credentials: 'include',
          body: JSON.stringify({ bookingPayload, idempotencyKey }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.ok || !data?.checkoutUrl) {
          const msg =
            data?.error ||
            'Hosted Card Checkout is not configured on the server. Choose Pay at Check-In to confirm without pre-charge.';
          setPaymentError(msg);
          showToast('Card Gateway Unavailable', msg, 'warning');
          setIsProcessing(false);
          return;
        }
        window.location.href = data.checkoutUrl;
        return;
      }
    } catch {
      const msg = 'Network error communicating with booking server. Please retry.';
      setPaymentError(msg);
      showToast('Network Error', msg, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const dispatchConfirmationEmail = (
    summary: NonNullable<typeof confirmedSummary>,
    recipientEmail: string
  ) => {
    setConfirmationEmailStatus({ state: 'sending' });
    fetch('/api/bookings/send-confirmation-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        bookingCode: summary.booking.bookingCode,
        guestName: summary.booking.guestName,
        guestEmail: recipientEmail,
        guestPhone: summary.booking.guestPhone,
        roomName: summary.booking.roomName,
        assignedRoomNumber: summary.booking.assignedRoomNumber || '',
        checkInDate: summary.booking.checkInDate,
        checkOutDate: summary.booking.checkOutDate,
        nights: summary.booking.nights,
        adults: summary.booking.adults,
        children: summary.booking.children,
        currency: summary.currency,
        roomSubtotalFormatted: summary.roomSubtotalFormatted,
        addons: summary.addons,
        couponCode: summary.couponCode,
        discountFormatted: summary.discountFormatted,
        serviceChargeFormatted: summary.serviceChargeFormatted,
        taxFormatted: summary.taxFormatted,
        totalAmountFormatted: summary.totalAmountFormatted,
        paymentMethod: summary.booking.paymentMethod,
        paymentStatus: summary.booking.paymentStatus,
        specialRequests: summary.booking.specialRequests || '',
        hotelName: themeConfig.hotelName,
        hotelAddress: themeConfig.address,
        hotelPhone: themeConfig.contactPhone,
        hotelEmail: themeConfig.contactEmail,
        panVatNumber: billSettings.panVatNumber,
        checkInTime: themeConfig.checkInTime,
        checkOutTime: themeConfig.checkOutTime,
        googleMapsUrl: themeConfig.googleMapsUrl,
        verificationToken: emailVerificationToken,
      }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (res.ok && data?.sent) {
          markBookingEmailSent(summary.booking.id, true);
          setConfirmationEmailStatus({
            state: 'sent',
            message: `Confirmation voucher emailed to ${recipientEmail}`,
            messageId: data.messageId,
          });
        } else if (data?.deliveryMode === 'smtp_unconfigured' || data?.deliveryMode === 'disabled') {
          setConfirmationEmailStatus({
            state: 'unconfigured',
            message: data?.message || 'SMTP credentials not set — save your PDF voucher below.',
          });
        } else {
          setConfirmationEmailStatus({
            state: 'failed',
            message: data?.error || 'Could not deliver confirmation email.',
          });
        }
      })
      .catch(() => {
        setConfirmationEmailStatus({
          state: 'failed',
          message: 'Network error while dispatching confirmation email.',
        });
      });
  };

  const handlePrintVoucher = () => {
    const ok = printElement('printable-voucher-area', `Booking_Voucher_${confirmedBookingCode}`);
    if (!ok) {
      handleDownloadVoucherPdf();
    }
  };

  const handleDownloadVoucherPdf = () => {
    if (!confirmedSummary) return;
    downloadBookingVoucherPdf({
      bookingCode: confirmedSummary.booking.bookingCode,
      guestName: confirmedSummary.booking.guestName,
      guestEmail: confirmedSummary.booking.guestEmail,
      guestPhone: confirmedSummary.booking.guestPhone,
      guestCountry: confirmedSummary.booking.guestCountry,
      roomName: confirmedSummary.booking.roomName,
      assignedRoomNumber: confirmedSummary.booking.assignedRoomNumber,
      checkInDate: confirmedSummary.booking.checkInDate,
      checkOutDate: confirmedSummary.booking.checkOutDate,
      checkInTime: themeConfig.checkInTime,
      checkOutTime: themeConfig.checkOutTime,
      nights: confirmedSummary.booking.nights,
      adults: confirmedSummary.booking.adults,
      children: confirmedSummary.booking.children,
      paymentMethod: confirmedSummary.booking.paymentMethod,
      paymentStatus: confirmedSummary.booking.paymentStatus,
      currency: confirmedSummary.currency,
      roomSubtotalFormatted: confirmedSummary.roomSubtotalFormatted,
      addons: confirmedSummary.addons,
      couponCode: confirmedSummary.couponCode,
      discountFormatted: confirmedSummary.discountFormatted,
      serviceChargeFormatted: confirmedSummary.serviceChargeFormatted,
      taxFormatted: confirmedSummary.taxFormatted,
      totalAmountFormatted: confirmedSummary.totalAmountFormatted,
      specialRequests: confirmedSummary.booking.specialRequests,
      hotelName: themeConfig.hotelName,
      hotelAddress: themeConfig.address,
      hotelPhone: themeConfig.contactPhone,
      hotelEmail: themeConfig.contactEmail,
      panVatNumber: billSettings.panVatNumber,
    });
    showToast('PDF Downloaded', `Reservation voucher ${confirmedBookingCode}.pdf saved.`, 'success');
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-stone-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeBookingModal();
      }}
    >
      <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-2xl w-full max-h-[88vh] flex flex-col border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden animate-fade-in">
        
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-stone-100/80 dark:bg-stone-800/60 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
              Kamal Hotel · Kamalpokhari, Kathmandu
            </span>
            <span className="text-xs text-stone-500 hidden sm:inline">
              Step {step} of 3: {step === 1 ? 'Guest Information' : step === 2 ? 'Secure Payment' : 'Confirmed Voucher'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Currency selector inside modal */}
            <div className="flex bg-stone-200 dark:bg-stone-700 rounded p-0.5 text-[11px] font-semibold">
              {(['NPR', 'USD', 'INR'] as CurrencyCode[]).map((curr) => (
                <button
                  key={curr}
                  type="button"
                  onClick={() => setCurrentCurrency(curr)}
                  className={`px-1.5 py-0.5 rounded ${
                    currentCurrency === curr
                      ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-50 shadow-xs'
                      : 'text-stone-600 dark:text-stone-300'
                  }`}
                >
                  {curr}
                </button>
              ))}
            </div>

            <ModalDismissButton onClose={closeBookingModal} ariaLabel="Close booking modal" />
          </div>
        </div>

        {/* Step 1: Details & Enhancements */}
        {step === 1 && (
          <form onSubmit={handleDetailsSubmit} className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              
              {/* Left Column: Form Fields */}
              <div className="lg:col-span-7 space-y-4">
                <div>
                  <h3 className="text-xl font-serif font-bold text-stone-900 dark:text-stone-50">
                    Guest & Reservation Details
                  </h3>
                  <p className="text-xs text-stone-500 mt-1">
                    Instant automated confirmation vouchers will be dispatched to this email and phone.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                      Check-In Date
                    </label>
                    <input
                      type="date"
                      value={checkIn}
                      onChange={(e) => setCheckIn(e.target.value)}
                      className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-md px-3 py-2 text-xs font-medium text-stone-900 dark:text-stone-100 focus:ring-1 focus:ring-amber-600"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                      Check-Out Date ({nights} {nights === 1 ? 'night' : 'nights'})
                    </label>
                    <input
                      type="date"
                      value={checkOut}
                      min={checkIn}
                      onChange={(e) => setCheckOut(e.target.value)}
                      className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-md px-3 py-2 text-xs font-medium text-stone-900 dark:text-stone-100 focus:ring-1 focus:ring-amber-600"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                      Adults
                    </label>
                    <select
                      value={adults}
                      onChange={(e) => setAdults(Number(e.target.value))}
                      className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-md px-3 py-2 text-xs font-medium text-stone-900 dark:text-stone-100"
                    >
                      <option value={1}>1 Adult</option>
                      <option value={2}>2 Adults</option>
                      <option value={3}>3 Adults</option>
                      <option value={4}>4 Adults</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                      Children (0-12 yrs)
                    </label>
                    <select
                      value={children}
                      onChange={(e) => setChildren(Number(e.target.value))}
                      className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-md px-3 py-2 text-xs font-medium text-stone-900 dark:text-stone-100"
                    >
                      <option value={0}>0 Children</option>
                      <option value={1}>1 Child</option>
                      <option value={2}>2 Children</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                      Full Legal Name
                    </label>
                    <input
                      type="text"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="e.g. Eleanor Vance"
                      className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-md px-3 py-2 text-xs font-medium text-stone-900 dark:text-stone-100 focus:ring-1 focus:ring-amber-600"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                        Email Address (verification required) *
                      </label>
                      <input
                        type="email"
                        value={guestEmail}
                        onChange={(e) => {
                          setGuestEmail(e.target.value);
                          setEmailVerified(false);
                          setVerifiedEmail('');
                          setVerifiedAt('');
                          setOtpSent(false);
                          setOtpCodeInput('');
                          setOtpPreviewCode('');
                          setOtpError('');
                          setOtpMessage('');
                        }}
                        placeholder="guest@example.com"
                        className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-md px-3 py-2 text-xs font-medium text-stone-900 dark:text-stone-100 focus:ring-1 focus:ring-amber-600"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                        Mobile Phone (for SMS updates)
                      </label>
                      <input
                        type="tel"
                        value={guestPhone}
                        onChange={(e) => setGuestPhone(e.target.value)}
                        placeholder="+977 9801234567"
                        className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-md px-3 py-2 text-xs font-medium text-stone-900 dark:text-stone-100 focus:ring-1 focus:ring-amber-600"
                        required
                      />
                    </div>
                  </div>

                  {/* Mandatory Email Confirmation Box */}
                  <div
                    className={`p-3 rounded-lg border text-xs space-y-2 ${
                      emailVerified && verifiedEmail === guestEmail.trim().toLowerCase()
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
                        : 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/70'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-semibold text-stone-900 dark:text-stone-100">
                        {emailVerified && verifiedEmail === guestEmail.trim().toLowerCase() ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span className="text-emerald-800 dark:text-emerald-300">Email Verified ✓</span>
                          </>
                        ) : (
                          <>
                            <KeyRound className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
                            <span>Confirm Email Before Booking</span>
                          </>
                        )}
                      </div>

                      {!(emailVerified && verifiedEmail === guestEmail.trim().toLowerCase()) && (
                        <button
                          type="button"
                          onClick={handleSendVerificationCode}
                          disabled={otpLoading}
                          className="px-3 py-1 rounded bg-amber-700 hover:bg-amber-800 text-white font-semibold text-[11px] cursor-pointer disabled:opacity-60 whitespace-nowrap shrink-0"
                        >
                          {otpLoading ? 'Sending...' : otpSent ? 'Resend Code' : 'Send Verification Code'}
                        </button>
                      )}
                    </div>

                    {otpSent && !(emailVerified && verifiedEmail === guestEmail.trim().toLowerCase()) && (
                      <div className="space-y-1.5">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            value={otpCodeInput}
                            onChange={(e) => {
                              setOtpCodeInput(e.target.value.replace(/\D/g, '').slice(0, 6));
                              setOtpError('');
                            }}
                            placeholder="Enter 6-digit code"
                            className="flex-1 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded px-2.5 py-1.5 text-xs font-mono tracking-widest font-bold text-stone-900 dark:text-stone-100"
                          />
                          <button
                            type="button"
                            onClick={handleVerifyEmailCode}
                            disabled={otpVerifying || otpCodeInput.length < 6}
                            className="px-3 py-1.5 rounded bg-stone-900 dark:bg-amber-600 hover:bg-stone-800 dark:hover:bg-amber-700 text-white font-semibold text-xs cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
                          >
                            {otpVerifying ? 'Verifying...' : 'Verify Code'}
                          </button>
                        </div>
                        {otpPreviewCode && otpDeliveryMode !== 'smtp' && (
                          <p className="text-[11px] text-amber-900 dark:text-amber-200 font-mono">
                            Sandbox preview code (SMTP not configured): <strong>{otpPreviewCode}</strong>
                          </p>
                        )}
                      </div>
                    )}

                    {otpMessage && !otpError && (
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-300">{otpMessage}</p>
                    )}

                    {otpError && (
                      <p className="text-[11px] text-rose-700 dark:text-rose-400 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{otpError}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                      Special Requests / Dietary Requirements
                    </label>
                    <textarea
                      rows={2}
                      value={specialRequests}
                      onChange={(e) => setSpecialRequests(e.target.value)}
                      placeholder="e.g., Upper floor room facing Kamalpokhari quiet courtyard, early bag drop."
                      className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-md px-3 py-2 text-xs font-medium text-stone-900 dark:text-stone-100"
                    />
                  </div>
                </div>

                {/* Add-ons Selector */}
                <div className="pt-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
                    Enhance Your Stay (Optional Add-ons)
                  </h4>
                  <div className="space-y-2">
                    {addons.map((addon) => {
                      const addonPriceInCurrency = convertPrice(addon.priceUSD, currentCurrency, themeConfig.exchangeRates);
                      return (
                        <label
                          key={addon.id}
                          className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            addon.selected
                              ? 'border-amber-600 bg-amber-50/50 dark:bg-amber-950/20'
                              : 'border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800/50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={addon.selected}
                            onChange={() => toggleAddon(addon.id)}
                            className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
                          />
                          <div className="flex-1 text-xs">
                            <div className="flex items-center justify-between font-semibold text-stone-900 dark:text-stone-100">
                              <span>{addon.name}</span>
                              <span className="tabular-nums">
                                +{formatCurrency(addonPriceInCurrency, currentCurrency)} {addon.id === 'addon-breakfast' ? '/ person / night' : ''}
                              </span>
                            </div>
                            <p className="text-[11px] text-stone-500 mt-0.5">{addon.description}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Column: Reservation Summary Card */}
              <div className="lg:col-span-5 bg-stone-50 dark:bg-stone-800/60 p-6 rounded-xl border border-stone-200 dark:border-stone-800 flex flex-col justify-between space-y-6">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2">
                    Booking Summary ({currentCurrency})
                  </div>
                  
                  {/* Room Thumbnail & Info */}
                  <div className="flex items-center gap-3 pb-4 border-b border-stone-200 dark:border-stone-700">
                    <img
                      src={room.images[0]}
                      alt={room.name}
                      className="w-16 h-14 rounded-lg object-cover"
                    />
                    <div>
                      <h4 className="text-sm font-serif font-bold text-stone-900 dark:text-stone-100">
                        {room.name}
                      </h4>
                      <div className="text-[11px] text-stone-500">
                        {room.bedType} · {room.view}
                      </div>
                    </div>
                  </div>

                  {/* Dates & Duration */}
                  <div className="py-4 border-b border-stone-200 dark:border-stone-700 text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-stone-500">Stay Duration:</span>
                      <span className="font-semibold text-stone-800 dark:text-stone-200 tabular-nums">
                        {nights} {nights === 1 ? 'Night' : 'Nights'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Dates:</span>
                      <span className="font-semibold text-stone-800 dark:text-stone-200">
                        {checkIn} → {checkOut}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Guests:</span>
                      <span className="font-semibold text-stone-800 dark:text-stone-200">
                        {adults} Adults {children > 0 ? `, ${children} Children` : ''}
                      </span>
                    </div>
                  </div>

                  {/* Price Calculation */}
                  <div className="py-4 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-stone-500">
                        Room Rate ({formatCurrency(baseRateInCurrency, currentCurrency)} × {nights}n):
                      </span>
                      <span className="font-medium text-stone-900 dark:text-stone-100 tabular-nums">
                        {formatCurrency(roomSubtotal, currentCurrency)}
                      </span>
                    </div>
                    {addonsSubtotal > 0 && (
                      <div className="flex justify-between">
                        <span className="text-stone-500">Selected Add-ons:</span>
                        <span className="font-medium text-stone-900 dark:text-stone-100 tabular-nums">
                          {formatCurrency(addonsSubtotal, currentCurrency)}
                        </span>
                      </div>
                    )}

                    {/* Promo Code Input & Applied Voucher */}
                    <div className="pt-2 pb-1 border-t border-stone-200 dark:border-stone-700">
                      {appliedCouponData ? (
                        <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-medium">
                            <Tag className="w-3.5 h-3.5" />
                            <span>Voucher: {appliedCouponData.code}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-emerald-700 dark:text-emerald-400 font-mono">
                              -{formatCurrency(couponDiscountInCurrency, currentCurrency)}
                            </span>
                            <button
                              type="button"
                              onClick={handleRemoveCoupon}
                              className="text-stone-400 hover:text-rose-600 font-bold px-1"
                              title="Remove coupon"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              placeholder="Promo / Voucher Code"
                              value={couponInput}
                              onChange={(e) => {
                                setCouponInput(e.target.value.toUpperCase());
                                setCouponError('');
                              }}
                              className="flex-1 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded px-2.5 py-1.5 text-xs font-mono uppercase tracking-wider text-stone-900 dark:text-stone-100"
                            />
                            <button
                              type="button"
                              onClick={() => handleApplyCoupon()}
                              className="px-3 py-1.5 rounded bg-stone-800 hover:bg-stone-900 text-white font-semibold text-xs transition cursor-pointer"
                            >
                              Apply
                            </button>
                          </div>
                          {couponError && (
                            <p className="text-[11px] text-rose-600 font-medium">{couponError}</p>
                          )}
                          <p className="text-[10px] text-stone-400">
                            Try: <span className="font-mono font-bold text-stone-600 dark:text-stone-300">WELCOME2026</span> (15% off) or <span className="font-mono font-bold text-stone-600 dark:text-stone-300">HIMALAYANVIP</span>
                          </p>
                        </div>
                      )}
                    </div>

                    {appliedCouponData && (
                      <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-semibold">
                        <span>Coupon Savings ({appliedCouponData.code}):</span>
                        <span className="tabular-nums">-{formatCurrency(couponDiscountInCurrency, currentCurrency)}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-stone-500">
                      <span>Hotel Service Charge (10%):</span>
                      <span className="font-medium text-stone-900 dark:text-stone-100 tabular-nums">
                        {formatCurrency(serviceChargeAmount, currentCurrency)}
                      </span>
                    </div>
                    <div className="flex justify-between text-stone-500">
                      <span>Nepal VAT (13% IRD):</span>
                      <span className="font-medium text-stone-900 dark:text-stone-100 tabular-nums">
                        {formatCurrency(taxAmount, currentCurrency)}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-stone-200 dark:border-stone-700 flex justify-between items-baseline">
                      <span className="text-sm font-bold text-stone-900 dark:text-stone-100">Total Due:</span>
                      <span className="text-2xl font-serif font-bold text-amber-700 dark:text-amber-400 tabular-nums">
                        {formatCurrency(grandTotal, currentCurrency)}
                      </span>
                    </div>
                  </div>

                  {/* Live Inventory Check */}
                  {availabilityState.availableCount !== null && (
                    <div
                      className={`p-2.5 rounded-lg border text-[11px] font-medium flex items-center justify-between ${
                        availabilityState.availableCount > 0
                          ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                          : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                      }`}
                    >
                      <span>
                        {availabilityState.availableCount > 0
                          ? `${availabilityState.availableCount} unit(s) available for ${checkIn} → ${checkOut}`
                          : availabilityState.error || 'Sold out for selected dates'}
                      </span>
                    </div>
                  )}

                  {/* Trust guarantees */}
                  <div className="p-3 bg-white dark:bg-stone-900 rounded-lg border border-stone-200/80 dark:border-stone-700/60 text-[11px] text-stone-500 space-y-1">
                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Best Rate Guarantee & Free Cancellation</span>
                    </div>
                    <p className="text-[10px] leading-tight">
                      Cancel up to 48 hours prior to check-in for a 100% full refund.
                    </p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={availabilityState.availableCount === 0}
                  className={`w-full py-3 px-4 rounded-lg font-semibold text-xs uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${themeClasses.primary}`}
                >
                  <span>Continue to Secure Payment</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          </form>
        )}

        {/* Step 2: Payment Gateway */}
        {step === 2 && (
          <form onSubmit={handlePaymentSubmit} className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
            <div className="max-w-2xl mx-auto space-y-5">
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-serif font-bold text-stone-900 dark:text-stone-50">
                    Secure Payment Gateway
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Encrypted with 256-bit SSL. Rates processed in {currentCurrency}.
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-stone-400">Total to Authorize</div>
                  <div className="text-xl font-serif font-bold text-stone-900 dark:text-stone-50 tabular-nums">
                    {formatCurrency(grandTotal, currentCurrency)}
                  </div>
                </div>
              </div>

              {/* Payment Methods Tabs (PCI-DSS Compliant: Hosted Redirects & Pay at Check-In Only) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('onsite');
                    setPaymentError('');
                  }}
                  className={`p-3 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                    paymentMethod === 'onsite'
                      ? 'border-sky-600 bg-sky-50/60 dark:bg-sky-950/30 text-stone-900 dark:text-stone-100 font-medium shadow-sm'
                      : 'border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400'
                  }`}
                >
                  <Lock className="w-4 h-4 mb-1 text-sky-600" />
                  <div>Pay at Check-In</div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400">Always Available</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('esewa');
                    setPaymentError('');
                  }}
                  className={`p-3 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                    paymentMethod === 'esewa'
                      ? 'border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/30 text-stone-900 dark:text-stone-100 font-medium shadow-sm'
                      : 'border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400'
                  }`}
                >
                  <Smartphone className="w-4 h-4 mb-1 text-emerald-600" />
                  <div>eSewa ePay v2</div>
                  <div className="text-[10px] text-stone-400">
                    {gatewayStatus?.esewa?.configured ? 'Ready (HMAC)' : 'Requires Merchant Keys'}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('khalti');
                    setPaymentError('');
                  }}
                  className={`p-3 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                    paymentMethod === 'khalti'
                      ? 'border-purple-600 bg-purple-50/60 dark:bg-purple-950/30 text-stone-900 dark:text-stone-100 font-medium shadow-sm'
                      : 'border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400'
                  }`}
                >
                  <Smartphone className="w-4 h-4 mb-1 text-purple-600" />
                  <div>Khalti Wallet</div>
                  <div className="text-[10px] text-stone-400">
                    {gatewayStatus?.khalti?.configured ? 'Ready (v2)' : 'Requires Merchant Key'}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('card');
                    setPaymentError('');
                  }}
                  className={`p-3 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                    paymentMethod === 'card'
                      ? 'border-amber-600 bg-amber-50/60 dark:bg-amber-950/30 text-stone-900 dark:text-stone-100 font-medium shadow-sm'
                      : 'border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400'
                  }`}
                >
                  <CreditCard className="w-4 h-4 mb-1 text-amber-700 dark:text-amber-400" />
                  <div>Card Checkout</div>
                  <div className="text-[10px] text-stone-400">
                    {gatewayStatus?.stripeCard?.configured ? 'Stripe Hosted' : 'Requires Stripe Key'}
                  </div>
                </button>
              </div>

              {paymentMethod === 'card' && (
                <div className="p-5 bg-stone-50 dark:bg-stone-800/60 rounded-xl border border-stone-200 dark:border-stone-700 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-amber-600" />
                      Hosted Card Checkout (PCI-DSS Compliant)
                    </span>
                    <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      NO CARD DATA STORED ON SERVER
                    </span>
                  </div>
                  <p className="text-stone-600 dark:text-stone-300 text-[11px] leading-relaxed">
                    You will be redirected to Stripe&apos;s official encrypted Checkout session to authorize{' '}
                    <strong>{formatCurrency(grandTotal, currentCurrency)}</strong>. Kamal Hotel never collects or stores your raw card number or CVV.
                  </p>
                </div>
              )}

              {paymentMethod === 'esewa' && (
                <div className="p-5 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs space-y-3">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold">
                    <Smartphone className="w-4 h-4" />
                    <span>eSewa ePay v2 Signed Redirect</span>
                  </div>
                  <p className="text-stone-600 dark:text-stone-300 text-[11px] leading-relaxed">
                    Upon clicking Confirm, a server-signed HMAC-SHA256 request will redirect you to eSewa ePay v2 to authorize {formatCurrency(grandTotal, currentCurrency)}.
                  </p>
                </div>
              )}

              {paymentMethod === 'khalti' && (
                <div className="p-5 bg-purple-50/50 dark:bg-purple-950/20 rounded-xl border border-purple-200 dark:border-purple-800 text-xs space-y-3">
                  <div className="flex items-center gap-2 text-purple-800 dark:text-purple-300 font-semibold">
                    <Smartphone className="w-4 h-4" />
                    <span>Khalti ePayment v2 Gateway</span>
                  </div>
                  <p className="text-stone-600 dark:text-stone-300 text-[11px] leading-relaxed">
                    You will be redirected to Khalti&apos;s official checkout page via server-side lookup verification for {formatCurrency(grandTotal, currentCurrency)}.
                  </p>
                </div>
              )}

              {paymentMethod === 'onsite' && (
                <div className="p-5 bg-sky-50/50 dark:bg-sky-950/20 rounded-xl border border-sky-200 dark:border-sky-800 text-xs space-y-3">
                  <div className="flex items-center gap-2 text-sky-800 dark:text-sky-300 font-semibold">
                    <Lock className="w-4 h-4" />
                    <span>Guaranteed Reservation with Pay-at-Hotel</span>
                  </div>
                  <p className="text-stone-600 dark:text-stone-300 text-[11px] leading-relaxed">
                    Your room is transactionally locked in the hotel PMS. Settle the balance in Nepali Rupees (NPR), Indian Rupees (INR), US Dollars (USD), or card terminal upon check-in at Kamalpokhari reception.
                  </p>
                </div>
              )}

              {paymentError && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{paymentError}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-stone-200 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 text-xs font-medium text-stone-600 dark:text-stone-300 hover:text-stone-900 rounded flex items-center gap-1.5"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back to Details</span>
                </button>

                <button
                  type="submit"
                  disabled={isProcessing}
                  className={`py-3 px-6 rounded-lg font-semibold text-xs uppercase tracking-wider shadow-md transition-all flex items-center gap-2 ${
                    isProcessing ? 'opacity-70 cursor-wait' : themeClasses.primary
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Processing Reservation...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>
                        {paymentMethod === 'onsite'
                          ? `Confirm Reservation (${formatCurrency(grandTotal, currentCurrency)})`
                          : `Proceed to ${paymentMethod.toUpperCase()} (${formatCurrency(grandTotal, currentCurrency)})`}
                      </span>
                    </>
                  )}
                </button>
              </div>

            </div>
          </form>
        )}

        {/* Step 3: Success Confirmation & Automated Voucher */}
        {step === 3 && (
          <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
            <div className="max-w-2xl mx-auto text-center space-y-3">
              <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <span className="text-xs font-mono font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-widest">
                Payment Authorized & Reservation Guaranteed
              </span>
              <h3 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 dark:text-stone-50">
                Namaste! Your Stay at Kamal Hotel Kathmandu is Confirmed
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300">
                We have registered your booking in our reservation matrix. Automated SMS and Email vouchers have been dispatched.
              </p>
            </div>

            {/* Live Email Confirmation Delivery Status */}
            <div className="max-w-xl mx-auto">
              <div
                className={`p-3.5 rounded-lg border flex items-center justify-between gap-3 text-xs ${
                  confirmationEmailStatus.state === 'sent'
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                    : confirmationEmailStatus.state === 'failed'
                    ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                    : 'bg-stone-50 dark:bg-stone-800/70 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Mail className="w-4 h-4 shrink-0" />
                  <div className="min-w-0">
                    <div className="font-semibold">
                      {confirmationEmailStatus.state === 'sending'
                        ? `Sending confirmation email to ${guestEmail}...`
                        : confirmationEmailStatus.state === 'sent'
                        ? `Confirmation email sent to ${guestEmail}`
                        : confirmationEmailStatus.state === 'unconfigured'
                        ? 'Download or print voucher below'
                        : confirmationEmailStatus.state === 'failed'
                        ? 'Confirmation email delivery issue'
                        : `Voucher ready for ${guestEmail}`}
                    </div>
                    {confirmationEmailStatus.message && (
                      <div className="text-[11px] opacity-85 truncate">
                        {confirmationEmailStatus.message}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono text-[10px] uppercase">
                    {confirmationEmailStatus.state === 'sent' ? 'SMTP Delivered' : 'Voucher Ready'}
                  </span>
                  {confirmedSummary && (
                    <button
                      type="button"
                      disabled={confirmationEmailStatus.state === 'sending'}
                      onClick={() =>
                        dispatchConfirmationEmail(confirmedSummary, confirmedSummary.booking.guestEmail)
                      }
                      className="px-2.5 py-1 rounded border border-current/25 hover:bg-black/5 dark:hover:bg-white/10 text-[11px] font-semibold cursor-pointer disabled:opacity-50"
                    >
                      {confirmationEmailStatus.state === 'sending' ? 'Sending...' : 'Resend Email'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Printable Voucher Card */}
            <div id="printable-voucher-area" className="max-w-xl mx-auto bg-stone-50 dark:bg-stone-800/70 p-6 rounded-xl border border-stone-200 dark:border-stone-700 space-y-4 print:border-none print:shadow-none">
              <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-700">
                <div>
                  <div className="text-[11px] font-mono text-stone-400">OFFICIAL BOOKING REFERENCE</div>
                  <div className="text-xl font-mono font-bold text-amber-700 dark:text-amber-400 tracking-wider">
                    {confirmedBookingCode}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] font-mono text-stone-400">STATUS</div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                    GUARANTEED
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="text-stone-400">Primary Guest</div>
                  <div className="font-semibold text-stone-900 dark:text-stone-100 mt-0.5">{guestName}</div>
                </div>
                <div>
                  <div className="text-stone-400">Accommodation</div>
                  <div className="font-semibold text-stone-900 dark:text-stone-100 mt-0.5">
                    {room.name}
                    {confirmedSummary?.booking.assignedRoomNumber && (
                      <span className="ml-1.5 font-mono text-amber-700 dark:text-amber-400">
                        (Room {confirmedSummary.booking.assignedRoomNumber})
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-stone-400">Check-In Date</div>
                  <div className="font-semibold text-stone-900 dark:text-stone-100 mt-0.5">
                    {checkIn} ({themeConfig.checkInTime})
                  </div>
                </div>
                <div>
                  <div className="text-stone-400">Check-Out Date</div>
                  <div className="font-semibold text-stone-900 dark:text-stone-100 mt-0.5">
                    {checkOut} ({themeConfig.checkOutTime})
                  </div>
                </div>
                <div>
                  <div className="text-stone-400">Total Settled ({currentCurrency})</div>
                  <div className="font-bold text-stone-900 dark:text-stone-100 mt-0.5 tabular-nums">
                    {confirmedSummary?.totalAmountFormatted || formatCurrency(grandTotal, currentCurrency)}
                  </div>
                </div>
                <div>
                  <div className="text-stone-400">Payment Gateway Ref</div>
                  <div className="font-mono text-stone-700 dark:text-stone-300 mt-0.5">
                    {paymentMethod.toUpperCase()} · AUTH# {confirmedSummary?.authCode || 'VERIFY'}
                  </div>
                </div>
              </div>

              {specialRequests && (
                <div className="pt-2 text-xs border-t border-stone-200 dark:border-stone-700">
                  <span className="text-stone-400">Special Notes: </span>
                  <span className="text-stone-700 dark:text-stone-300 italic">{specialRequests}</span>
                </div>
              )}

              <div className="pt-3 border-t border-stone-200 dark:border-stone-700 text-[11px] text-stone-400 flex items-center justify-between">
                <span>Kamal Hotel · {themeConfig.address}</span>
                <span className="font-mono">{themeConfig.contactPhone}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="max-w-xl mx-auto flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handlePrintVoucher}
                className="px-4 py-2.5 text-xs font-semibold rounded border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Print official booking voucher"
              >
                <Printer className="w-4 h-4" />
                <span>Print Official Voucher</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadVoucherPdf}
                className="px-4 py-2.5 text-xs font-semibold rounded border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Download genuine PDF voucher"
              >
                <Download className="w-4 h-4" />
                <span>Download PDF Voucher</span>
              </button>
              <button
                type="button"
                onClick={closeBookingModal}
                className={`px-6 py-2.5 text-xs font-semibold uppercase tracking-wider rounded shadow transition-all ${themeClasses.primary} cursor-pointer`}
              >
                Done
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};

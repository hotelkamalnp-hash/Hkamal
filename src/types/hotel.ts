export type RoomType = 'deluxe' | 'super-deluxe' | 'executive-suite' | 'standard-cozy';
export type CurrencyCode = 'NPR' | 'USD' | 'INR';

export interface Room {
  id: string;
  name: string;
  slug: string;
  type: RoomType;
  pricePerNightUSD: number; // Stored in base USD, converted dynamically
  originalPriceUSD?: number;
  maxGuests: number;
  bedType: string;
  sizeSqFt: number;
  view: string;
  floor: string;
  totalUnits: number;
  availableUnits: number;
  rating: number;
  reviewsCount: number;
  description: string;
  images: string[];
  amenities: string[];
  isFeatured?: boolean;
}

export type BookingStatus = 'confirmed' | 'checked-in' | 'checked-out' | 'cancelled';
export type PaymentStatus = 'paid' | 'pending' | 'refunded';
export type PaymentMethod = 'card' | 'esewa' | 'khalti' | 'onsite';

export interface BookingAddon {
  id: string;
  name: string;
  priceUSD: number;
  description: string;
  selected?: boolean;
}

export interface Booking {
  id: string;
  bookingCode: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  guestCountry: string;
  roomTypeId: string;
  roomName: string;
  roomType: RoomType;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  adults: number;
  children: number;
  addons: BookingAddon[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  currency: CurrencyCode;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  cardLast4?: string;
  bookingStatus: BookingStatus;
  createdAt: string;
  specialRequests?: string;
  smsSent: boolean;
  emailSent: boolean;
  whatsappSent: boolean;
  assignedRoomNumber?: string;
  assignedFloor?: string;
  emailVerified?: boolean;
  verifiedAt?: string;
}

export type StaffRole = 
  | 'super_admin' 
  | 'admin'
  | 'hotel_manager' 
  | 'receptionist' 
  | 'restaurant_owner'
  | 'chef' 
  | 'waiter' 
  | 'housekeeping';

export interface OperationalAlert {
  id: string;
  timestamp: string;
  title: string;
  message: string;
  type: 'booking' | 'check_in' | 'check_out' | 'dining_order' | 'kot' | 'chat' | 'payment' | 'room_assigned' | 'survey_triggered' | 'survey_submitted' | 'wake_up_call' | 'room_service_amenity' | 'vip_checkin';
  targetRoles: (StaffRole | 'all')[];
  isRead: boolean;
  linkTab?: string;
  bookingCode?: string;
  roomNumber?: string;
}

export interface PostCheckoutSurveyRatings {
  cleanliness: number; // 1-5
  staffHospitality: number; // 1-5
  roomComfort: number; // 1-5
  diningExperience: number; // 1-5
  valueForMoney: number; // 1-5
}

export interface PostCheckoutSurvey {
  id: string;
  surveyToken: string;
  bookingCode: string;
  roomNumber: string;
  roomName: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  checkOutDate: string;
  triggeredAt: string;
  channels: ('email' | 'sms')[];
  triggerMode: 'auto_checkout' | 'manual';
  status: 'sent' | 'completed';
  completedAt?: string;
  overallRating?: number; // 1-5
  ratings?: PostCheckoutSurveyRatings;
  npsScore?: number; // 0-10
  wouldRecommend?: boolean;
  comment?: string;
  publishedAsReview?: boolean;
}

export interface StaffUser {
  id: string;
  name: string;
  username: string;
  email: string;
  phone: string;
  password?: string;
  role: StaffRole;
  permissions: string[];
  status: 'active' | 'on-leave' | 'inactive';
  lastActive: string;
  department: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: string;
  action: string;
  category: 'booking' | 'rate' | 'cms' | 'staff' | 'security' | 'payment';
  details: string;
  ipAddress: string;
}

export interface AmenityItem {
  id: string;
  name: string;
  category: 'Dining' | 'Wellness' | 'Connectivity' | 'Services' | 'Convenience';
  description: string;
  iconName: string;
  imageUrl?: string;
  isHighlight?: boolean;
}

export interface GuestReview {
  id: string;
  author: string;
  role: string;
  location: string;
  quote: string;
  rating: number;
  date: string;
  isApproved: boolean;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export type ThemePalette = 
  | 'bright-himalayan-gold'
  | 'luminous-emerald'
  | 'mountain-emerald'
  | 'radiant-terracotta'
  | 'royal-maroon' 
  | 'heritage-bronze' 
  | 'midnight-navy';

export type HeroCtaAction =
  | 'booking_modal'
  | 'guest_portal'
  | 'scroll_rooms'
  | 'scroll_amenities'
  | 'scroll_dining'
  | 'scroll_heritage'
  | 'scroll_location'
  | 'scroll_faq'
  | 'external_url';

export type HeroCtaVariant = 'primary' | 'amber_outline' | 'glass_light';

export interface HeroCtaButton {
  id: string;
  label: string;
  action: HeroCtaAction;
  variant: HeroCtaVariant;
  url?: string;
  enabled: boolean;
}

export interface HotelThemeConfig {
  palette: ThemePalette;
  fontFamily: 'garamond' | 'playfair' | 'jakarta';
  hotelName: string;
  starRating: number;
  tagline: string;
  heroHeadline: string;
  heroSubheadline: string;
  contactEmail: string;
  contactPhone: string;
  whatsappNumber: string;
  address: string;
  city: string;
  neighborhood: string;
  latitude: number;
  longitude: number;
  googleMapsUrl: string;
  googleReviewUrl: string;
  facebookUrl: string;
  tiktokUrl: string;
  instagramUrl: string;
  checkInTime: string;
  checkOutTime: string;
  defaultCurrency: CurrencyCode;
  exchangeRates: {
    USD: number;
    NPR: number;
    INR: number;
  };
  seasonalSurgeMultiplier: number;
  taxRatePercent: number;
  heroImage: string;
  announcementText: string;
  enableAnnouncement: boolean;
  
  // Bright Look & Landing Page CMS Controls
  brightnessMode?: 'ultra-bright' | 'warm-sunlit' | 'classic';
  heroOverlayOpacity?: number; // 0.15 to 0.70
  heroLayoutMode?: 'full_bleed' | 'centered_classic' | 'architectural_showcase';
  heroBackgroundFit?: 'whole_building' | 'cover';
  heroImagePosition?: 'center' | 'top' | 'bottom';
  enableHeroParallax?: boolean;
  heroKickerBadge?: string;
  heroCtaPrimaryText?: string;
  heroCtaSecondaryText?: string;
  heroCtaButtons?: HeroCtaButton[];
  enablePromoBanner?: boolean;
  promoBannerType?: 'seasonal_offer' | 'flash_sale';
  promoBannerText?: string;
  promoBannerCode?: string;
  promoBannerCtaLabel?: string;
  promoBannerCtaTarget?: 'rooms' | 'booking_modal' | 'dining';
  enableWeatherWidget?: boolean;
  weatherWidgetPosition?: 'hero_strip' | 'announcement' | 'standalone';

  // Section Visibility Controls
  showHighlightsSection?: boolean;
  showRoomsSection?: boolean;
  showAmenitiesSection?: boolean;
  showHeritageSection?: boolean;
  showReviewsSection?: boolean;
  showFaqSection?: boolean;

  // Key Highlight Metric Counters (Stats Bar)
  stat1Value?: string;
  stat1Label?: string;
  stat2Value?: string;
  stat2Label?: string;
  stat3Value?: string;
  stat3Label?: string;
  stat4Value?: string;
  stat4Label?: string;

  // Heritage & Story Section
  heritageTitle?: string;
  heritageSubtitle?: string;
  heritageStoryP1?: string;
  heritageStoryP2?: string;
  heritageQuote?: string;
  heritageAuthor?: string;
  heritageStat1Number?: string;
  heritageStat1Text?: string;
  heritageStat2Number?: string;
  heritageStat2Text?: string;

  // Section-by-Section Landing Copy & Neighborhood Guide CMS Controls
  roomsSectionSubtitle?: string;
  roomsSectionTitle?: string;
  roomsSectionDescription?: string;
  amenitiesSectionSubtitle?: string;
  amenitiesSectionTitle?: string;
  amenitiesSectionDescription?: string;
  enableNeighborhoodGuide?: boolean;
  neighborhoodGuideSubtitle?: string;
  neighborhoodGuideTitle?: string;
  neighborhoodGuideDescription?: string;
  neighborhoodSearchRadiusMeters?: number;
  reviewsSectionSubtitle?: string;
  reviewsSectionTitle?: string;
  faqSectionSubtitle?: string;
  faqSectionTitle?: string;
  footerDescription?: string;
  footerCopyrightText?: string;

  // Rooftop Dining specific
  rooftopDiningStatus: 'opening_soon' | 'open' | 'renovation';
  rooftopOpeningDateText: string;
  rooftopTeaserHeadline: string;
  rooftopTeaserDescription: string;
  rooftopDiningImage: string;

  // Supabase Integration
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseConnected: boolean;

  // Multi-Hotel White-Label & Compliance
  hotelLegalName?: string;
  panVatNumber?: string;
  officialEmail?: string;
  receptionPhone?: string;
  totalFloorsCount?: number;
  smtpSettings?: SmtpConfig;
}

export interface SmtpConfig {
  providerPreset?: 'gmail' | 'sendgrid' | 'resend' | 'outlook' | 'custom';
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword?: string;
  senderEmail: string;
  senderName: string;
  replyToEmail?: string;
  notificationEmail?: string;
  encryption: 'ssl' | 'tls' | 'none';
  sendBookingConfirmationEmail?: boolean;
  requireRealEmailOtp?: boolean;
  otpExpiryMinutes?: number;
  emailSubjectPrefix?: string;
  isConfigured: boolean;
  lastTestedAt?: string;
  lastTestStatus?: 'success' | 'failed';
  lastTestMessage?: string;
}

export interface ParsedMenuItemRow {
  name: string;
  category: MenuItemCategory;
  description: string;
  priceUSD: number;
  isVegetarian: boolean;
  isSpicy: boolean;
  isChefSpecial: boolean;
  preparationTimeMinutes: number;
  status: 'valid' | 'invalid';
  error?: string;
}

export interface NotificationRecord {
  id: string;
  timestamp: string;
  recipient: string;
  channel: 'email' | 'sms' | 'whatsapp' | 'push';
  subject: string;
  message: string;
  status: 'delivered' | 'sent' | 'pending';
  bookingCode?: string;
}

export interface CSRChatMessage {
  id: string;
  sender: 'guest' | 'concierge' | 'bot' | 'receptionist' | 'waiter';
  roomNumber?: string;
  guestName?: string;
  text: string;
  time: string;
  serviceTag?: 'room_service' | 'housekeeping' | 'concierge' | 'front_desk';
}

// ----------------- RESTAURANT & DINING -----------------
export type MenuItemCategory = 'Starters' | 'Main Course' | 'Nepali Heritage & Newari' | 'Himalayan Specials' | 'Rooftop Bar & Beverages' | 'Desserts';

export interface MenuItem {
  id: string;
  name: string;
  category: MenuItemCategory;
  description: string;
  priceUSD: number;
  imageUrl?: string;
  isVegetarian: boolean;
  isSpicy?: boolean;
  isChefSpecial?: boolean;
  available: boolean;
  preparationTimeMinutes: number;
}

export type OrderStatus = 'placed' | 'confirmed_by_waiter' | 'preparing' | 'ready_for_delivery' | 'delivered' | 'cancelled';
export type OrderDestination = 'room' | 'rooftop_table' | 'courtyard';

export interface RestaurantOrderItem {
  menuItemId: string;
  name: string;
  quantity: number;
  unitPriceUSD: number;
  specialInstructions?: string;
}

export interface RestaurantOrder {
  id: string;
  orderNumber: string;
  roomNumber: string;
  guestName: string;
  guestPhone?: string;
  destination: OrderDestination;
  tableOrRoomNo: string;
  items: RestaurantOrderItem[];
  subtotalUSD: number;
  taxUSD: number;
  serviceChargeUSD: number;
  totalAmountUSD: number;
  status: OrderStatus;
  createdAt: string;
  waiterAssigned?: string;
  kitchenNotes?: string;
  paymentMode: 'charge_to_room' | 'cash_on_delivery' | 'card_online';
}

// ----------------- INVENTORY & STOCK -----------------
export type StockCategory = 'Kitchen Ingredients' | 'Beverages & Bar' | 'Housekeeping & Toiletries' | 'Linen & Bedding' | 'Maintenance & Solar' | 'Front Office Stationery';

export interface StockItem {
  id: string;
  name: string;
  category: StockCategory;
  sku: string;
  currentStock: number;
  minThreshold: number; // Low stock alert trigger
  unit: string; // 'kg', 'bottles', 'packs', 'pieces', 'liters', etc.
  costPerUnitUSD: number;
  lastRestockedDate: string;
  supplierName: string;
  supplierContact: string;
  location: string;
}

// ----------------- BILLING & INVOICE TEMPLATES -----------------
export type InvoiceTemplateId = 'heritage-gold' | 'executive-modern' | 'minimalist-clean' | 'regal-himalayan' | 'compact-pos-thermal';

export interface BillSettings {
  template: InvoiceTemplateId;
  hotelLogoUrl: string;
  hotelLegalName: string;
  panVatNumber: string;
  taxLabel: string; // e.g. "Nepal VAT" or "Tax"
  taxPercent: number; // e.g. 13% VAT
  serviceChargeLabel: string; // e.g. "Hotel Service Surcharge"
  serviceChargePercent: number; // e.g. 10% Service Charge
  defaultDiscountPercent: number;
  discountReasonPlaceholder: string;
  footerNote: string;
  showQrCodeForPayment: boolean;
  showBreakdownByService: boolean;
  termsAndConditions: string;
  contactSupportPhone: string;
  contactEmail: string;
  addressLine: string;
  authorizedSignatoryName: string;
  authorizedSignatoryTitle: string;
  currencyFormat: 'NPR' | 'USD' | 'INR' | 'auto';
  watermarkText?: string;
  accentColor?: string; // Optional custom accent hex for template
}

export interface BillItemLine {
  id: string;
  description: string;
  category: 'room_stay' | 'restaurant_dining' | 'laundry' | 'airport_transfer' | 'spa_wellness' | 'minibar' | 'other';
  date: string;
  quantity: number;
  rateUSD: number;
  amountUSD: number;
}

export interface MasterInvoice {
  id: string;
  invoiceNumber: string;
  bookingCode: string;
  roomNumber: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  guestAddress?: string;
  guestPanVat?: string;
  checkInDate: string;
  checkOutDate: string;
  issuedAt: string;
  items: BillItemLine[];
  subtotalUSD: number;
  discountPercent: number;
  discountAmountUSD: number;
  serviceChargePercent: number;
  serviceChargeAmountUSD: number;
  taxPercent: number;
  taxAmountUSD: number;
  grandTotalUSD: number;
  amountPaidUSD: number;
  balanceDueUSD: number;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  notes?: string;
}

// ----------------- IN-HOUSE GUEST STAY PASSCODE -----------------
export interface GuestRoomSession {
  roomNumber: string;
  bookingCode: string;
  guestName: string;
  passcode: string; // Dynamically generated random PIN e.g. 4829
  checkInDate: string;
  checkOutDate: string;
  isActive: boolean;
  createdAt: string;
  expiresAt: string;
}

// ----------------- FINANCIAL ACCOUNTING -----------------
export type AccountingPeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface AccountingSummary {
  period: AccountingPeriod;
  dateLabel: string;
  roomStayRevenueUSD: number;
  restaurantRevenueUSD: number;
  servicesRevenueUSD: number;
  totalGrossRevenueUSD: number;
  taxCollectedUSD: number;
  serviceChargeCollectedUSD: number;
  discountsGivenUSD: number;
  expensesUSD: number;
  netOperatingIncomeUSD: number;
  totalInvoicesCount: number;
  paidInvoicesCount: number;
  pendingInvoicesCount: number;
}

// ----------------- COUPONS & PROMO VOUCHERS -----------------
export type CouponDiscountType = 'percentage' | 'fixed_amount';
export type CouponServiceScope = 'all' | 'rooms' | 'dining' | 'spa_services';

export interface HotelCoupon {
  id: string;
  code: string; // e.g. WELCOME2026, ROOFTOP15, HIMALAYANVIP
  description: string;
  discountType: CouponDiscountType;
  discountValue: number; // e.g. 15 for 15% or 20 for $20
  applicableTo: CouponServiceScope;
  minSpendUSD?: number;
  maxDiscountUSD?: number;
  validFrom: string;
  validUntil: string;
  usageLimit?: number;
  timesUsed: number;
  isActive: boolean;
  createdBy?: string;
}

// ----------------- RESTAURANT TABLE MANAGEMENT -----------------
export type TableStatus = 'vacant' | 'seated' | 'order_placed' | 'billed' | 'reserved';
export type TableZone = 'rooftop' | 'courtyard' | 'banquet';

export interface RestaurantTable {
  id: string;
  tableNumber: string; // e.g. 'T-01', 'T-02'
  zone: TableZone;
  capacity: number;
  status: TableStatus;
  currentOrderId?: string;
  guestName?: string;
  waiterName?: string;
  seatedAt?: string;
  notes?: string;
}

// ----------------- HOUSEKEEPING & ROOM OPERATIONS -----------------
export type RoomCleanlinessStatus = 'clean' | 'dirty' | 'in_progress' | 'inspected' | 'out_of_order' | 'do_not_disturb';

export interface RoomOperationalUnit {
  id: string;
  roomNumber: string; // e.g. '101', '102', '201', '301'
  floor: string;
  roomType: RoomType;
  occupancyStatus: 'vacant' | 'occupied' | 'reserved';
  cleanStatus: RoomCleanlinessStatus;
  assignedHousekeeper?: string;
  currentGuestName?: string;
  currentBookingCode?: string;
  checkInDate?: string;
  checkOutDate?: string;
  lastCleanedAt?: string;
  inspectedBy?: string;
  dndActive?: boolean;
  maintenanceNote?: string;
  minibarConsumedUSD?: number;
}

export interface LostAndFoundItem {
  id: string;
  referenceId?: string; // e.g. LF-2026-1001
  itemDescription: string;
  category: string;
  roomNumber: string;
  foundBy: string;
  foundDate: string;
  status: 'stored' | 'claimed' | 'disposed';
  storageLocation: string;
  claimedByGuestName?: string;
  claimedByIdNumber?: string;
  claimedAt?: string;
  contactPhone?: string;
  notes?: string;
}

// ----------------- FRONT DESK SHIFT HANDOVER -----------------
export type ShiftType = 'morning' | 'evening' | 'night';

export interface ShiftHandoverLog {
  id: string;
  timestamp: string;
  shift: ShiftType;
  staffName: string;
  cashInDrawerNPR: number;
  unresolvedIssues: string;
  notesForNextShift: string;
  arrivalsExpectedCount: number;
  departuresPendingCount: number;
  inHouseGuestsCount: number;
}

// ----------------- NIGHT AUDIT & DAY-CLOSE -----------------
export interface NightAuditRecord {
  id: string;
  auditDate: string;
  auditorName: string;
  totalRoomsSold: number;
  totalRoomsAvailable: number;
  occupancyPercentage: number;
  roomRevenueUSD: number;
  fAndBRevenueUSD: number;
  servicesRevenueUSD: number;
  totalRevenueUSD: number;
  serviceChargeCollectedUSD: number;
  vatCollectedUSD: number;
  adrUSD: number; // Average Daily Rate
  revParUSD: number; // Revenue Per Available Room
  cashDrawerDiscrepancyUSD: number;
  status: 'closed' | 'in_progress';
  notes?: string;
}

// ----------------- DEPARTMENT SHIFT SCHEDULING & ATTENDANCE -----------------
export type HotelDepartment =
  | 'Reception & Front Desk'
  | 'Housekeeping & Laundry'
  | 'Kitchen & Culinary'
  | 'Restaurant & Banquet'
  | 'Management & Admin';

export type ShiftAttendanceStatus =
  | 'scheduled'
  | 'clocked_in'
  | 'on_break'
  | 'clocked_out'
  | 'on_leave';

export interface StaffShiftAssignment {
  id: string;
  staffId: string;
  staffName: string;
  staffRole: StaffRole;
  department: HotelDepartment;
  date: string; // YYYY-MM-DD
  shiftSlot: ShiftType; // morning | evening | night
  assignedStation: string;
  attendanceStatus: ShiftAttendanceStatus;
  clockInTime?: string;
  clockOutTime?: string;
  notes?: string;
}

export interface StaffAvailabilityEntry {
  id: string;
  staffId: string;
  date: string; // YYYY-MM-DD
  availability: 'available' | 'preferred_morning' | 'preferred_evening' | 'unavailable';
  note?: string;
}

// ----------------- DIGITAL KEYCARD & SMART DOOR ACCESS -----------------
export type DigitalKeyAccessScope = 'room_only' | 'room_and_amenities' | 'vip_all_access';

export interface DigitalKeycard {
  id: string;
  keyToken: string; // Unique signed token e.g. DK-302-8F4A2C
  roomNumber: string; // Normalized room identifier e.g. 'Room 302' or '302'
  guestName: string;
  bookingCode: string;
  accessScope: DigitalKeyAccessScope;
  validFrom: string; // ISO timestamp
  expiresAt: string; // ISO timestamp (time-bound expiration)
  issuedBy: string;
  issuedAt: string;
  status: 'active' | 'revoked' | 'expired';
  unlockCount: number;
  lastUnlockedAt?: string;
}

export interface DoorUnlockEvent {
  id: string;
  roomNumber: string;
  keyToken: string;
  guestName: string;
  timestamp: string;
  result: 'granted' | 'denied_expired' | 'denied_revoked' | 'denied_wrong_room' | 'denied_invalid';
  reason: string;
}

// ----------------- HOUSEKEEPING & FACILITY MAINTENANCE TRACKER -----------------
export type MaintenanceCategory =
  | 'plumbing'
  | 'electrical'
  | 'hvac'
  | 'furniture'
  | 'lock_access'
  | 'housekeeping_damage'
  | 'other';

export type MaintenancePriority = 'low' | 'medium' | 'high' | 'urgent';

export type MaintenanceTicketStatus =
  | 'reported'
  | 'in_repair'
  | 'awaiting_signoff'
  | 'resolved';

export interface MaintenanceTicket {
  id: string;
  ticketCode: string; // e.g. MNT-1024
  unitId: string;
  roomNumber: string;
  floor: string;
  category: MaintenanceCategory;
  priority: MaintenancePriority;
  issueTitle: string;
  description: string;
  reportedBy: string;
  reportedByRole: StaffRole;
  reportedAt: string;
  status: MaintenanceTicketStatus;
  previousCleanStatus: RoomCleanlinessStatus;
  assignedTechnician?: string;
  repairNotes?: string;
  confirmedByManager?: string;
  resolvedAt?: string;
}

// ----------------- KAMAL REWARDS LOYALTY SYSTEM -----------------
export type LoyaltyTier = 'Silver Explorer' | 'Gold Himalayan' | 'Platinum Summit';

export type LoyaltyTransactionType =
  | 'booking_earn'
  | 'dining_earn'
  | 'manual_credit'
  | 'manual_debit'
  | 'reward_redeemed';

export interface LoyaltyPointTransaction {
  id: string;
  timestamp: string;
  type: LoyaltyTransactionType;
  pointsDelta: number;
  balanceAfter: number;
  reason: string;
  bookingCode?: string;
  adjustedBy?: string;
}

export interface KamalRewardsMember {
  id: string;
  memberNumber: string; // e.g. KR-2026-0101
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  pointsBalance: number;
  lifetimePointsEarned: number;
  tier: LoyaltyTier;
  joinedAt: string;
  transactions: LoyaltyPointTransaction[];
}

// ----------------- IN-ROOM WAKE-UP CALL SCHEDULER -----------------
export type WakeUpCallStatus = 'scheduled' | 'alerted' | 'acknowledged' | 'completed' | 'cancelled';

export type WakeUpDeliveryMethod = 'phone_ring' | 'in_person_knock' | 'both';

export interface WakeUpCallRequest {
  id: string;
  requestCode: string; // e.g. WK-1042
  roomNumber: string;
  bookingCode: string;
  guestName: string;
  wakeUpDate: string; // YYYY-MM-DD
  wakeUpTime: string; // HH:mm (24h)
  repeatDaily: boolean;
  deliveryMethod: WakeUpDeliveryMethod;
  beveragePreference?: string;
  notes?: string;
  status: WakeUpCallStatus;
  requestedAt: string;
  acknowledgedBy?: string;
  completedBy?: string;
  completedAt?: string;
}

// ----------------- HOUSEKEEPING CHECKLIST: DEEP CLEANING & FLOOR SUPPLIES -----------------
export type DeepCleanFrequency = 'weekly' | 'biweekly' | 'monthly' | 'post_long_stay';

export type DeepCleanStatus = 'scheduled' | 'in_progress' | 'completed' | 'overdue';

export interface DeepCleaningChecklistItem {
  id: string;
  label: string;
  completed: boolean;
}

export interface DeepCleaningSchedule {
  id: string;
  scheduleCode: string; // e.g. DC-201
  unitId: string;
  roomNumber: string;
  floor: string;
  scheduledDate: string; // YYYY-MM-DD
  frequency: DeepCleanFrequency;
  assignedHousekeeper: string;
  status: DeepCleanStatus;
  tasks: DeepCleaningChecklistItem[];
  notes?: string;
  completedAt?: string;
}

export type FloorSupplyCategory = 'linens' | 'toiletries' | 'minibar_amenities' | 'cleaning_agents';

export interface FloorSupplyItem {
  id: string;
  floor: string;
  itemName: string;
  category: FloorSupplyCategory;
  currentStock: number;
  parLevel: number;
  unit: string;
  lastRestockedAt: string;
  updatedBy: string;
}

// ----------------- EXPRESS ROOM TURNOVER WORKFLOW -----------------
export type ExpressTurnoverPriority = 'rush_vip' | 'same_day_arrival' | 'standard';

export type ExpressTurnoverStepCategory =
  | 'strip_linen'
  | 'sanitize_bath'
  | 'fresh_bedding'
  | 'amenities_minibar'
  | 'supervisor_qa';

export interface ExpressTurnoverStep {
  id: string;
  stepOrder: number;
  label: string;
  category: ExpressTurnoverStepCategory;
  completed: boolean;
  completedAt?: string;
}

export interface ExpressTurnoverJob {
  id: string;
  jobCode: string; // e.g. ET-103
  unitId: string;
  roomNumber: string;
  floor: string;
  priority: ExpressTurnoverPriority;
  assignedHousekeeper: string;
  triggeredBy: string;
  triggeredAt: string;
  targetReadyTime: string;
  status: 'pending' | 'in_progress' | 'completed';
  steps: ExpressTurnoverStep[];
  completedAt?: string;
  notes?: string;
}

// ----------------- IN-ROOM SERVICE AMENITY REQUESTS -----------------
export type RoomServiceAmenityCategory =
  | 'towels_linens'
  | 'pillows_bedding'
  | 'toiletries'
  | 'beverages_ice'
  | 'housekeeping_service'
  | 'other';

export type RoomServiceRequestStatus =
  | 'pending'
  | 'acknowledged'
  | 'in_progress'
  | 'delivered'
  | 'cancelled';

export interface RoomServiceAmenityItemRequest {
  name: string;
  quantity: number;
  category: RoomServiceAmenityCategory;
}

export interface RoomServiceRequest {
  id: string;
  requestCode: string; // e.g. RS-302-104
  roomNumber: string;
  bookingCode: string;
  guestName: string;
  items: RoomServiceAmenityItemRequest[];
  priority: 'normal' | 'urgent';
  preferredTime?: string;
  notes?: string;
  status: RoomServiceRequestStatus;
  requestedAt: string;
  assignedHousekeeper?: string;
  completedAt?: string;
}

// ----------------- VIP GUEST FLAGGING & CHECK-IN ALERTS -----------------
export type VipTier = 'returning_vip' | 'high_value' | 'vvip_executive' | 'corporate_account';

export interface VipGuestProfile {
  id: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  tier: VipTier;
  staysCount: number;
  lifetimeSpendUSD: number;
  preferences: string;
  alertMessage: string;
  flaggedBy: string;
  flaggedAt: string;
  isActive: boolean;
  lastAlertTriggeredAt?: string;
}



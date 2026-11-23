import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  Room,
  RoomType,
  Booking,
  StaffUser,
  AuditLog,
  AmenityItem,
  HotelThemeConfig,
  NotificationRecord,
  StaffRole,
  PaymentStatus,
  PaymentMethod,
  BookingStatus,
  CurrencyCode,
  GuestReview,
  FaqItem,
  MenuItem,
  MenuItemCategory,
  RestaurantOrder,
  StockItem,
  BillSettings,
  MasterInvoice,
  BillItemLine,
  GuestRoomSession,
  CSRChatMessage,
  HotelCoupon,
  CouponDiscountType,
  CouponServiceScope,
  RestaurantTable,
  TableStatus,
  RoomOperationalUnit,
  RoomCleanlinessStatus,
  LostAndFoundItem,
  ShiftHandoverLog,
  NightAuditRecord,
  OperationalAlert,
  SmtpConfig,
  ParsedMenuItemRow,
  PostCheckoutSurvey,
  PostCheckoutSurveyRatings,
  HotelDepartment,
  ShiftAttendanceStatus,
  StaffShiftAssignment,
  StaffAvailabilityEntry,
  ShiftType,
  DigitalKeycard,
  DigitalKeyAccessScope,
  DoorUnlockEvent,
  MaintenanceCategory,
  MaintenancePriority,
  MaintenanceTicketStatus,
  MaintenanceTicket,
  LoyaltyTier,
  LoyaltyTransactionType,
  LoyaltyPointTransaction,
  KamalRewardsMember,
  WakeUpCallStatus,
  WakeUpDeliveryMethod,
  WakeUpCallRequest,
  DeepCleanFrequency,
  DeepCleanStatus,
  DeepCleaningChecklistItem,
  DeepCleaningSchedule,
  FloorSupplyCategory,
  FloorSupplyItem,
  ExpressTurnoverPriority,
  ExpressTurnoverStep,
  ExpressTurnoverJob,
  RoomServiceAmenityItemRequest,
  RoomServiceRequestStatus,
  RoomServiceRequest,
  VipTier,
  VipGuestProfile,
} from '../types/hotel';
import { convertPrice, formatCurrency } from '../utils/theme';
import { getSupabaseClient, testSupabaseConnection } from '../services/supabase';
import { queryClient } from '../services/queryClient';
import { performanceTracker } from '../services/performanceTracker';
import {
  INITIAL_MENU_ITEMS,
  INITIAL_STOCK_ITEMS,
  INITIAL_BILL_SETTINGS,
  INITIAL_INVOICES,
  INITIAL_GUEST_SESSIONS,
  INITIAL_TABLES,
  INITIAL_FLOORS,
  INITIAL_ROOM_UNITS,
  INITIAL_LOST_FOUND,
  INITIAL_SHIFTS,
  INITIAL_NIGHT_AUDITS,
  INITIAL_POST_CHECKOUT_SURVEYS,
  INITIAL_STAFF_SHIFTS,
  INITIAL_STAFF_AVAILABILITY,
  INITIAL_DIGITAL_KEYCARDS,
  INITIAL_DOOR_UNLOCK_LOGS,
  INITIAL_MAINTENANCE_TICKETS,
  INITIAL_KAMAL_REWARDS,
  INITIAL_WAKE_UP_CALLS,
  INITIAL_DEEP_CLEANING_SCHEDULES,
  INITIAL_FLOOR_SUPPLIES,
  INITIAL_EXPRESS_TURNOVERS,
  INITIAL_ROOM_SERVICE_REQUESTS,
  INITIAL_VIP_GUEST_PROFILES,
} from '../services/restaurantBillingData';

// Visual assets - bundled via Vite imports for GitHub Pages compatibility
import HERO_IMAGE from '../assets/images/hero_himalayan_boutique_1793983309553.jpg';
import ROOM_DELUXE_IMAGE from '../assets/images/suite_himalayan_deluxe_1793983311349.jpg';
import ROOM_SUITE_IMAGE from '../assets/images/suite_presidential_living_1793983311442.jpg';
import ROOM_FAMILY_IMAGE from '../assets/images/room_deluxe_suite_1793848735141.jpg';
import ROOM_COZY_IMAGE from '../assets/images/room_executive_himalayan_1793848733912.jpg';
import AMENITY_ROOFTOP_IMAGE from '../assets/images/rooftop_candlelight_dining_1793983310740.jpg';

const INITIAL_ROOMS: Room[] = [
  {
    id: 'room-1',
    name: 'Deluxe Heritage Mountain View Room',
    slug: 'deluxe-heritage-mountain-view',
    type: 'deluxe',
    pricePerNightUSD: 55,
    originalPriceUSD: 70,
    maxGuests: 2,
    bedType: '1 King Bed or 2 Twins',
    sizeSqFt: 320,
    view: 'Kamalpokhari Courtyard & Distant Hills',
    floor: '2nd & 3rd Floor',
    totalUnits: 10,
    availableUnits: 7,
    rating: 4.9,
    reviewsCount: 134,
    description:
      'Immerse yourself in serenity in the heart of Kathmandu with hand-carved Nepali woodwork, custom plush mattress, soundproof windows, and en-suite rain shower with continuous hot water.',
    images: [ROOM_DELUXE_IMAGE, ROOM_SUITE_IMAGE, HERO_IMAGE],
    amenities: [
      'High-Speed Optical Wi-Fi',
      'Air Conditioning & Heating',
      'Tea & Highland Coffee Bar',
      'Soundproof Triple-Glazed Windows',
      'Eco Rain Shower (Solar Powered)',
      'Smart TV with Streaming Apps',
      'Kamalpokhari City Map & Travel Guide',
    ],
    isFeatured: true,
  },
  {
    id: 'room-2',
    name: 'Executive Himalayan Heritage Suite',
    slug: 'executive-heritage-suite',
    type: 'executive-suite',
    pricePerNightUSD: 95,
    originalPriceUSD: 125,
    maxGuests: 3,
    bedType: '1 King Bed + Convertible Daybed',
    sizeSqFt: 540,
    view: 'Panoramic Kathmandu Valley & Skyline',
    floor: 'Top Floor with Private Sun Terrace',
    totalUnits: 4,
    availableUnits: 2,
    rating: 5.0,
    reviewsCount: 88,
    description:
      'Our signature top-floor suite featuring an expansive private balcony overlooking Kathmandu, separate parlor lounge with hand-woven rugs, work desk, and luxury Ayurvedic amenities.',
    images: [ROOM_SUITE_IMAGE, ROOM_DELUXE_IMAGE, AMENITY_ROOFTOP_IMAGE],
    amenities: [
      'Private Panoramic Balcony',
      'Separate Living Parlor',
      'Mini-Bar Refrigerator',
      'Deep Soaking Tub & Rain Shower',
      'Complimentary Ground-Floor Breakfast',
      'Ergonomic Work Desk',
      'Welcome Nepali Masala Tea & Fresh Fruit',
    ],
    isFeatured: true,
  },
  {
    id: 'room-3',
    name: 'Super Deluxe Family Veranda Room',
    slug: 'super-deluxe-veranda',
    type: 'super-deluxe',
    pricePerNightUSD: 75,
    originalPriceUSD: 92,
    maxGuests: 4,
    bedType: '2 Queen Beds',
    sizeSqFt: 440,
    view: 'Private Garden Veranda',
    floor: '1st & 2nd Floor',
    totalUnits: 8,
    availableUnits: 5,
    rating: 4.8,
    reviewsCount: 96,
    description:
      'Spacious sanctuary tailored for families and groups visiting Kathmandu. Wide veranda seating facing our botanical courtyard with ample space for luggage and trekking gear.',
    images: [ROOM_FAMILY_IMAGE, ROOM_DELUXE_IMAGE, ROOM_SUITE_IMAGE],
    amenities: [
      'Dual Queen Beds',
      'Botanical Veranda Seating',
      'Electric Kettle with Herbal Infusions',
      'Digital Electronic Safe',
      'Complimentary High-Speed Wi-Fi',
      'Daily Housekeeping Service',
      'Quiet Inner-Courtyard Facing',
    ],
    isFeatured: true,
  },
  {
    id: 'room-4',
    name: 'Standard Cozy City Retreat',
    slug: 'standard-cozy-city-retreat',
    type: 'standard-cozy',
    pricePerNightUSD: 38,
    originalPriceUSD: 48,
    maxGuests: 2,
    bedType: '1 Queen Bed',
    sizeSqFt: 240,
    view: 'Peaceful Courtyard',
    floor: 'Ground & 1st Floor',
    totalUnits: 12,
    availableUnits: 9,
    rating: 4.7,
    reviewsCount: 165,
    description:
      'Smartly appointed, peaceful room designed for mindful travelers, digital nomads, and trekkers stopping in Kathmandu. Features fast Wi-Fi, work desk, and clean private bath.',
    images: [ROOM_COZY_IMAGE, ROOM_DELUXE_IMAGE, ROOM_SUITE_IMAGE],
    amenities: [
      'Comfortable Queen Bed',
      '24/7 Hot Water Shower',
      'Fast Optical Wi-Fi (150 Mbps)',
      'Trekker Luggage Locker',
      'USB Bedside Ports',
      'Complimentary Filtered Water',
    ],
    isFeatured: false,
  },
];

const INITIAL_AMENITIES: AmenityItem[] = [
  {
    id: 'amenity-1',
    name: 'Ground-Floor Garden Restaurant',
    category: 'Dining',
    description:
      'Step into our tranquil ground-floor garden courtyard dining room for organic Himalayan coffees, authentic Nepali plates, and relaxed morning & evening gatherings.',
    iconName: 'Utensils',
    imageUrl: AMENITY_ROOFTOP_IMAGE,
    isHighlight: true,
  },
  {
    id: 'amenity-2',
    name: 'High-Speed Optical Fiber Wi-Fi',
    category: 'Connectivity',
    description:
      'Dedicated enterprise dual-band fiber internet (150+ Mbps) throughout all rooms, lobby, and ground-floor garden with 100% solar and inverter battery backup continuity.',
    iconName: 'Wifi',
    isHighlight: true,
  },
  {
    id: 'amenity-3',
    name: '24/7 Front Desk & Concierge',
    category: 'Services',
    description:
      'Warm local hosts ready around the clock in Kamalpokhari to assist with check-in, Tribhuvan Airport transfers, taxi booking, currency exchange, and Kathmandu city tours.',
    iconName: 'Clock',
    isHighlight: true,
  },
  {
    id: 'amenity-4',
    name: 'Tribhuvan Airport (TIA) Transfer',
    category: 'Convenience',
    description:
      'Located just 15 minutes from Kathmandu International Airport (TIA). Private hotel sedan pickups with meet-and-greet waiting right at the arrivals terminal.',
    iconName: 'Car',
    isHighlight: false,
  },
  {
    id: 'amenity-5',
    name: 'Solar Thermal Hot Showers',
    category: 'Wellness',
    description:
      'Eco-conscious solar thermal water system providing strong piping hot water 24/7 with zero interruption, even during winter months.',
    iconName: 'Sun',
    isHighlight: false,
  },
  {
    id: 'amenity-6',
    name: 'Trekking Safe-Storage & Permits Desk',
    category: 'Services',
    description:
      'Complimentary secure luggage lockup for your travel bags while you are hiking Annapurna or Everest, plus on-site assistance with TIMS and national park permits.',
    iconName: 'ShieldCheck',
    isHighlight: true,
  },
];

const INITIAL_REVIEWS: GuestReview[] = [
  {
    id: 'rev-1',
    author: 'Subash Shrestha',
    role: 'Kathmandu Visitor',
    location: 'Pokhara, Nepal',
    quote: 'The location in Kamalpokhari is unbeatable—walking distance to City Center, Thamel, and Durbar Marg yet tucked away in a quiet street. Warm hospitality and spotlessly clean rooms.',
    rating: 5,
    date: 'October 2026',
    isApproved: true,
  },
  {
    id: 'rev-2',
    author: 'Eleanor Vance',
    role: 'Travel Photographer',
    location: 'California, USA',
    quote: 'Kamal Hotel was our favorite stay in Nepal. The hand-carved Nepali woodwork is gorgeous, the beds are super comfy, and the instant SMS/Email voucher with airport pickup was effortless.',
    rating: 5,
    date: 'November 2026',
    isApproved: true,
  },
  {
    id: 'rev-3',
    author: 'Rajesh & Pooja Agarwal',
    role: 'Family Holiday',
    location: 'Delhi, India',
    quote: 'Very peaceful boutique hotel right near Kamalpokhari pond. Clean rooms, hot showers anytime, and staff were extremely courteous with my parents. Rates in INR made booking very convenient!',
    rating: 5,
    date: 'September 2026',
    isApproved: true,
  },
];

const INITIAL_FAQS: FaqItem[] = [
  {
    id: 'faq-1',
    question: 'Where is Kamal Hotel located in Kathmandu?',
    answer: 'We are situated in Kamalpokhari, Kathmandu, Nepal—just a 2-minute stroll from the historic Kamalpokhari Pond, 5 minutes from City Center Mall, and 12-15 minutes from Tribhuvan International Airport (TIA).',
    category: 'Location',
  },
  {
    id: 'faq-2',
    question: 'When is Ground-Floor Garden Dining open?',
    answer: 'Our peaceful Ground-Floor Garden Restaurant welcomes hotel guests daily from 7:00 AM to 10:30 PM with fresh organic breakfasts, Nepali heritage plates, and seasonal garden refreshments.',
    category: 'Dining',
  },
  {
    id: 'faq-3',
    question: 'Can I pay in Nepali Rupees (NPR), US Dollars (USD), or Indian Rupees (INR)?',
    answer: 'Yes! Our booking engine supports real-time rate display and payment in Nepali Rupees (रू NPR), US Dollars ($ USD), and Indian Rupees (₹ INR). You can pay online via Card, eSewa, or choose Pay at Check-In.',
    category: 'Payment',
  },
  {
    id: 'faq-4',
    question: 'Do you provide airport pickup from Tribhuvan International Airport?',
    answer: 'Yes, we provide private hotel sedan pickups 24/7 for NPR 2,400 ($18 USD). Our driver waits directly outside the arrivals terminal holding a Kamal Hotel namecard.',
    category: 'Services',
  },
];

const DEFAULT_HERO_CTA_BUTTONS: HotelThemeConfig['heroCtaButtons'] = [
  {
    id: 'cta-reserve',
    label: 'Book Your Stay',
    action: 'booking_modal',
    variant: 'primary',
    enabled: true,
  },
  {
    id: 'cta-rooms',
    label: 'Explore Suites',
    action: 'scroll_rooms',
    variant: 'glass_light',
    enabled: true,
  },
];

const INITIAL_THEME: HotelThemeConfig = {
  palette: 'bright-himalayan-gold',
  brightnessMode: 'warm-sunlit',
  heroOverlayOpacity: 0.38,
  heroLayoutMode: 'full_bleed',
  heroBackgroundFit: 'cover',
  heroImagePosition: 'center',
  enableHeroParallax: true,
  fontFamily: 'garamond',
  hotelName: 'Kamal Hotel',
  starRating: 3,
  tagline: 'Authentic Himalayan Warmth & Peaceful Boutique Comfort',
  heroHeadline: 'Boutique Serenity in Kathmandu',
  heroSubheadline:
    'Warm Nepali comfort, solar hot water, and ground-floor dining beside Kamalpokhari.',
  heroKickerBadge: 'Kamalpokhari · Kathmandu',
  heroCtaPrimaryText: 'Book Your Stay',
  heroCtaSecondaryText: 'Explore Suites',
  heroCtaButtons: DEFAULT_HERO_CTA_BUTTONS,
  enablePromoBanner: true,
  promoBannerType: 'seasonal_offer',
  promoBannerText: 'Direct booking offer: 10% off flexible suite stays',
  promoBannerCode: 'HIMALAYA10',
  promoBannerCtaLabel: 'Apply Offer',
  promoBannerCtaTarget: 'rooms',
  enableWeatherWidget: true,
  weatherWidgetPosition: 'hero_strip',
  showHighlightsSection: true,
  showRoomsSection: true,
  showAmenitiesSection: true,
  showHeritageSection: true,
  showReviewsSection: true,
  showFaqSection: true,
  enableNeighborhoodGuide: true,
  stat1Value: '360°',
  stat1Label: 'Mountain & Valley Views',
  stat2Value: '100%',
  stat2Label: 'Solar Power & Hot Water',
  stat3Value: '4.9 ★',
  stat3Label: 'Google Guest Rating',
  stat4Value: '24/7',
  stat4Label: 'Front Desk & Concierge',
  heritageTitle: 'A Calm Retreat in Kamalpokhari',
  heritageSubtitle: 'Kathmandu Valley Living',
  heritageStoryP1:
    'Set beside the peaceful Kamalpokhari lotus pond, Kamal Hotel offers sunlit rooms with handcrafted Nepali woodwork just minutes from City Center, Thamel, and Durbar Marg.',
  heritageStoryP2:
    'Our boutique stay pairs warm Nepalese hospitality with fiber Wi-Fi, 100% solar hot water, ground-floor cuisine, and 24/7 concierge care.',
  heritageQuote:
    '“Atithi Devo Bhava” — Every guest is welcomed like family.',
  heritageAuthor: 'Hosts & Concierge Team, Kamal Hotel',
  heritageStat1Number: '2 Mins',
  heritageStat1Text: 'Walk to Kamalpokhari Pond & City Center',
  heritageStat2Number: '15 Mins',
  heritageStat2Text: 'Drive to Tribhuvan International Airport (TIA)',
  contactEmail: 'hotelkamal.np@gmail.com',
  contactPhone: '+977 1 4422589',
  whatsappNumber: '+977 9851023456',
  address: 'Kamalpokhari Marg, Ward No. 1, Kathmandu 44600, Nepal',
  city: 'Kathmandu',
  neighborhood: 'Kamalpokhari, Central Kathmandu',
  latitude: 27.7123,
  longitude: 85.3240,
  googleMapsUrl: 'https://maps.google.com/?q=Kamalpokhari,+Kathmandu,+Nepal',
  googleReviewUrl: 'https://search.google.com/local/writereview?placeid=ChIJkamalhotel_ktm',
  facebookUrl: 'https://facebook.com/kamalhotelkathmandu',
  tiktokUrl: 'https://tiktok.com/@kamalhotelkathmandu',
  instagramUrl: 'https://instagram.com/kamalhotel.np',
  checkInTime: '02:00 PM',
  checkOutTime: '12:00 PM',
  defaultCurrency: 'NPR',
  exchangeRates: {
    USD: 1,
    NPR: 135,
    INR: 84.5,
  },
  seasonalSurgeMultiplier: 1.0,
  taxRatePercent: 13,
  heroImage: HERO_IMAGE,
  announcementText: 'Namaste! Book direct for best flexible rates and welcome Himalayan tea.',
  enableAnnouncement: true,

  // Ground-Floor Dining
  rooftopDiningStatus: 'open',
  rooftopOpeningDateText: 'Open Daily · 7:00 AM – 10:30 PM',
  rooftopTeaserHeadline: 'Ground-Floor Garden Dining',
  rooftopTeaserDescription:
    'Peaceful ground-floor courtyard dining featuring highland coffee, Nepali heritage classics, and garden tranquility in Kamalpokhari.',
  rooftopDiningImage: AMENITY_ROOFTOP_IMAGE,

  // Supabase
  supabaseUrl: (import.meta.env.VITE_SUPABASE_URL as string) || '',
  supabaseAnonKey: (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '',
  supabaseConnected: Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY),

  // Customizable Section Headings, Neighborhood Guide & Footer Copy
  roomsSectionSubtitle: 'Suites & Rooms',
  roomsSectionTitle: 'Stay in Comfort',
  roomsSectionDescription:
    'Quiet suites crafted with Nepali woodwork, solar hot showers, and peaceful courtyard views.',
  amenitiesSectionSubtitle: 'Dining & Facilities',
  amenitiesSectionTitle: 'Ground-Floor Dining & Essentials',
  amenitiesSectionDescription:
    'Fiber Wi-Fi with solar backup, airport pickup, and ground-floor courtyard hospitality.',
  neighborhoodGuideSubtitle: 'Location & Guide',
  neighborhoodGuideTitle: 'Around Kamalpokhari',
  neighborhoodGuideDescription:
    'Steps from Kamalpokhari lotus pond, minutes from Thamel, Durbar Marg, and Tribhuvan International Airport.',
  neighborhoodSearchRadiusMeters: 1200,
  reviewsSectionSubtitle: 'Verified Guest Impressions',
  reviewsSectionTitle: 'Loved by Travelers in Kathmandu',
  faqSectionSubtitle: 'Guest Assistance',
  faqSectionTitle: 'Frequently Asked Questions',
  footerDescription:
    'Authentic 3-star boutique accommodation in Kamalpokhari, Kathmandu. Dedicated to peaceful Himalayan hospitality, high-speed fiber internet, and ground-floor garden dining.',
};

const INITIAL_STAFF: StaffUser[] = [
  {
    id: 'staff-1',
    name: 'Kamal Dev Sharma',
    username: 'superadmin',
    email: 'hotelkamal.np@gmail.com',
    phone: '+977 9851023456',
    role: 'super_admin',
    permissions: [
      'all_access',
      'manage_staff',
      'edit_cms',
      'modify_rates',
      'manage_bookings',
      'manage_rooms',
      'view_finances',
      'view_audit_logs',
      'supabase_sync',
    ],
    status: 'active',
    lastActive: 'Just now',
    department: 'Platform Ownership & IT',
  },
  {
    id: 'staff-admin',
    name: 'Bijay K. Shrestha (Hotel Admin)',
    username: 'admin',
    email: 'admin@kamalhotel.np',
    phone: '+977 9841239871',
    role: 'admin',
    permissions: [
      'edit_cms',
      'modify_rates',
      'manage_bookings',
      'manage_rooms',
      'view_finances',
      'manage_coupons',
      'process_checkin',
    ],
    status: 'active',
    lastActive: '5 mins ago',
    department: 'Hotel Administration & Customization',
  },
  {
    id: 'staff-2',
    name: 'Anita Gurung (Hotel Manager)',
    username: 'manager',
    email: 'anita.manager@kamalhotel.np',
    phone: '+977 9841239870',
    role: 'hotel_manager',
    permissions: [
      'manage_bookings',
      'manage_rooms',
      'modify_rates',
      'process_checkin',
      'view_finances',
      'view_audit_logs',
    ],
    status: 'active',
    lastActive: '10 mins ago',
    department: 'Operations & Guest Relations',
  },
  {
    id: 'staff-3',
    name: 'Bikash Adhikari (Front Desk)',
    username: 'receptionist',
    email: 'frontdesk@kamalhotel.np',
    phone: '+977 9813456789',
    role: 'receptionist',
    permissions: ['process_checkin', 'manage_bookings', 'view_availability', 'assign_rooms', 'print_bills'],
    status: 'active',
    lastActive: '3 mins ago',
    department: 'Front Office & Concierge',
  },
  {
    id: 'staff-owner',
    name: 'Siddhartha Bajracharya (Restaurant Owner)',
    username: 'owner',
    email: 'owner.dining@kamalhotel.np',
    phone: '+977 9851122888',
    role: 'restaurant_owner',
    permissions: ['manage_restaurant_pos', 'view_dining_revenue', 'manage_menu_specials', 'view_kot', 'manage_inventory'],
    status: 'active',
    lastActive: '12 mins ago',
    department: 'Ground-Floor Dining & Bar Ownership',
  },
  {
    id: 'staff-4',
    name: 'Ramesh Magar (Head Chef)',
    username: 'chef',
    email: 'chef.ramesh@kamalhotel.np',
    phone: '+977 9801122334',
    role: 'chef',
    permissions: ['view_dining_orders', 'manage_menu_specials', 'view_breakfast_counts'],
    status: 'active',
    lastActive: '15 mins ago',
    department: 'Culinary & Ground-Floor Restaurant',
  },
  {
    id: 'staff-5',
    name: 'Prakash Lama (Service Lead)',
    username: 'waiter',
    email: 'service@kamalhotel.np',
    phone: '+977 9805566778',
    role: 'waiter',
    permissions: ['view_dining_orders', 'room_service_dispatch', 'view_guest_preferences'],
    status: 'active',
    lastActive: '8 mins ago',
    department: 'Restaurant & Banquet Service',
  },
  {
    id: 'staff-6',
    name: 'Sunita Thapa',
    username: 'housekeeping',
    email: 'housekeeping@kamalhotel.np',
    phone: '+977 9803322114',
    role: 'housekeeping',
    permissions: ['manage_rooms_cleanliness', 'view_availability'],
    status: 'active',
    lastActive: '20 mins ago',
    department: 'Housekeeping & Laundry',
  },
];

const INITIAL_BOOKINGS: Booking[] = [
  {
    id: 'bk-101',
    bookingCode: 'KH-2026-9042',
    guestName: 'Eleanor Vance',
    guestEmail: 'eleanor.vance@gmail.com',
    guestPhone: '+1 (415) 890-2341',
    guestCountry: 'United States',
    roomTypeId: 'room-2',
    roomName: 'Executive Himalayan Heritage Suite',
    roomType: 'executive-suite',
    assignedRoomNumber: '302',
    assignedFloor: '3rd Floor',
    checkInDate: '2026-11-05',
    checkOutDate: '2026-11-09',
    nights: 4,
    adults: 2,
    children: 0,
    addons: [
      { id: 'ad-1', name: 'Ground-Floor Himalayan Breakfast Buffet', priceUSD: 8, description: 'Daily breakfast' },
      { id: 'ad-2', name: 'Private Airport Pickup', priceUSD: 18, description: 'Direct pickup' },
    ],
    subtotal: 252,
    taxAmount: 32.76,
    totalAmount: 284.76,
    currency: 'USD',
    paymentStatus: 'paid',
    paymentMethod: 'card',
    cardLast4: '4242',
    bookingStatus: 'checked-in',
    createdAt: '2026-11-01T10:14:00Z',
    specialRequests: 'Upper floor room facing Kamalpokhari quiet side.',
    smsSent: true,
    emailSent: true,
    whatsappSent: true,
  },
  {
    id: 'bk-102',
    bookingCode: 'KH-2026-9055',
    guestName: 'Rajesh & Pooja Agarwal',
    guestEmail: 'rajesh.agarwal@delhi.in',
    guestPhone: '+91 98110 99881',
    guestCountry: 'India',
    roomTypeId: 'room-3',
    roomName: 'Super Deluxe Family Veranda Room',
    roomType: 'super-deluxe',
    assignedRoomNumber: '205',
    assignedFloor: '2nd Floor',
    checkInDate: '2026-11-06',
    checkOutDate: '2026-11-09',
    nights: 3,
    adults: 3,
    children: 1,
    addons: [
      { id: 'ad-2', name: 'Private Airport Pickup', priceUSD: 18, description: 'TIA pickup' },
    ],
    subtotal: 20533,
    taxAmount: 2669,
    totalAmount: 23202,
    currency: 'INR',
    paymentStatus: 'paid',
    paymentMethod: 'card',
    cardLast4: '8821',
    bookingStatus: 'confirmed',
    createdAt: '2026-11-02T14:32:00Z',
    specialRequests: 'Elderly parents with us; ground or 1st floor preferred.',
    smsSent: true,
    emailSent: true,
    whatsappSent: true,
  },
  {
    id: 'bk-103',
    bookingCode: 'KH-2026-9068',
    guestName: 'Subash Shrestha',
    guestEmail: 'subash.pokhara@gmail.com',
    guestPhone: '+977 9841234567',
    guestCountry: 'Nepal',
    roomTypeId: 'room-1',
    roomName: 'Deluxe Heritage Mountain View Room',
    roomType: 'deluxe',
    assignedRoomNumber: '201',
    assignedFloor: '2nd Floor',
    checkInDate: '2026-11-04',
    checkOutDate: '2026-11-07',
    nights: 3,
    adults: 2,
    children: 0,
    addons: [],
    subtotal: 22275,
    taxAmount: 2895,
    totalAmount: 25170,
    currency: 'NPR',
    paymentStatus: 'paid',
    paymentMethod: 'esewa',
    bookingStatus: 'checked-in',
    createdAt: '2026-10-30T09:20:00Z',
    specialRequests: 'Arriving by private car, will need parking.',
    smsSent: true,
    emailSent: true,
    whatsappSent: true,
  },
];

const INITIAL_OPERATIONAL_ALERTS: OperationalAlert[] = [
  {
    id: 'alt-1',
    timestamp: 'Today 10:15',
    title: 'New Guest Booking (Auto-Assigned)',
    message: 'Eleanor Vance reserved Executive Suite (KH-2026-9042). Room 302 assigned.',
    type: 'booking',
    targetRoles: ['super_admin', 'admin', 'hotel_manager', 'receptionist', 'restaurant_owner'],
    isRead: false,
    bookingCode: 'KH-2026-9042',
    roomNumber: '302',
  },
  {
    id: 'alt-2',
    timestamp: 'Today 09:40',
    title: 'Room Service KOT Dispatched',
    message: 'Ground-Floor Table 4 placed Order KHO-4921 (Nepali Khaja Set + Masala Chai). Sent to Kitchen.',
    type: 'dining_order',
    targetRoles: ['super_admin', 'restaurant_owner', 'chef', 'waiter'],
    isRead: false,
  },
  {
    id: 'alt-3',
    timestamp: 'Today 08:30',
    title: 'Guest Check-In Completed',
    message: 'Subash Shrestha checked into Room 201. Digital keycard passcode activated.',
    type: 'check_in',
    targetRoles: ['super_admin', 'admin', 'hotel_manager', 'receptionist', 'restaurant_owner'],
    isRead: true,
    bookingCode: 'KH-2026-9068',
    roomNumber: '201',
  },
];

const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log-1',
    timestamp: '2026-11-04 19:25:00',
    actorName: 'Kamal Dev Sharma',
    actorRole: 'Super Admin',
    action: 'Location & Ground-Floor Dining Configured',
    category: 'cms',
    details: 'Updated address to Kamalpokhari, Kathmandu. Set Ground-Floor Dining to Open status.',
    ipAddress: '103.10.23.41',
  },
  {
    id: 'log-2',
    timestamp: '2026-11-04 18:30:12',
    actorName: 'Kamal Dev Sharma',
    actorRole: 'Super Admin',
    action: 'Multi-Currency Enabled',
    category: 'rate',
    details: 'Enabled NPR, USD, and INR rates with live exchange conversion (1 USD = 135 NPR = 84.5 INR).',
    ipAddress: '103.10.23.41',
  },
  {
    id: 'log-3',
    timestamp: '2026-11-04 15:10:45',
    actorName: 'Anita Gurung',
    actorRole: 'Hotel Manager',
    action: 'Room Inventory Update',
    category: 'booking',
    details: 'Executive Himalayan Suite availability verified after deep cleaning inspection.',
    ipAddress: '103.10.23.44',
  },
];

const INITIAL_COUPONS: HotelCoupon[] = [
  {
    id: 'cp-welcome15',
    code: 'WELCOME2026',
    description: '15% Off all Room Stays & Dining at Kamal Hotel',
    discountType: 'percentage',
    discountValue: 15,
    applicableTo: 'all',
    minSpendUSD: 40,
    validFrom: '2025-01-01',
    validUntil: '2026-12-31',
    usageLimit: 500,
    timesUsed: 42,
    isActive: true,
    createdBy: 'Subash Sharma (Super Admin)',
  },
  {
    id: 'cp-dining10',
    code: 'DINING10',
    description: '$10 USD Flat Voucher for Ground-Floor Garden Dining',
    discountType: 'fixed_amount',
    discountValue: 10,
    applicableTo: 'dining',
    minSpendUSD: 25,
    validFrom: '2025-01-01',
    validUntil: '2026-12-31',
    usageLimit: 200,
    timesUsed: 19,
    isActive: true,
    createdBy: 'Chef Subash (Head Chef)',
  },
  {
    id: 'cp-himalayanvip',
    code: 'HIMALAYANVIP',
    description: '20% Exclusive Privilege on Executive & Presidential Suites',
    discountType: 'percentage',
    discountValue: 20,
    applicableTo: 'rooms',
    minSpendUSD: 100,
    maxDiscountUSD: 150,
    validFrom: '2025-01-01',
    validUntil: '2026-12-31',
    usageLimit: 100,
    timesUsed: 14,
    isActive: true,
    createdBy: 'General Manager',
  },
  {
    id: 'cp-kamal5',
    code: 'KAMAL5',
    description: '5% Instant Direct Website Booking Promo',
    discountType: 'percentage',
    discountValue: 5,
    applicableTo: 'all',
    validFrom: '2025-01-01',
    validUntil: '2027-12-31',
    usageLimit: 1000,
    timesUsed: 88,
    isActive: true,
    createdBy: 'Marketing Team',
  },
];

interface NotificationToast {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

interface HotelContextType {
  rooms: Room[];
  amenities: AmenityItem[];
  bookings: Booking[];
  staff: StaffUser[];
  auditLogs: AuditLog[];
  notifications: NotificationRecord[];
  themeConfig: HotelThemeConfig;
  reviews: GuestReview[];
  faqs: FaqItem[];
  activeRole: StaffRole | 'guest';
  activeUser: StaffUser | null;
  darkMode: boolean;
  currentCurrency: CurrencyCode;
  toasts: NotificationToast[];
  selectedRoomForBooking: Room | null;
  isBookingModalOpen: boolean;
  latestBookingPopup: { booking: Booking; triggeredAt: string } | null;
  dismissBookingPopup: () => void;

  // Restaurant & Dining
  menuItems: MenuItem[];
  restaurantOrders: RestaurantOrder[];
  addMenuItem: (item: Omit<MenuItem, 'id'>) => void;
  updateMenuItem: (id: string, updates: Partial<MenuItem>) => void;
  deleteMenuItem: (id: string) => void;
  placeRestaurantOrder: (order: Omit<RestaurantOrder, 'id' | 'orderNumber' | 'createdAt' | 'status'>) => RestaurantOrder;
  updateOrderStatus: (orderId: string, status: RestaurantOrder['status'], waiterName?: string) => void;

  // Stock & Inventory
  stockItems: StockItem[];
  addStockItem: (item: Omit<StockItem, 'id'>) => void;
  updateStockItem: (id: string, updates: Partial<StockItem>) => void;
  deleteStockItem: (id: string) => void;
  adjustStockQuantity: (id: string, delta: number, reason: string) => void;

  // Billing, Invoicing & Template Customization
  billSettings: BillSettings;
  invoices: MasterInvoice[];
  updateBillSettings: (updates: Partial<BillSettings>) => void;
  generateInvoiceForBooking: (bookingId: string) => MasterInvoice;
  createCustomInvoice: (inv: Omit<MasterInvoice, 'id' | 'invoiceNumber' | 'issuedAt'>) => MasterInvoice;
  updateInvoice: (id: string, updates: Partial<MasterInvoice>) => void;
  addPaymentToInvoice: (invoiceId: string, amount: number, method: PaymentMethod) => void;

  // In-House Guest Room Sessions (Room number + dynamic passcode)
  guestSessions: GuestRoomSession[];
  activeGuestSession: GuestRoomSession | null;
  loginGuestByRoom: (roomNumber: string, passcode: string) => { success: boolean; message: string; session?: GuestRoomSession };
  loginGuestWithDatabase: (roomNumber: string, passcode: string) => Promise<{ success: boolean; message: string; session?: GuestRoomSession }>;
  logoutGuestSession: () => void;
  generateNewRoomPasscode: (roomNumber: string, bookingCode: string, guestName: string) => GuestRoomSession;
  checkoutAndResetRoomPasscode: (roomNumber: string) => void;

  // Intercom & In-Room Guest Chat / VoIP
  guestChatMessages: CSRChatMessage[];
  sendGuestServiceMessage: (text: string, serviceTag?: CSRChatMessage['serviceTag']) => void;
  sendStaffReplyMessage: (text: string, roomNumber: string) => void;
  isVoipCallActive: boolean;
  activeVoipTarget: string | null;
  startVoipCall: (targetRoomOrDept: string) => void;
  endVoipCall: () => void;
  
  // Operational Alerts & Multi-Role Notifications
  operationalAlerts: OperationalAlert[];
  unreadAlertsCount: number;
  dispatchOperationalAlert: (alert: Omit<OperationalAlert, 'id' | 'timestamp' | 'isRead'>) => void;
  markAlertAsRead: (alertId: string) => void;
  markAllAlertsAsRead: () => void;
  clearAlerts: () => void;
  unreadChatMessagesCount: number;

  // Actions
  setDarkMode: (value: boolean) => void;
  setCurrentCurrency: (currency: CurrencyCode) => void;
  setActiveRole: (role: StaffRole | 'guest') => void;
  openBookingModal: (room?: Room) => void;
  closeBookingModal: () => void;
  createBooking: (bookingData: Omit<Booking, 'id' | 'bookingCode' | 'createdAt' | 'smsSent' | 'emailSent' | 'whatsappSent'>) => Booking;
  applyServerCreatedBooking: (payload: {
    booking: Booking;
    invoice?: MasterInvoice | null;
    guestSession?: GuestRoomSession | null;
  }) => void;
  refreshBootstrapFromServer: () => Promise<void>;
  assignRoomToBooking: (bookingId: string, roomNumber: string) => void;
  getAvailableRoomsForType: (roomType: RoomType, excludeBookingId?: string) => RoomOperationalUnit[];
  updateBookingStatus: (bookingId: string, status: BookingStatus) => void;
  updatePaymentStatus: (bookingId: string, status: PaymentStatus) => void;
  markBookingEmailSent: (bookingId: string, sent: boolean) => void;
  resendBookingConfirmationEmail: (booking: Booking) => Promise<{ success: boolean; message: string }>;
  
  // CMS CRUD actions
  updateThemeConfig: (updates: Partial<HotelThemeConfig>) => void;
  addRoom: (room: Omit<Room, 'id'>) => void;
  updateRoom: (roomId: string, updates: Partial<Room>) => void;
  deleteRoom: (roomId: string) => void;
  addAmenity: (amenity: Omit<AmenityItem, 'id'>) => void;
  updateAmenity: (amenityId: string, updates: Partial<AmenityItem>) => void;
  deleteAmenity: (amenityId: string) => void;
  
  // Reviews & FAQs CRUD
  addReview: (review: Omit<GuestReview, 'id' | 'date'>) => void;
  updateReview: (id: string, updates: Partial<GuestReview>) => void;
  deleteReview: (id: string) => void;
  addFaq: (faq: Omit<FaqItem, 'id'>) => void;
  updateFaq: (id: string, updates: Partial<FaqItem>) => void;
  deleteFaq: (id: string) => void;

  // Staff & RBAC Management
  addStaff: (member: Omit<StaffUser, 'id'> & { password?: string }) => Promise<void> | void;
  updateStaffRoleAndPermissions: (staffId: string, role: StaffRole, permissions: string[]) => Promise<void> | void;
  deleteStaff: (staffId: string) => Promise<void> | void;

  // Authentication & Staff Session
  isStaffLoggedIn: boolean;
  isLoginModalOpen: boolean;
  loginModalTargetRole?: StaffRole;
  openLoginModal: (preferredRole?: StaffRole) => void;
  closeLoginModal: () => void;
  loginStaff: (usernameOrEmail: string, password: string) => Promise<{ success: boolean; message: string; user?: StaffUser }>;
  logoutStaff: () => Promise<void> | void;
  changeUserPassword: (userId: string, newPass: string) => Promise<void> | void;

  // Supabase Sync & Connection
  connectSupabase: (url: string, key: string) => Promise<{ success: boolean; message: string }>;
  syncWithSupabase: () => Promise<{ success: boolean; message: string }>;

  // Audit log helper
  addAuditLog: (action: string, category: AuditLog['category'], details: string) => void;
  
  // Toasts
  showToast: (title: string, message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  removeToast: (id: string) => void;

  // Coupons & Promo Vouchers
  coupons: HotelCoupon[];
  addCoupon: (coupon: Omit<HotelCoupon, 'id' | 'timesUsed'>) => void;
  updateCoupon: (id: string, updates: Partial<HotelCoupon>) => void;
  deleteCoupon: (id: string) => void;
  toggleCouponStatus: (id: string) => void;
  validateAndApplyCoupon: (code: string, subtotalUSD: number, serviceScope?: CouponServiceScope) => { valid: boolean; discountAmountUSD: number; coupon?: HotelCoupon; message: string };
  redeemCoupon: (code: string) => boolean;

  // Restaurant Tables
  restaurantTables: RestaurantTable[];
  updateTableStatus: (tableId: string, status: TableStatus, guestName?: string, waiterName?: string, notes?: string) => void;
  clearTable: (tableId: string) => void;
  addRestaurantTable: (table: Omit<RestaurantTable, 'id'>) => void;

  // Housekeeping & Room Turnaround
  roomUnits: RoomOperationalUnit[];
  updateRoomCleanStatus: (unitId: string, cleanStatus: RoomCleanlinessStatus, housekeeper?: string, inspector?: string, notes?: string) => void;
  checkInRoomUnit: (roomNumber: string, guestName: string, bookingCode: string) => void;
  checkOutRoomUnit: (roomNumber: string) => void;

  // Floor & Room Unit Management
  floors: string[];
  addFloor: (floorName: string) => { success: boolean; message: string };
  deleteFloor: (floorName: string) => { success: boolean; message: string };
  addRoomUnit: (unit: Omit<RoomOperationalUnit, 'id'>) => { success: boolean; message: string; unit?: RoomOperationalUnit };
  updateRoomUnit: (unitId: string, updates: Partial<RoomOperationalUnit>) => void;
  deleteRoomUnit: (unitId: string) => { success: boolean; message: string };

  // Lost & Found
  lostAndFound: LostAndFoundItem[];
  addLostFoundItem: (item: Omit<LostAndFoundItem, 'id'>) => LostAndFoundItem;
  updateLostFoundStatus: (
    id: string,
    status: LostAndFoundItem['status'],
    claimedByOrMeta?: string | { claimedByName?: string; claimedByIdNumber?: string; contactPhone?: string }
  ) => void;

  // Front Desk Shift Handover
  shiftHandovers: ShiftHandoverLog[];
  addShiftHandover: (shift: Omit<ShiftHandoverLog, 'id' | 'timestamp'>) => void;

  // Night Audit
  nightAudits: NightAuditRecord[];
  runNightAudit: (auditorName: string, cashDrawerCountedUSD?: number) => NightAuditRecord;

  // Fast Role Switcher & Credential Balancing
  fastSwitchRole: (role: StaffRole | 'guest', staffId?: string) => void;
  updateStaffCredentials: (staffId: string, updates: { username?: string; password?: string; name?: string; role?: StaffRole; status?: 'active' | 'on-leave' | 'inactive'; department?: string }) => Promise<void> | void;
  resetAllHotelDataToDefault: () => void;

  // Tenant Setup, Multi-Hotel Customization & Mail SMTP
  smtpConfig: SmtpConfig;
  updateSmtpConfig: (updates: Partial<SmtpConfig>) => Promise<void> | void;
  testSmtpConnection: (
    testEmail?: string,
    overrideConfig?: Partial<SmtpConfig>
  ) => Promise<{ success: boolean; message: string }>;
  purgeAllDemoData: (options: {
    resetLandingPage?: boolean;
    resetRooms?: boolean;
    resetMenu?: boolean;
    resetTables?: boolean;
    resetStaff?: boolean;
    newHotelName?: string;
    newCity?: string;
    newLegalName?: string;
    newPanVat?: string;
    newEmail?: string;
    newPhone?: string;
    newHeroHeadline?: string;
  }) => void;
  batchImportMenuItems: (items: Omit<MenuItem, 'id'>[], replaceExisting?: boolean) => { imported: number; failed: number };
  addRoomTypeCatalog: (newRoom: Room) => void;
  massGenerateRoomUnits: (floor: string, roomType: RoomType, startNumber: number, count: number) => number;

  // Post-Checkout Guest Satisfaction Surveys (Automated Email/SMS)
  surveys: PostCheckoutSurvey[];
  autoTriggerSurveyOnCheckout: boolean;
  setAutoTriggerSurveyOnCheckout: (enabled: boolean) => void;
  activeSurveyToken: string | null;
  openSurveyModal: (token: string) => void;
  closeSurveyModal: () => void;
  triggerPostCheckoutSurvey: (params: {
    bookingCode: string;
    roomNumber: string;
    roomName: string;
    guestName: string;
    guestEmail: string;
    guestPhone: string;
    checkOutDate?: string;
    channels?: ('email' | 'sms')[];
    triggerMode?: 'auto_checkout' | 'manual';
  }) => PostCheckoutSurvey | null;
  submitGuestSurveyResponse: (
    surveyIdOrToken: string,
    payload: {
      overallRating: number;
      ratings: PostCheckoutSurveyRatings;
      npsScore: number;
      wouldRecommend: boolean;
      comment: string;
    }
  ) => boolean;
  publishSurveyToReviews: (surveyId: string) => void;

  // Department Shift Scheduling & Attendance
  staffShifts: StaffShiftAssignment[];
  staffAvailability: StaffAvailabilityEntry[];
  assignStaffShift: (params: {
    staffId: string;
    department: HotelDepartment;
    date: string;
    shiftSlot: ShiftType;
    assignedStation: string;
    notes?: string;
  }) => StaffShiftAssignment | null;
  clockStaffAction: (shiftId: string, action: 'clock_in' | 'break' | 'resume' | 'clock_out') => void;
  removeStaffShift: (shiftId: string) => void;
  updateStaffAvailability: (
    staffId: string,
    date: string,
    availability: StaffAvailabilityEntry['availability'],
    note?: string
  ) => void;

  // Digital Keycard Generator & Door Lock Reader
  digitalKeycards: DigitalKeycard[];
  doorUnlockLogs: DoorUnlockEvent[];
  issueDigitalKeycard: (params: {
    roomNumber: string;
    guestName: string;
    bookingCode: string;
    accessScope: DigitalKeyAccessScope;
    validFrom?: string;
    expiresAt: string;
  }) => DigitalKeycard;
  revokeDigitalKeycard: (keyId: string) => void;
  extendDigitalKeycard: (keyId: string, extraHours: number) => void;
  verifyAndUnlockDoor: (
    tokenOrPayload: string,
    targetRoomNumber?: string
  ) => {
    granted: boolean;
    result: DoorUnlockEvent['result'];
    message: string;
    keycard?: DigitalKeycard;
  };

  // Maintenance Tracker & Room Out-of-Order Auto-Sync
  maintenanceTickets: MaintenanceTicket[];
  reportMaintenanceIssue: (params: {
    unitId: string;
    category: MaintenanceCategory;
    priority: MaintenancePriority;
    issueTitle: string;
    description: string;
    assignedTechnician?: string;
  }) => MaintenanceTicket | null;
  updateMaintenanceTicketStatus: (
    ticketId: string,
    status: Exclude<MaintenanceTicketStatus, 'resolved'>,
    assignedTechnician?: string,
    repairNotes?: string
  ) => void;
  confirmMaintenanceRepair: (
    ticketId: string,
    nextRoomCleanStatus?: RoomCleanlinessStatus,
    repairNotes?: string
  ) => void;

  // Kamal Rewards Loyalty System
  loyaltyMembers: KamalRewardsMember[];
  getGuestLoyaltyAccount: (
    guestEmail?: string,
    guestName?: string,
    bookingCode?: string
  ) => KamalRewardsMember | undefined;
  adjustLoyaltyPoints: (params: {
    guestName: string;
    guestEmail?: string;
    guestPhone?: string;
    bookingCode?: string;
    pointsDelta: number;
    reason: string;
    transactionType?: LoyaltyTransactionType;
    silentToast?: boolean;
  }) => KamalRewardsMember;
  redeemLoyaltyPerk: (params: {
    guestName: string;
    guestEmail?: string;
    bookingCode?: string;
    costPoints: number;
    perkTitle: string;
  }) => { success: boolean; message: string };

  // In-Room Wake-Up Call Scheduler & Front Desk Alerts
  wakeUpCalls: WakeUpCallRequest[];
  scheduleWakeUpCall: (params: {
    roomNumber: string;
    bookingCode: string;
    guestName: string;
    wakeUpDate: string;
    wakeUpTime: string;
    repeatDaily?: boolean;
    deliveryMethod?: WakeUpDeliveryMethod;
    beveragePreference?: string;
    notes?: string;
  }) => WakeUpCallRequest;
  updateWakeUpCallStatus: (wakeUpId: string, status: WakeUpCallStatus) => void;

  // Housekeeping Checklist: Deep-Cleaning Schedules & Floor Supplies
  deepCleaningSchedules: DeepCleaningSchedule[];
  floorSupplies: FloorSupplyItem[];
  createDeepCleaningSchedule: (params: {
    unitId: string;
    scheduledDate: string;
    frequency: DeepCleanFrequency;
    assignedHousekeeper: string;
    tasks: string[];
    notes?: string;
  }) => DeepCleaningSchedule | null;
  toggleDeepCleanTask: (scheduleId: string, taskId: string) => void;
  updateDeepCleanStatus: (scheduleId: string, status: DeepCleanStatus) => void;
  adjustFloorSupplyStock: (supplyId: string, value: number, mode?: 'delta' | 'set') => void;
  addFloorSupplyItem: (params: {
    floor: string;
    itemName: string;
    category: FloorSupplyCategory;
    currentStock: number;
    parLevel: number;
    unit: string;
  }) => FloorSupplyItem;

  // Express Room Turnover Workflow
  expressTurnovers: ExpressTurnoverJob[];
  triggerExpressTurnover: (params: {
    unitId: string;
    priority: ExpressTurnoverPriority;
    assignedHousekeeper: string;
    targetReadyTime: string;
    notes?: string;
  }) => ExpressTurnoverJob | null;
  toggleExpressTurnoverStep: (jobId: string, stepId: string) => void;
  completeExpressTurnoverJob: (jobId: string) => void;

  // In-Room Amenity Room Service Requests -> Housekeeping Queue
  roomServiceRequests: RoomServiceRequest[];
  submitRoomServiceRequest: (params: {
    roomNumber: string;
    bookingCode: string;
    guestName: string;
    items: RoomServiceAmenityItemRequest[];
    priority?: 'normal' | 'urgent';
    preferredTime?: string;
    notes?: string;
  }) => RoomServiceRequest;
  updateRoomServiceRequestStatus: (
    requestId: string,
    status: RoomServiceRequestStatus,
    assignedHousekeeper?: string
  ) => void;

  // VIP Guest Flagging & Check-In Alerts
  vipGuestProfiles: VipGuestProfile[];
  findVipProfile: (guestEmail?: string, guestName?: string, guestPhone?: string) => VipGuestProfile | undefined;
  flagVipGuest: (params: {
    guestName: string;
    guestEmail: string;
    guestPhone?: string;
    tier: VipTier;
    staysCount?: number;
    lifetimeSpendUSD?: number;
    preferences: string;
    alertMessage: string;
  }) => VipGuestProfile;
  toggleVipGuestActive: (vipId: string) => void;
  removeVipGuestFlag: (vipId: string) => void;
}

const HotelContext = createContext<HotelContextType | undefined>(undefined);

export const normalizeLegacyCopyText = (val: string): string =>
  val
    .replace(/Nepali Heritage & Newari/g, 'Nepali Heritage & Cuisine')
    .replace(/Rooftop Bar & Beverages/g, 'Ground-Floor Bar & Beverages')
    .replace(/Newari comfort/gi, 'Nepali comfort')
    .replace(/Newari woodwork/gi, 'Nepali woodwork')
    .replace(/Newari fusion classics/gi, 'Nepali heritage classics')
    .replace(/Nepali Newari Khaja/gi, 'Nepali Khaja')
    .replace(/Newari Khaja/gi, 'Nepali Khaja')
    .replace(/Newari Samay Baji/gi, 'Nepali Samay Baji')
    .replace(/Himalayan Skyline Rooftop Dining/g, 'Ground-Floor Garden Dining')
    .replace(/Rooftop Dining & Essentials/g, 'Ground-Floor Dining & Essentials')
    .replace(/Rooftop Mountain & City Restaurant/g, 'Ground-Floor Garden Restaurant')
    .replace(/Complimentary Rooftop Breakfast/g, 'Complimentary Ground-Floor Breakfast')
    .replace(/Rooftop Garden Dining/g, 'Ground-Floor Garden Dining')
    .replace(/Rooftop Garden Restaurant/g, 'Ground-Floor Garden Restaurant')
    .replace(/Rooftop Dining & Bar Ownership/g, 'Ground-Floor Dining & Bar Ownership')
    .replace(/Culinary & Rooftop Restaurant/g, 'Culinary & Ground-Floor Restaurant')
    .replace(/rooftop dining/gi, 'ground-floor dining')
    .replace(/rooftop cuisine/gi, 'ground-floor cuisine')
    .replace(/rooftop garden/gi, 'ground-floor garden')
    .replace(/rooftop mountain views/gi, 'ground-floor garden dining');

export const normalizeLegacyMenuCategory = (category: string): MenuItemCategory => {
  if (category === 'Nepali Heritage & Newari') return 'Nepali Heritage & Cuisine';
  if (category === 'Rooftop Bar & Beverages') return 'Ground-Floor Bar & Beverages';
  return category as MenuItemCategory;
};

const sanitizeStoredJson = <T,>(raw: string): T => {
  const cleaned = normalizeLegacyCopyText(raw);
  return JSON.parse(cleaned) as T;
};

export const HotelProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (typeof window !== 'undefined' && !localStorage.getItem('kamal_hotel_copy_v4')) {
    const keysToClean = [
      'kamal_hotel_rooms_v2',
      'kamal_hotel_amenities_v2',
      'kamal_hotel_reviews_v2',
      'kamal_hotel_faqs_v2',
      'kamal_hotel_theme_v2',
      'kamal_hotel_menu_v1',
      'kamal_hotel_coupons_v1',
      'kamal_hotel_staff_v3',
    ];
    keysToClean.forEach((k) => {
      const val = localStorage.getItem(k);
      if (val) {
        try {
          localStorage.setItem(k, normalizeLegacyCopyText(val));
        } catch {
          // ignore storage quota errors
        }
      }
    });
    localStorage.setItem('kamal_hotel_copy_v4', '1');
  }

  const [rooms, setRooms] = useState<Room[]>(() => {
    const saved = localStorage.getItem('kamal_hotel_rooms_v2');
    return saved ? sanitizeStoredJson<Room[]>(saved) : INITIAL_ROOMS;
  });

  const [amenities, setAmenities] = useState<AmenityItem[]>(() => {
    const saved = localStorage.getItem('kamal_hotel_amenities_v2');
    return saved ? sanitizeStoredJson<AmenityItem[]>(saved) : INITIAL_AMENITIES;
  });

  const [bookings, setBookings] = useState<Booking[]>(() => {
    const saved = localStorage.getItem('kamal_hotel_bookings_v2');
    return saved ? JSON.parse(saved) : INITIAL_BOOKINGS;
  });

  const [staff, setStaff] = useState<StaffUser[]>(() => {
    const saved = localStorage.getItem('kamal_hotel_staff_v3');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].username) {
          return parsed.map(({ password: _stripped, ...safe }: any) => safe as StaffUser);
        }
      } catch (e) {}
    }
    return INITIAL_STAFF;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem('kamal_hotel_audit_v2');
    return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
  });

  const [notifications, setNotifications] = useState<NotificationRecord[]>(() => {
    const saved = localStorage.getItem('kamal_hotel_notifications_v2');
    return saved ? JSON.parse(saved) : [];
  });

  const [reviews, setReviews] = useState<GuestReview[]>(() => {
    const saved = localStorage.getItem('kamal_hotel_reviews_v2');
    return saved ? JSON.parse(saved) : INITIAL_REVIEWS;
  });

  const [faqs, setFaqs] = useState<FaqItem[]>(() => {
    const saved = localStorage.getItem('kamal_hotel_faqs_v2');
    return saved ? JSON.parse(saved) : INITIAL_FAQS;
  });

  const [themeConfig, setThemeConfig] = useState<HotelThemeConfig>(() => {
    const saved = localStorage.getItem('kamal_hotel_theme_v2');
    const parsed = saved ? JSON.parse(saved) : {};
    const envUrl = (import.meta.env.VITE_SUPABASE_URL as string) || '';
    const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';
    const visualRefreshFlag = 'kamal_hotel_visual_refresh_v3';
    let resolvedHeroImage: string = parsed.heroImage || HERO_IMAGE;
    if (resolvedHeroImage.startsWith('/assets/')) {
      resolvedHeroImage = `.${resolvedHeroImage}`;
    }

    if (!localStorage.getItem(visualRefreshFlag)) {
      if (
        !parsed.heroImage ||
        String(parsed.heroImage).includes('hotel_kamal_new_look_6cc0fe47') ||
        String(parsed.heroImage).includes('hero_boutique_kathmandu')
      ) {
        resolvedHeroImage = HERO_IMAGE;
      }
      localStorage.setItem(visualRefreshFlag, '1');
    }

    const fullBleedMigrationFlag = 'kamal_hotel_hero_fullbleed_v2';
    let resolvedLayoutMode: 'full_bleed' | 'architectural_showcase' =
      parsed.heroLayoutMode || 'full_bleed';
    if (!localStorage.getItem(fullBleedMigrationFlag)) {
      resolvedLayoutMode = 'full_bleed';
      localStorage.setItem(fullBleedMigrationFlag, '1');
    }

    const isVerbatimLegacyStock =
      parsed.heroHeadline === 'Experience Authentic Himalayan Boutique Hospitality in Kathmandu';

    const resolvedCtaButtons = isVerbatimLegacyStock
      ? DEFAULT_HERO_CTA_BUTTONS
      : Array.isArray(parsed.heroCtaButtons)
      ? parsed.heroCtaButtons
      : [
          {
            id: 'cta-reserve',
            label: parsed.heroCtaPrimaryText || 'Book Your Stay',
            action: 'booking_modal' as const,
            variant: 'primary' as const,
            enabled: true,
          },
          {
            id: 'cta-rooms',
            label: parsed.heroCtaSecondaryText || 'Explore Suites',
            action: 'scroll_rooms' as const,
            variant: 'glass_light' as const,
            enabled: true,
          },
        ];

    // Merge with INITIAL_THEME so newly introduced CMS fields are always available
    const merged: HotelThemeConfig = {
      ...INITIAL_THEME,
      ...parsed,
      ...(isVerbatimLegacyStock
        ? {
            heroKickerBadge: INITIAL_THEME.heroKickerBadge,
            heroHeadline: INITIAL_THEME.heroHeadline,
            heroSubheadline: INITIAL_THEME.heroSubheadline,
            heroCtaPrimaryText: INITIAL_THEME.heroCtaPrimaryText,
            heroCtaSecondaryText: INITIAL_THEME.heroCtaSecondaryText,
          }
        : {}),
      heroImage: resolvedHeroImage,
      heroLayoutMode: resolvedLayoutMode,
      heroBackgroundFit:
        !parsed.heroBackgroundFit || parsed.heroBackgroundFit === 'whole_building'
          ? 'cover'
          : parsed.heroBackgroundFit,
      heroImagePosition: parsed.heroImagePosition || 'center',
      heroCtaButtons: resolvedCtaButtons,
      palette: parsed.palette === 'royal-maroon' || !parsed.palette ? 'bright-himalayan-gold' : parsed.palette,
      brightnessMode: parsed.brightnessMode || 'warm-sunlit',
      heroOverlayOpacity: typeof parsed.heroOverlayOpacity === 'number' ? parsed.heroOverlayOpacity : 0.38,
    };
    return {
      ...merged,
      supabaseUrl: merged.supabaseUrl || envUrl,
      supabaseAnonKey: merged.supabaseAnonKey || envKey,
      supabaseConnected: merged.supabaseConnected || Boolean(merged.supabaseUrl && merged.supabaseAnonKey) || Boolean(envUrl && envKey),
    };
  });

  const [currentCurrency, setCurrentCurrency] = useState<CurrencyCode>(() => {
    return (localStorage.getItem('kamal_hotel_currency') as CurrencyCode) || 'NPR';
  });

  const [activeRole, setActiveRole] = useState<StaffRole | 'guest'>('guest');
  const [activeUser, setActiveUser] = useState<StaffUser | null>(null);
  const [isStaffLoggedIn, setIsStaffLoggedIn] = useState<boolean>(false);

  const hydrateAuthorizedStaffContext = async (role: StaffRole) => {
    if (role === 'super_admin' || role === 'admin' || role === 'hotel_manager') {
      try {
        const staffRes = await fetch('/api/auth/staff', { credentials: 'include' });
        if (staffRes.ok) {
          const staffData = await staffRes.json().catch(() => null);
          if (Array.isArray(staffData?.staff) && staffData.staff.length > 0) {
            setStaff(staffData.staff);
          }
        }
      } catch {
        // Keep current roster if backend offline
      }
    }
    if (role === 'super_admin' || role === 'admin') {
      try {
        const smtpRes = await fetch('/api/settings/smtp', { credentials: 'include' });
        if (smtpRes.ok) {
          const smtpData = await smtpRes.json().catch(() => null);
          if (smtpData?.smtp) {
            setSmtpConfig((prev) => ({
              ...prev,
              ...smtpData.smtp,
              smtpPassword: '',
            }));
          }
        }
      } catch {
        // Ignore fetch failure
      }
    }
  };

  const [backendConnected, setBackendConnected] = useState<boolean>(false);
  const backendAvailableRef = useRef<boolean>(false);

  const persistCollectionItem = (collection: string, id: string, payload: unknown) => {
    if (!backendAvailableRef.current || !id) return;
    fetch(`/api/pms/collection/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    }).catch(() => {});
  };

  const removeCollectionItem = (collection: string, id: string) => {
    if (!backendAvailableRef.current || !id) return;
    fetch(`/api/pms/collection/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      credentials: 'include',
    }).catch(() => {});
  };

  const persistSetting = (settingKey: 'theme' | 'bill' | 'floors', payload: unknown) => {
    if (!backendAvailableRef.current) return;
    fetch(`/api/pms/settings/${settingKey}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    }).catch(() => {});
  };

  const refreshBootstrapFromServer = async () => {
    try {
      const res = await fetch('/api/pms/bootstrap', { credentials: 'include' });
      const contentType = res.headers.get('content-type') || '';
      if (!res.ok || !contentType.includes('application/json')) return;
      const data = await res.json().catch(() => null);
      if (!data?.ok) return;

      backendAvailableRef.current = true;
      setBackendConnected(true);

      if (data.themeConfig) setThemeConfig((prev) => ({ ...prev, ...data.themeConfig }));
      if (data.billSettings) setBillSettings((prev) => ({ ...prev, ...data.billSettings }));
      if (Array.isArray(data.floors)) setFloors(data.floors);
      if (Array.isArray(data.rooms)) setRooms(data.rooms);
      if (Array.isArray(data.amenities)) setAmenities(data.amenities);
      if (Array.isArray(data.reviews)) setReviews(data.reviews);
      if (Array.isArray(data.faqs)) setFaqs(data.faqs);
      if (Array.isArray(data.coupons)) setCoupons(data.coupons);
      if (Array.isArray(data.menuItems)) {
        setMenuItems(
          data.menuItems.map((m: MenuItem) => ({
            ...m,
            category: normalizeLegacyMenuCategory(String(m.category)),
          }))
        );
      }
      if (Array.isArray(data.tables)) setRestaurantTables(data.tables);

      if (data.scope === 'staff') {
        if (Array.isArray(data.roomUnits)) setRoomUnits(data.roomUnits);
        if (Array.isArray(data.bookings)) setBookings(data.bookings);
        if (Array.isArray(data.staff)) setStaff(data.staff);
        if (Array.isArray(data.invoices)) setInvoices(data.invoices);
        if (Array.isArray(data.restaurantOrders)) setRestaurantOrders(data.restaurantOrders);
        if (Array.isArray(data.stockItems)) setStockItems(data.stockItems);
        if (Array.isArray(data.floorSupplies)) setFloorSupplies(data.floorSupplies);
        if (Array.isArray(data.lostAndFound)) setLostAndFound(data.lostAndFound);
        if (Array.isArray(data.shiftHandovers)) setShiftHandovers(data.shiftHandovers);
        if (Array.isArray(data.nightAudits)) setNightAudits(data.nightAudits);
        if (Array.isArray(data.staffShifts)) setStaffShifts(data.staffShifts);
        if (Array.isArray(data.staffAvailability)) setStaffAvailability(data.staffAvailability);
        if (Array.isArray(data.surveys)) setSurveys(data.surveys);
        if (Array.isArray(data.digitalKeycards)) setDigitalKeycards(data.digitalKeycards);
        if (Array.isArray(data.doorUnlockLogs)) setDoorUnlockLogs(data.doorUnlockLogs);
        if (Array.isArray(data.maintenanceTickets)) setMaintenanceTickets(data.maintenanceTickets);
        if (Array.isArray(data.rewardsMembers)) setLoyaltyMembers(data.rewardsMembers);
        if (Array.isArray(data.wakeUpCalls)) setWakeUpCalls(data.wakeUpCalls);
        if (Array.isArray(data.deepCleaningSchedules)) setDeepCleaningSchedules(data.deepCleaningSchedules);
        if (Array.isArray(data.expressTurnovers)) setExpressTurnovers(data.expressTurnovers);
        if (Array.isArray(data.roomServiceRequests)) setRoomServiceRequests(data.roomServiceRequests);
        if (Array.isArray(data.vipProfiles)) setVipGuestProfiles(data.vipProfiles);
        if (Array.isArray(data.guestSessions)) setGuestSessions(data.guestSessions);
        if (Array.isArray(data.guestChatMessages)) setGuestChatMessages(data.guestChatMessages);
        if (Array.isArray(data.operationalAlerts)) setOperationalAlerts(data.operationalAlerts);
        if (Array.isArray(data.notifications)) setNotifications(data.notifications);
        if (Array.isArray(data.auditLogs)) setAuditLogs(data.auditLogs);
      } else {
        if (Array.isArray(data.roomUnitsSummary)) {
          setRoomUnits(data.roomUnitsSummary);
        }
        // Clear PII operational arrays for unauthenticated visitors
        setBookings([]);
        setInvoices([]);
        setGuestSessions([]);
        setAuditLogs([]);
        setNotifications([]);
      }
    } catch {
      // Offline / static host mode fallback
    }
  };

  // Verify HttpOnly session cookie with server on boot & handle expiration
  useEffect(() => {
    localStorage.removeItem('kamal_hotel_session');
    let active = true;
    let expiryTimer: ReturnType<typeof setTimeout> | null = null;

    const verifySession = async () => {
      await refreshBootstrapFromServer();
      try {
        const res = await fetch('/api/auth/session', { credentials: 'include' });
        if (!active) return;
        if (!res.ok) {
          setActiveRole('guest');
          setActiveUser(null);
          setIsStaffLoggedIn(false);
          return;
        }
        const data = await res.json().catch(() => null);
        if (!active || !data?.authenticated || !data?.user) {
          setActiveRole('guest');
          setActiveUser(null);
          setIsStaffLoggedIn(false);
          return;
        }

        const user = data.user as StaffUser;
        setActiveUser(user);
        setActiveRole(user.role);
        setIsStaffLoggedIn(true);
        await hydrateAuthorizedStaffContext(user.role);

        if (typeof data.expiresAt === 'number') {
          const msRemaining = Math.max(0, data.expiresAt - Date.now());
          if (msRemaining === 0) {
            setActiveRole('guest');
            setActiveUser(null);
            setIsStaffLoggedIn(false);
          } else {
            expiryTimer = setTimeout(() => {
              if (!active) return;
              setActiveRole('guest');
              setActiveUser(null);
              setIsStaffLoggedIn(false);
              showToast('Session Expired', 'Please sign in again to continue.', 'warning');
            }, msRemaining);
          }
        }
      } catch {
        if (!active) return;
        setActiveRole('guest');
        setActiveUser(null);
        setIsStaffLoggedIn(false);
      }
    };

    verifySession();
    return () => {
      active = false;
      if (expiryTimer) clearTimeout(expiryTimer);
    };
  }, []);

  // Real-time multi-device WebSocket sync when backend is reachable
  useEffect(() => {
    if (!backendConnected || typeof window === 'undefined' || !('WebSocket' in window)) return;
    let ws: WebSocket | null = null;
    let closedByCleanup = false;
    let reconnectDelay = 2000;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const upsertItem = <T extends { id: string }>(arr: T[], item: T, prepend = true): T[] => {
      const idx = arr.findIndex((x) => x.id === item.id);
      if (idx >= 0) {
        const copy = [...arr];
        copy[idx] = item;
        return copy;
      }
      return prepend ? [item, ...arr] : [...arr, item];
    };

    const connect = () => {
      if (closedByCleanup) return;
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      ws = new WebSocket(`${proto}//${window.location.host}/ws`);
      ws.onopen = () => {
        reconnectDelay = 2000;
      };
      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          const { event, payload } = msg || {};
          if (!event) return;
          if (event === 'booking:created' && payload?.booking) {
            setBookings((prev) => upsertItem(prev, payload.booking));
            if (payload.invoice) setInvoices((prev) => upsertItem(prev, payload.invoice));
            if (payload.guestSession) {
              setGuestSessions((prev) => [
                payload.guestSession,
                ...prev.filter((s) => s.roomNumber !== payload.guestSession.roomNumber),
              ]);
            }
            if (payload.booking.assignedRoomNumber) {
              setRoomUnits((prev) =>
                prev.map((u) =>
                  u.roomNumber === payload.booking.assignedRoomNumber
                    ? {
                        ...u,
                        occupancyStatus: 'reserved',
                        currentGuestName: payload.booking.guestName,
                        currentBookingCode: payload.booking.bookingCode,
                      }
                    : u
                )
              );
            }
            const popupPayload = { booking: payload.booking, triggeredAt: new Date().toISOString() };
            setLatestBookingPopup(popupPayload);
          } else if (event === 'booking:updated' && payload?.booking) {
            setBookings((prev) => upsertItem(prev, payload.booking));
            if (payload.updatedUnit) {
              setRoomUnits((prev) => upsertItem(prev, payload.updatedUnit, false));
            }
          } else if ((event === 'payment:recorded' || event === 'invoice:updated') && payload) {
            if (payload.invoice) setInvoices((prev) => upsertItem(prev, payload.invoice));
            if (payload.booking) setBookings((prev) => upsertItem(prev, payload.booking));
          } else if (event === 'theme:updated' && payload) {
            setThemeConfig((prev) => ({ ...prev, ...payload }));
          } else if (event === 'billSettings:updated' && payload) {
            setBillSettings((prev) => ({ ...prev, ...payload }));
          } else if (event === 'floors:updated' && Array.isArray(payload)) {
            setFloors(payload);
          } else if (event === 'nightAudit:completed' && payload) {
            setNightAudits((prev) => upsertItem(prev, payload));
          } else if (event === 'order:created' && payload) {
            setRestaurantOrders((prev) => upsertItem(prev, payload));
          } else if (event === 'chat:message' && payload) {
            setGuestChatMessages((prev) => upsertItem(prev, payload, false));
          } else if (typeof event === 'string' && event.startsWith('collection:')) {
            const parts = event.split(':');
            const col = parts[1];
            const op = parts[2];
            const item = payload?.item;
            const id = payload?.id;
            const mapSet: Record<string, React.Dispatch<React.SetStateAction<any[]>>> = {
              rooms: setRooms,
              amenities: setAmenities,
              reviews: setReviews,
              faqs: setFaqs,
              coupons: setCoupons,
              roomUnits: setRoomUnits,
              menuItems: setMenuItems,
              tables: setRestaurantTables,
              restaurantOrders: setRestaurantOrders,
              stockItems: setStockItems,
              floorSupplies: setFloorSupplies,
              lostAndFound: setLostAndFound,
              shiftHandovers: setShiftHandovers,
              nightAudits: setNightAudits,
              staffShifts: setStaffShifts,
              staffAvailability: setStaffAvailability,
              surveys: setSurveys,
              digitalKeycards: setDigitalKeycards,
              maintenanceTickets: setMaintenanceTickets,
              rewardsMembers: setLoyaltyMembers,
              wakeUpCalls: setWakeUpCalls,
              deepCleaningSchedules: setDeepCleaningSchedules,
              expressTurnovers: setExpressTurnovers,
              roomServiceRequests: setRoomServiceRequests,
              vipProfiles: setVipGuestProfiles,
              invoices: setInvoices,
              guestChatMessages: setGuestChatMessages,
              operationalAlerts: setOperationalAlerts,
            };
            const setter = mapSet[col];
            if (setter) {
              if (op === 'updated' && item) {
                setter((prev) => upsertItem(prev, item));
              } else if (op === 'deleted' && id) {
                setter((prev) => prev.filter((x) => x.id !== id));
              }
            }
          }
        } catch {
          // Ignore malformed WS messages
        }
      };
      ws.onclose = () => {
        if (closedByCleanup) return;
        timer = setTimeout(() => {
          reconnectDelay = Math.min(30000, reconnectDelay * 1.5);
          connect();
        }, reconnectDelay);
      };
    };

    connect();
    return () => {
      closedByCleanup = true;
      if (timer) clearTimeout(timer);
      if (ws && ws.readyState === WebSocket.OPEN) ws.close();
    };
  }, [backendConnected, isStaffLoggedIn]);

  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [loginModalTargetRole, setLoginModalTargetRole] = useState<StaffRole | undefined>(undefined);
  const [darkMode, setDarkModeState] = useState<boolean>(() => {
    return localStorage.getItem('kamal_hotel_dark') === 'true';
  });

  const [toasts, setToasts] = useState<NotificationToast[]>([]);
  const [selectedRoomForBooking, setSelectedRoomForBooking] = useState<Room | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState<boolean>(false);
  const [latestBookingPopup, setLatestBookingPopup] = useState<{
    booking: Booking;
    triggeredAt: string;
  } | null>(() => {
    try {
      const saved = localStorage.getItem('kamal_hotel_latest_booking_alert_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.booking) return parsed;
      }
    } catch {
      // Ignore storage parse error
    }
    return null;
  });

  useEffect(() => {
    const safeParse = <T,>(raw: string | null): T | null => {
      if (!raw) return null;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return null;
      }
    };

    const handleCrossTabStorage = (event: StorageEvent) => {
      if (!event.key) return;
      if (event.key === 'kamal_hotel_latest_booking_alert_v1') {
        if (!event.newValue) {
          setLatestBookingPopup(null);
        } else {
          const parsed = safeParse<{ booking: Booking; triggeredAt: string }>(event.newValue);
          if (parsed && parsed.booking) setLatestBookingPopup(parsed);
        }
        return;
      }

      if (!event.newValue) return;
      const val = safeParse<any>(event.newValue);
      if (val === null) return;

      switch (event.key) {
        case 'kamal_hotel_bookings_v2':
          if (Array.isArray(val)) setBookings(val);
          break;
        case 'kamal_hotel_room_units_v1':
          if (Array.isArray(val)) setRoomUnits(val);
          break;
        case 'kamal_hotel_invoices_v1':
          if (Array.isArray(val)) setInvoices(val);
          break;
        case 'kamal_hotel_rooms_v2':
          if (Array.isArray(val)) setRooms(val);
          break;
        case 'kamal_hotel_orders_v1':
          if (Array.isArray(val)) setRestaurantOrders(val);
          break;
        case 'kamal_hotel_guest_sessions_v1':
          if (Array.isArray(val)) setGuestSessions(val);
          break;
        case 'kamal_hotel_operational_alerts_v1':
          if (Array.isArray(val)) setOperationalAlerts(val);
          break;
        case 'kamal_hotel_notifications_v2':
          if (Array.isArray(val)) setNotifications(val);
          break;
        case 'kamal_hotel_room_service_requests_v1':
          if (Array.isArray(val)) setRoomServiceRequests(val);
          break;
        case 'kamal_hotel_express_turnovers_v1':
          if (Array.isArray(val)) setExpressTurnovers(val);
          break;
        case 'kamal_hotel_vip_guests_v1':
          if (Array.isArray(val)) setVipGuestProfiles(val);
          break;
        case 'kamal_hotel_digital_keys_v1':
          if (Array.isArray(val)) setDigitalKeycards(val);
          break;
        case 'kamal_hotel_wake_up_calls_v1':
          if (Array.isArray(val)) setWakeUpCalls(val);
          break;
        case 'kamal_hotel_maintenance_v1':
          if (Array.isArray(val)) setMaintenanceTickets(val);
          break;
        case 'kamal_hotel_lost_found_v1':
          if (Array.isArray(val)) setLostAndFound(val);
          break;
        case 'kamal_hotel_stock_v1':
          if (Array.isArray(val)) setStockItems(val);
          break;
        case 'kamal_hotel_menu_v1':
          if (Array.isArray(val)) setMenuItems(val);
          break;
        case 'kamal_hotel_tables_v1':
          if (Array.isArray(val)) setRestaurantTables(val);
          break;
        case 'kamal_hotel_theme_v2':
          setThemeConfig(val);
          break;
        case 'kamal_hotel_smtp_v1':
          if (val && typeof val === 'object') {
            setSmtpConfig({ ...val, smtpPassword: '' });
          }
          break;
      }
    };
    window.addEventListener('storage', handleCrossTabStorage);
    return () => window.removeEventListener('storage', handleCrossTabStorage);
  }, []);

  const dismissBookingPopup = () => {
    setLatestBookingPopup(null);
    try {
      localStorage.removeItem('kamal_hotel_latest_booking_alert_v1');
    } catch {
      // Ignore storage removal failure
    }
  };

  // Coupons & Promo Vouchers state
  const [coupons, setCoupons] = useState<HotelCoupon[]>(() => {
    const saved = localStorage.getItem('kamal_hotel_coupons_v1');
    return saved ? JSON.parse(saved) : INITIAL_COUPONS;
  });

  useEffect(() => {
    localStorage.setItem('kamal_hotel_coupons_v1', JSON.stringify(coupons));
  }, [coupons]);

  // SMTP Mail Gateway state (secrets live encrypted on the backend — NEVER in localStorage)
  const [smtpConfig, setSmtpConfig] = useState<SmtpConfig>(() => {
    const saved = localStorage.getItem('kamal_hotel_smtp_v1');
    const defaults: SmtpConfig = {
      providerPreset: 'gmail',
      smtpHost: 'smtp.gmail.com',
      smtpPort: 587,
      smtpUser: '',
      smtpPassword: '',
      hasStoredPassword: false,
      senderEmail: 'hotelkamal.np@gmail.com',
      senderName: 'Kamal Hotel Reservations',
      replyToEmail: 'hotelkamal.np@gmail.com',
      notificationEmail: 'hotelkamal.np@gmail.com',
      encryption: 'tls',
      sendBookingConfirmationEmail: true,
      requireRealEmailOtp: false,
      otpExpiryMinutes: 10,
      emailSubjectPrefix: '[Kamal Hotel]',
      isConfigured: false,
    };
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Partial<SmtpConfig>;
        return {
          ...defaults,
          ...parsed,
          smtpPassword: '',
          sendBookingConfirmationEmail: parsed.sendBookingConfirmationEmail !== false,
          otpExpiryMinutes: parsed.otpExpiryMinutes || 10,
        };
      } catch (e) {}
    }
    return defaults;
  });

  useEffect(() => {
    const { smtpPassword: _neverStoreSecret, ...safeToStore } = smtpConfig;
    localStorage.setItem('kamal_hotel_smtp_v1', JSON.stringify(safeToStore));
  }, [smtpConfig]);

  // Sync dark mode class
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('kamal_hotel_dark', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('kamal_hotel_dark', 'false');
    }
  }, [darkMode]);

  // Persist items
  useEffect(() => {
    localStorage.setItem('kamal_hotel_rooms_v2', JSON.stringify(rooms));
  }, [rooms]);

  useEffect(() => {
    localStorage.setItem('kamal_hotel_amenities_v2', JSON.stringify(amenities));
  }, [amenities]);

  useEffect(() => {
    localStorage.setItem('kamal_hotel_bookings_v2', JSON.stringify(bookings));
  }, [bookings]);

  useEffect(() => {
    const scrubbed = staff.map(({ ...member }) => member);
    localStorage.setItem('kamal_hotel_staff_v3', JSON.stringify(scrubbed));
  }, [staff]);

  useEffect(() => {
    localStorage.setItem('kamal_hotel_audit_v2', JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem('kamal_hotel_notifications_v2', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('kamal_hotel_reviews_v2', JSON.stringify(reviews));
  }, [reviews]);

  useEffect(() => {
    localStorage.setItem('kamal_hotel_faqs_v2', JSON.stringify(faqs));
  }, [faqs]);

  useEffect(() => {
    localStorage.setItem('kamal_hotel_theme_v2', JSON.stringify(themeConfig));
  }, [themeConfig]);

  useEffect(() => {
    localStorage.setItem('kamal_hotel_currency', currentCurrency);
  }, [currentCurrency]);

  // ----------------- RESTAURANT & DINING STATE -----------------
  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => {
    const saved = localStorage.getItem('kamal_hotel_menu_v1');
    if (!saved) return INITIAL_MENU_ITEMS;
    try {
      const parsed = sanitizeStoredJson<MenuItem[]>(saved);
      return parsed.map((m) => ({
        ...m,
        category: normalizeLegacyMenuCategory(String(m.category)),
      }));
    } catch {
      return INITIAL_MENU_ITEMS;
    }
  });

  const [restaurantOrders, setRestaurantOrders] = useState<RestaurantOrder[]>(() => {
    const saved = localStorage.getItem('kamal_hotel_orders_v1');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('kamal_hotel_menu_v1', JSON.stringify(menuItems));
  }, [menuItems]);

  useEffect(() => {
    localStorage.setItem('kamal_hotel_orders_v1', JSON.stringify(restaurantOrders));
  }, [restaurantOrders]);

  // ----------------- STOCK & INVENTORY STATE -----------------
  const [stockItems, setStockItems] = useState<StockItem[]>(() => {
    const saved = localStorage.getItem('kamal_hotel_stock_v1');
    return saved ? JSON.parse(saved) : INITIAL_STOCK_ITEMS;
  });

  useEffect(() => {
    localStorage.setItem('kamal_hotel_stock_v1', JSON.stringify(stockItems));
  }, [stockItems]);

  // ----------------- BILLING & INVOICES STATE -----------------
  const [billSettings, setBillSettings] = useState<BillSettings>(() => {
    const saved = localStorage.getItem('kamal_hotel_bill_settings_v1');
    return saved ? JSON.parse(saved) : INITIAL_BILL_SETTINGS;
  });

  const [invoices, setInvoices] = useState<MasterInvoice[]>(() => {
    const saved = localStorage.getItem('kamal_hotel_invoices_v1');
    return saved ? JSON.parse(saved) : INITIAL_INVOICES;
  });

  useEffect(() => {
    localStorage.setItem('kamal_hotel_bill_settings_v1', JSON.stringify(billSettings));
  }, [billSettings]);

  useEffect(() => {
    localStorage.setItem('kamal_hotel_invoices_v1', JSON.stringify(invoices));
  }, [invoices]);

  // ----------------- IN-HOUSE GUEST PASSCODE SESSIONS -----------------
  const [guestSessions, setGuestSessions] = useState<GuestRoomSession[]>(() => {
    const saved = localStorage.getItem('kamal_hotel_guest_sessions_v1');
    return saved ? JSON.parse(saved) : INITIAL_GUEST_SESSIONS;
  });

  const [activeGuestSession, setActiveGuestSession] = useState<GuestRoomSession | null>(() => {
    const saved = localStorage.getItem('kamal_hotel_active_guest_session');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    localStorage.setItem('kamal_hotel_guest_sessions_v1', JSON.stringify(guestSessions));
  }, [guestSessions]);

  useEffect(() => {
    if (activeGuestSession) {
      localStorage.setItem('kamal_hotel_active_guest_session', JSON.stringify(activeGuestSession));
    } else {
      localStorage.removeItem('kamal_hotel_active_guest_session');
    }
  }, [activeGuestSession]);

  // ----------------- IN-ROOM INTERCOM & VOIP -----------------
  const [guestChatMessages, setGuestChatMessages] = useState<CSRChatMessage[]>([
    {
      id: 'msg-init-1',
      sender: 'concierge',
      roomNumber: 'Reception',
      guestName: 'Bikash (Front Desk)',
      text: 'Namaste! Welcome to Kamal Hotel, Kamalpokhari. How may we assist your stay today? Feel free to order room dining or request towels.',
      time: 'Just now',
      serviceTag: 'front_desk',
    },
  ]);
  const [isVoipCallActive, setIsVoipCallActive] = useState<boolean>(false);
  const [activeVoipTarget, setActiveVoipTarget] = useState<string | null>(null);

  // ----------------- OPERATIONAL EXTENSIONS (TABLES, FLOORS, HOUSEKEEPING, NIGHT AUDIT) -----------------
  const [restaurantTables, setRestaurantTables] = useState<RestaurantTable[]>(() => {
    const saved = localStorage.getItem('kamal_hotel_tables_v1');
    return saved ? JSON.parse(saved) : INITIAL_TABLES;
  });

  const [floors, setFloors] = useState<string[]>(() => {
    const saved = localStorage.getItem('kamal_hotel_floors_v1');
    return saved ? JSON.parse(saved) : INITIAL_FLOORS;
  });

  const [roomUnits, setRoomUnits] = useState<RoomOperationalUnit[]>(() => {
    const saved = localStorage.getItem('kamal_hotel_room_units_v1');
    return saved ? JSON.parse(saved) : INITIAL_ROOM_UNITS;
  });

  const [lostAndFound, setLostAndFound] = useState<LostAndFoundItem[]>(() => {
    const saved = localStorage.getItem('kamal_hotel_lost_found_v1');
    return saved ? JSON.parse(saved) : INITIAL_LOST_FOUND;
  });

  const [shiftHandovers, setShiftHandovers] = useState<ShiftHandoverLog[]>(() => {
    const saved = localStorage.getItem('kamal_hotel_shifts_v1');
    return saved ? JSON.parse(saved) : INITIAL_SHIFTS;
  });

  const [nightAudits, setNightAudits] = useState<NightAuditRecord[]>(() => {
    const saved = localStorage.getItem('kamal_hotel_night_audits_v1');
    return saved ? JSON.parse(saved) : INITIAL_NIGHT_AUDITS;
  });

  useEffect(() => {
    localStorage.setItem('kamal_hotel_tables_v1', JSON.stringify(restaurantTables));
  }, [restaurantTables]);

  useEffect(() => {
    localStorage.setItem('kamal_hotel_floors_v1', JSON.stringify(floors));
  }, [floors]);

  useEffect(() => {
    localStorage.setItem('kamal_hotel_room_units_v1', JSON.stringify(roomUnits));
  }, [roomUnits]);

  useEffect(() => {
    localStorage.setItem('kamal_hotel_lost_found_v1', JSON.stringify(lostAndFound));
  }, [lostAndFound]);

  useEffect(() => {
    localStorage.setItem('kamal_hotel_shifts_v1', JSON.stringify(shiftHandovers));
  }, [shiftHandovers]);

  useEffect(() => {
    localStorage.setItem('kamal_hotel_night_audits_v1', JSON.stringify(nightAudits));
  }, [nightAudits]);

  // ----------------- DEPARTMENT SHIFT SCHEDULING STATE -----------------
  const [staffShifts, setStaffShifts] = useState<StaffShiftAssignment[]>(() => {
    const saved = localStorage.getItem('kamal_hotel_staff_shifts_v1');
    return saved ? JSON.parse(saved) : INITIAL_STAFF_SHIFTS;
  });

  const [staffAvailability, setStaffAvailability] = useState<StaffAvailabilityEntry[]>(() => {
    const saved = localStorage.getItem('kamal_hotel_staff_avail_v1');
    return saved ? JSON.parse(saved) : INITIAL_STAFF_AVAILABILITY;
  });

  useEffect(() => {
    localStorage.setItem('kamal_hotel_staff_shifts_v1', JSON.stringify(staffShifts));
  }, [staffShifts]);

  useEffect(() => {
    localStorage.setItem('kamal_hotel_staff_avail_v1', JSON.stringify(staffAvailability));
  }, [staffAvailability]);

  // ----------------- POST-CHECKOUT SURVEYS STATE -----------------
  const [surveys, setSurveys] = useState<PostCheckoutSurvey[]>(() => {
    const saved = localStorage.getItem('kamal_hotel_surveys_v1');
    return saved ? JSON.parse(saved) : INITIAL_POST_CHECKOUT_SURVEYS;
  });

  const [autoTriggerSurveyOnCheckout, setAutoTriggerSurveyOnCheckout] = useState<boolean>(() => {
    const saved = localStorage.getItem('kamal_hotel_auto_survey_v1');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [activeSurveyToken, setActiveSurveyToken] = useState<string | null>(null);
  const recentAutoSurveyRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    localStorage.setItem('kamal_hotel_surveys_v1', JSON.stringify(surveys));
  }, [surveys]);

  useEffect(() => {
    localStorage.setItem('kamal_hotel_auto_survey_v1', JSON.stringify(autoTriggerSurveyOnCheckout));
  }, [autoTriggerSurveyOnCheckout]);

  // ----------------- DIGITAL KEYCARD & SMART LOCK READER STATE -----------------
  const [digitalKeycards, setDigitalKeycards] = useState<DigitalKeycard[]>(() => {
    const saved = localStorage.getItem('kamal_hotel_digital_keys_v1');
    return saved ? JSON.parse(saved) : INITIAL_DIGITAL_KEYCARDS;
  });

  const [doorUnlockLogs, setDoorUnlockLogs] = useState<DoorUnlockEvent[]>(() => {
    const saved = localStorage.getItem('kamal_hotel_door_logs_v1');
    return saved ? JSON.parse(saved) : INITIAL_DOOR_UNLOCK_LOGS;
  });

  useEffect(() => {
    localStorage.setItem('kamal_hotel_digital_keys_v1', JSON.stringify(digitalKeycards));
  }, [digitalKeycards]);

  useEffect(() => {
    localStorage.setItem('kamal_hotel_door_logs_v1', JSON.stringify(doorUnlockLogs));
  }, [doorUnlockLogs]);

  // ----------------- MAINTENANCE TRACKER STATE -----------------
  const [maintenanceTickets, setMaintenanceTickets] = useState<MaintenanceTicket[]>(() => {
    const saved = localStorage.getItem('kamal_hotel_maintenance_v1');
    return saved ? JSON.parse(saved) : INITIAL_MAINTENANCE_TICKETS;
  });

  useEffect(() => {
    localStorage.setItem('kamal_hotel_maintenance_v1', JSON.stringify(maintenanceTickets));
  }, [maintenanceTickets]);

  // ----------------- KAMAL REWARDS LOYALTY STATE -----------------
  const [loyaltyMembers, setLoyaltyMembers] = useState<KamalRewardsMember[]>(() => {
    const saved = localStorage.getItem('kamal_hotel_rewards_v1');
    return saved ? JSON.parse(saved) : INITIAL_KAMAL_REWARDS;
  });

  useEffect(() => {
    localStorage.setItem('kamal_hotel_rewards_v1', JSON.stringify(loyaltyMembers));
  }, [loyaltyMembers]);

  // ----------------- WAKE-UP CALL SCHEDULER STATE -----------------
  const [wakeUpCalls, setWakeUpCalls] = useState<WakeUpCallRequest[]>(() => {
    const saved = localStorage.getItem('kamal_hotel_wake_up_calls_v1');
    return saved ? JSON.parse(saved) : INITIAL_WAKE_UP_CALLS;
  });

  useEffect(() => {
    localStorage.setItem('kamal_hotel_wake_up_calls_v1', JSON.stringify(wakeUpCalls));
  }, [wakeUpCalls]);

  // ----------------- HOUSEKEEPING CHECKLIST & FLOOR SUPPLIES STATE -----------------
  const [deepCleaningSchedules, setDeepCleaningSchedules] = useState<DeepCleaningSchedule[]>(() => {
    const saved = localStorage.getItem('kamal_hotel_deep_clean_v1');
    return saved ? JSON.parse(saved) : INITIAL_DEEP_CLEANING_SCHEDULES;
  });

  const [floorSupplies, setFloorSupplies] = useState<FloorSupplyItem[]>(() => {
    const saved = localStorage.getItem('kamal_hotel_floor_supplies_v1');
    return saved ? JSON.parse(saved) : INITIAL_FLOOR_SUPPLIES;
  });

  // ----------------- EXPRESS ROOM TURNOVER STATE -----------------
  const [expressTurnovers, setExpressTurnovers] = useState<ExpressTurnoverJob[]>(() => {
    const saved = localStorage.getItem('kamal_hotel_express_turnovers_v1');
    return saved ? JSON.parse(saved) : INITIAL_EXPRESS_TURNOVERS;
  });

  // ----------------- ROOM SERVICE AMENITY REQUESTS & VIP GUEST FLAGS -----------------
  const [roomServiceRequests, setRoomServiceRequests] = useState<RoomServiceRequest[]>(() => {
    const saved = localStorage.getItem('kamal_hotel_room_service_requests_v1');
    return saved ? JSON.parse(saved) : INITIAL_ROOM_SERVICE_REQUESTS;
  });

  const [vipGuestProfiles, setVipGuestProfiles] = useState<VipGuestProfile[]>(() => {
    const saved = localStorage.getItem('kamal_hotel_vip_guests_v1');
    return saved ? JSON.parse(saved) : INITIAL_VIP_GUEST_PROFILES;
  });

  const recentVipAlertRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    localStorage.setItem('kamal_hotel_express_turnovers_v1', JSON.stringify(expressTurnovers));
  }, [expressTurnovers]);

  useEffect(() => {
    localStorage.setItem('kamal_hotel_room_service_requests_v1', JSON.stringify(roomServiceRequests));
  }, [roomServiceRequests]);

  useEffect(() => {
    localStorage.setItem('kamal_hotel_vip_guests_v1', JSON.stringify(vipGuestProfiles));
  }, [vipGuestProfiles]);

  useEffect(() => {
    localStorage.setItem('kamal_hotel_deep_clean_v1', JSON.stringify(deepCleaningSchedules));
  }, [deepCleaningSchedules]);

  useEffect(() => {
    localStorage.setItem('kamal_hotel_floor_supplies_v1', JSON.stringify(floorSupplies));
  }, [floorSupplies]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('survey');
      if (token) {
        setActiveSurveyToken(token);
      }
    }
  }, []);

  const openSurveyModal = (token: string) => setActiveSurveyToken(token);
  const closeSurveyModal = () => setActiveSurveyToken(null);

  const setDarkMode = (val: boolean) => {
    setDarkModeState(val);
  };

  const showToast = (title: string, message: string, type: 'success' | 'info' | 'warning' | 'error' = 'success') => {
    const id = 'toast-' + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 5000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // ----------------- MULTI-ROLE OPERATIONAL ALERTS & NOTIFICATIONS -----------------
  const [operationalAlerts, setOperationalAlerts] = useState<OperationalAlert[]>(() => {
    const saved = localStorage.getItem('kamal_hotel_operational_alerts_v1');
    return saved ? JSON.parse(saved) : INITIAL_OPERATIONAL_ALERTS;
  });

  useEffect(() => {
    localStorage.setItem('kamal_hotel_operational_alerts_v1', JSON.stringify(operationalAlerts));
  }, [operationalAlerts]);

  const dispatchOperationalAlert = (alert: Omit<OperationalAlert, 'id' | 'timestamp' | 'isRead'>) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newAlert: OperationalAlert = {
      ...alert,
      id: 'alt-' + Math.random().toString(36).substring(2, 9),
      timestamp: `Today ${timeStr}`,
      isRead: false,
    };
    setOperationalAlerts((prev) => [newAlert, ...prev]);

    // Check if current active user role should see toast
    const isTargeted =
      alert.targetRoles.includes('all') ||
      alert.targetRoles.includes(activeRole as StaffRole) ||
      activeRole === 'super_admin' ||
      activeRole === 'admin';

    if (isTargeted && activeRole !== 'guest') {
      showToast(`🔔 ${alert.title}`, alert.message, 'info');
    }
  };

  const markAlertAsRead = (alertId: string) => {
    setOperationalAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, isRead: true } : a))
    );
  };

  const markAllAlertsAsRead = () => {
    setOperationalAlerts((prev) => prev.map((a) => ({ ...a, isRead: true })));
  };

  const clearAlerts = () => {
    setOperationalAlerts([]);
  };

  const unreadAlertsCount = operationalAlerts.filter(
    (a) =>
      !a.isRead &&
      (a.targetRoles.includes('all') ||
        a.targetRoles.includes(activeRole as StaffRole) ||
        activeRole === 'super_admin' ||
        activeRole === 'admin')
  ).length;

  const unreadChatMessagesCount = guestChatMessages.filter((m) => m.sender === 'guest').length;

  // ----------------- PHYSICAL ROOM ASSIGNMENT -----------------
  const getAvailableRoomsForType = (roomType: RoomType, excludeBookingId?: string): RoomOperationalUnit[] => {
    return roomUnits.filter((u) => {
      const isMatching = u.roomType === roomType;
      const isVacantOrCurrent = u.occupancyStatus === 'vacant' || (excludeBookingId && u.currentBookingCode === excludeBookingId);
      return isMatching && isVacantOrCurrent;
    });
  };

  const assignRoomToBooking = (bookingId: string, roomNumber: string) => {
    const targetBooking = bookings.find((b) => b.id === bookingId);
    const targetUnit = roomUnits.find((u) => u.roomNumber === roomNumber);
    if (!targetBooking) return;

    // Free previously assigned room if any
    if (targetBooking.assignedRoomNumber && targetBooking.assignedRoomNumber !== roomNumber) {
      setRoomUnits((prev) =>
        prev.map((u) =>
          u.roomNumber === targetBooking.assignedRoomNumber
            ? { ...u, occupancyStatus: 'vacant', currentGuestName: undefined, currentBookingCode: undefined }
            : u
        )
      );
    }

    const assignedFloor = targetUnit?.floor || 'Main Building';

    // Update booking
    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId
          ? { ...b, assignedRoomNumber: roomNumber, assignedFloor }
          : b
      )
    );

    // Update room unit
    setRoomUnits((prev) =>
      prev.map((u) =>
        u.roomNumber === roomNumber
          ? {
              ...u,
              occupancyStatus: targetBooking.bookingStatus === 'checked-in' ? 'occupied' : 'reserved',
              currentGuestName: targetBooking.guestName,
              currentBookingCode: targetBooking.bookingCode,
            }
          : u
      )
    );

    // Auto generate/sync guest session passcode and linked invoice room
    const issuedPin = generateNewRoomPasscode(roomNumber, targetBooking.bookingCode, targetBooking.guestName);

    setInvoices((prev) =>
      prev.map((inv) =>
        inv.bookingCode === targetBooking.bookingCode
          ? { ...inv, roomNumber: `Room ${roomNumber}` }
          : inv
      )
    );

    if (backendAvailableRef.current) {
      fetch(`/api/bookings/${encodeURIComponent(bookingId)}/assign-room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ roomNumber }),
      }).catch(() => {});
      persistCollectionItem('guestSessions', roomNumber, issuedPin);
    }

    dispatchOperationalAlert({
      title: `Room ${roomNumber} Assigned`,
      message: `${targetBooking.guestName} assigned to Room ${roomNumber} (${assignedFloor}) for reservation ${targetBooking.bookingCode}.`,
      type: 'room_assigned',
      targetRoles: ['super_admin', 'admin', 'hotel_manager', 'receptionist', 'restaurant_owner'],
      bookingCode: targetBooking.bookingCode,
      roomNumber,
    });

    addAuditLog(
      'Room Assigned',
      'booking',
      `Assigned Room ${roomNumber} to ${targetBooking.guestName} (${targetBooking.bookingCode})`
    );

    showToast('Room Assigned', `Room ${roomNumber} successfully assigned to ${targetBooking.guestName}`, 'success');
  };

  const addAuditLog = (action: string, category: AuditLog['category'], details: string) => {
    const actor = staff.find((s) => s.role === activeRole) || {
      name: activeRole === 'guest' ? 'Guest / Traveler' : 'Authorized Staff',
      role: activeRole,
    };
    const now = new Date();
    const dateStr = now.toISOString().replace('T', ' ').substring(0, 19);
    const newLog: AuditLog = {
      id: 'log-' + Math.random().toString(36).substring(2, 9),
      timestamp: dateStr,
      actorName: actor.name,
      actorRole: actor.role,
      action,
      category,
      details,
      ipAddress: '103.10.23.' + Math.floor(Math.random() * 80 + 10),
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  const openBookingModal = (room?: Room) => {
    if (room) {
      setSelectedRoomForBooking(room);
    } else if (rooms.length > 0) {
      setSelectedRoomForBooking(rooms[0]);
    }
    setIsBookingModalOpen(true);
  };

  const closeBookingModal = () => {
    setIsBookingModalOpen(false);
  };

  const createBooking = (bookingData: Omit<Booking, 'id' | 'bookingCode' | 'createdAt' | 'smsSent' | 'emailSent' | 'whatsappSent'>): Booking => {
    const bookingSeq = Math.floor(1000 + Math.random() * 9000);
    const bookingCode = `KH-2026-${bookingSeq}`;

    // Auto-suggest first vacant physical room unit for this room type if not already designated
    const vacantRoom = roomUnits.find(
      (u) => u.roomType === bookingData.roomType && u.occupancyStatus === 'vacant'
    );
    const assignedRoomNumber = bookingData.assignedRoomNumber || (vacantRoom ? vacantRoom.roomNumber : undefined);
    const assignedFloor = bookingData.assignedFloor || (vacantRoom ? vacantRoom.floor : undefined);

    const newBooking: Booking = {
      ...bookingData,
      id: 'bk-' + Math.random().toString(36).substring(2, 9),
      bookingCode,
      assignedRoomNumber,
      assignedFloor,
      createdAt: new Date().toISOString(),
      smsSent: true,
      emailSent: true,
      whatsappSent: true,
    };

    setBookings((prev) => [newBooking, ...prev]);

    // If a room unit was assigned, reserve it and create in-house guest session
    if (assignedRoomNumber) {
      setRoomUnits((prev) =>
        prev.map((u) =>
          u.roomNumber === assignedRoomNumber
            ? {
                ...u,
                occupancyStatus: 'reserved',
                currentGuestName: newBooking.guestName,
                currentBookingCode: bookingCode,
              }
            : u
        )
      );
      generateNewRoomPasscode(assignedRoomNumber, bookingCode, newBooking.guestName);
    }

    // Decrease room available units
    setRooms((prev) =>
      prev.map((r) => {
        if (r.id === newBooking.roomTypeId) {
          return {
            ...r,
            availableUnits: Math.max(0, r.availableUnits - 1),
          };
        }
        return r;
      })
    );

    // Update availability & auto-create MasterInvoice in USD for front-desk folio ledger
    const currencyDivisor =
      newBooking.currency === 'NPR'
        ? themeConfig.exchangeRates.NPR || 135
        : newBooking.currency === 'INR'
        ? themeConfig.exchangeRates.INR || 84
        : 1;

    const toUSD = (val: number) => Math.round((val / currencyDivisor) * 100) / 100;
    const bookedRoomCatalog = rooms.find((r) => r.id === newBooking.roomTypeId);
    const roomNightlyUSD = bookedRoomCatalog
      ? bookedRoomCatalog.pricePerNightUSD * (themeConfig.seasonalSurgeMultiplier || 1)
      : Math.max(10, toUSD(newBooking.subtotal) / Math.max(1, newBooking.nights));
    const roomLineTotalUSD = Math.round(roomNightlyUSD * newBooking.nights * 100) / 100;

    const autoInvoiceItems: BillItemLine[] = [
      {
        id: 'li-' + Math.random().toString(36).substring(2, 7),
        description: `${newBooking.roomName} (${newBooking.nights} Nights @ $${roomNightlyUSD.toFixed(2)}/night)`,
        category: 'room_stay',
        date: newBooking.checkInDate,
        quantity: newBooking.nights,
        rateUSD: Math.round(roomNightlyUSD * 100) / 100,
        amountUSD: roomLineTotalUSD,
      },
    ];

    if (newBooking.addons && newBooking.addons.length > 0) {
      newBooking.addons.forEach((addon) => {
        const addonQty = addon.id === 'addon-breakfast' ? Math.max(1, newBooking.nights * newBooking.adults) : 1;
        autoInvoiceItems.push({
          id: 'li-' + Math.random().toString(36).substring(2, 7),
          description: addon.name,
          category: addon.name.toLowerCase().includes('airport')
            ? 'airport_transfer'
            : addon.name.toLowerCase().includes('massage') || addon.name.toLowerCase().includes('spa')
            ? 'spa_wellness'
            : addon.id === 'addon-breakfast'
            ? 'restaurant_dining'
            : 'other',
          date: newBooking.checkInDate,
          quantity: addonQty,
          rateUSD: addon.priceUSD,
          amountUSD: Math.round(addon.priceUSD * addonQty * 100) / 100,
        });
      });
    }

    const invSubtotalUSD = Math.round(autoInvoiceItems.reduce((acc, i) => acc + i.amountUSD, 0) * 100) / 100;
    const expectedSubAfterDiscUSD = toUSD(newBooking.subtotal);
    const invDiscountUSD = Math.max(0, Math.round((invSubtotalUSD - expectedSubAfterDiscUSD) * 100) / 100);
    const invDiscountPct = invSubtotalUSD > 0 ? Math.round((invDiscountUSD / invSubtotalUSD) * 1000) / 10 : 0;
    const invDiscountedSubUSD = Math.max(0, invSubtotalUSD - invDiscountUSD);
    const invServiceChargeUSD = Math.round(((invDiscountedSubUSD * billSettings.serviceChargePercent) / 100) * 100) / 100;
    const invTaxUSD = Math.round((((invDiscountedSubUSD + invServiceChargeUSD) * billSettings.taxPercent) / 100) * 100) / 100;
    const invGrandTotalUSD = Math.round((invDiscountedSubUSD + invServiceChargeUSD + invTaxUSD) * 100) / 100;

    const autoInvoice: MasterInvoice = {
      id: 'inv-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
      invoiceNumber: 'KH-INV-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000),
      bookingCode,
      roomNumber: assignedRoomNumber ? `Room ${assignedRoomNumber}` : 'Front Desk Allocation',
      guestName: newBooking.guestName,
      guestEmail: newBooking.guestEmail,
      guestPhone: newBooking.guestPhone,
      checkInDate: newBooking.checkInDate,
      checkOutDate: newBooking.checkOutDate,
      issuedAt: new Date().toLocaleString(),
      items: autoInvoiceItems,
      subtotalUSD: invSubtotalUSD,
      discountPercent: invDiscountPct,
      discountAmountUSD: invDiscountUSD,
      serviceChargePercent: billSettings.serviceChargePercent,
      serviceChargeAmountUSD: invServiceChargeUSD,
      taxPercent: billSettings.taxPercent,
      taxAmountUSD: invTaxUSD,
      grandTotalUSD: invGrandTotalUSD,
      amountPaidUSD: newBooking.paymentStatus === 'paid' ? invGrandTotalUSD : 0,
      balanceDueUSD: newBooking.paymentStatus === 'paid' ? 0 : invGrandTotalUSD,
      paymentStatus: newBooking.paymentStatus,
      paymentMethod: newBooking.paymentMethod,
    };

    setInvoices((prev) => [autoInvoice, ...prev]);

    // Automated Notification Records
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const currencyLabel = newBooking.currency === 'NPR' ? `NPR ${newBooking.totalAmount.toLocaleString()}` : newBooking.currency === 'INR' ? `INR ${newBooking.totalAmount.toLocaleString()}` : `$${newBooking.totalAmount.toFixed(2)}`;
    
    const emailRecord: NotificationRecord = {
      id: 'notif-email-' + Math.random().toString(36).substring(2, 9),
      timestamp,
      recipient: newBooking.guestEmail,
      channel: 'email',
      subject: `Booking Confirmed: ${newBooking.roomName} at Kamal Hotel, Kamalpokhari (${bookingCode})`,
      message: `Dear ${newBooking.guestName}, your reservation at Kamal Hotel (Kamalpokhari, Kathmandu) is confirmed for ${newBooking.checkInDate} to ${newBooking.checkOutDate}. Assigned: Room ${assignedRoomNumber || 'Front Desk Assignment'}. Total paid: ${currencyLabel}. Welcome to Kathmandu Valley!`,
      status: 'delivered',
      bookingCode,
    };

    const smsRecord: NotificationRecord = {
      id: 'notif-sms-' + Math.random().toString(36).substring(2, 9),
      timestamp,
      recipient: newBooking.guestPhone,
      channel: 'sms',
      subject: `SMS Confirmation [${bookingCode}]`,
      message: `Kamal Hotel (Kamalpokhari, Kathmandu): Namaste ${newBooking.guestName}! Your room ${newBooking.roomName} (Room ${assignedRoomNumber || 'Pending Assignment'}) is confirmed for ${newBooking.checkInDate}. Ref: ${bookingCode}. 24/7 Front Desk: ${themeConfig.contactPhone}`,
      status: 'delivered',
      bookingCode,
    };

    const waRecord: NotificationRecord = {
      id: 'notif-wa-' + Math.random().toString(36).substring(2, 9),
      timestamp,
      recipient: newBooking.guestPhone,
      channel: 'whatsapp',
      subject: `WhatsApp Hospitality Voucher [${bookingCode}]`,
      message: `Welcome to Kamal Hotel! We have prepared your itinerary, Kamalpokhari location map, airport transfer instructions, and ground-floor dining preview pass. Chat with our concierge here 24/7!`,
      status: 'delivered',
      bookingCode,
    };

    setNotifications((prev) => [emailRecord, smsRecord, waRecord, ...prev]);

    // Dispatch Operational Alert to all management, reception, and kitchen if breakfast included
    const hasBreakfastAddon = newBooking.addons?.some(
      (a) => a.id.includes('breakfast') || a.name.toLowerCase().includes('breakfast')
    );

    dispatchOperationalAlert({
      title: 'New Guest Reservation',
      message: `${newBooking.guestName} booked ${newBooking.roomName} (${bookingCode})${assignedRoomNumber ? ` · Room ${assignedRoomNumber} assigned` : ' · Room # Pending Assignment'}.`,
      type: 'booking',
      targetRoles: hasBreakfastAddon
        ? ['super_admin', 'admin', 'hotel_manager', 'receptionist', 'restaurant_owner', 'chef']
        : ['super_admin', 'admin', 'hotel_manager', 'receptionist', 'restaurant_owner'],
      bookingCode,
      roomNumber: assignedRoomNumber,
    });

    addAuditLog(
      'New Guest Reservation',
      'booking',
      `Booking ${bookingCode} confirmed for ${newBooking.guestName} (${newBooking.roomName}, Room ${assignedRoomNumber || 'Pending'}, ${currencyLabel}) via ${newBooking.paymentMethod}.`
    );

    // Automatically credit Kamal Rewards points (10 pts per USD spent)
    const bookingUsdEquivalent = toUSD(newBooking.totalAmount);
    const earnedPts = Math.max(50, Math.round(bookingUsdEquivalent * 10));
    adjustLoyaltyPoints({
      guestName: newBooking.guestName,
      guestEmail: newBooking.guestEmail,
      guestPhone: newBooking.guestPhone,
      bookingCode,
      pointsDelta: earnedPts,
      reason: `Stay Booking Rewards: ${newBooking.roomName} (${bookingCode})`,
      transactionType: 'booking_earn',
      silentToast: true,
    });

    const popupPayload = {
      booking: newBooking,
      triggeredAt: new Date().toISOString(),
    };
    setLatestBookingPopup(popupPayload);
    try {
      localStorage.setItem('kamal_hotel_latest_booking_alert_v1', JSON.stringify(popupPayload));
    } catch {
      // Ignore storage quota errors
    }

    showToast(
      'Reservation Confirmed!',
      `Booking ${bookingCode} created${assignedRoomNumber ? ` · Room ${assignedRoomNumber} Assigned` : ''}. +${earnedPts.toLocaleString()} Kamal Rewards pts credited.`,
      'success'
    );

    return newBooking;
  };

    const applyServerCreatedBooking: HotelContextType['applyServerCreatedBooking'] = ({
      booking,
      invoice,
      guestSession,
    }) => {
      setBookings((prev) => {
        const filtered = prev.filter((b) => b.id !== booking.id && b.bookingCode !== booking.bookingCode);
        return [booking, ...filtered];
      });

      if (booking.assignedRoomNumber) {
        setRoomUnits((prev) =>
          prev.map((u) =>
            u.roomNumber === booking.assignedRoomNumber
              ? {
                  ...u,
                  occupancyStatus: 'reserved',
                  currentGuestName: booking.guestName,
                  currentBookingCode: booking.bookingCode,
                }
              : u
          )
        );
      }

      if (invoice) {
        setInvoices((prev) => {
          const filtered = prev.filter((i) => i.id !== invoice.id);
          return [invoice, ...filtered];
        });
      }

      if (guestSession) {
        setGuestSessions((prev) => [
          guestSession,
          ...prev.filter((s) => s.roomNumber !== guestSession.roomNumber),
        ]);
      }

      const popupPayload = { booking, triggeredAt: new Date().toISOString() };
      setLatestBookingPopup(popupPayload);
      showToast(
        'Reservation Confirmed!',
        `Booking ${booking.bookingCode} saved${booking.assignedRoomNumber ? ` · Room ${booking.assignedRoomNumber} Assigned` : ''}.`,
        'success'
      );
    };

    const updateBookingStatus = (bookingId: string, status: BookingStatus) => {
      const target = bookings.find((b) => b.id === bookingId);

      setBookings((prev) =>
        prev.map((b) => {
          if (b.id === bookingId) {
            return { ...b, bookingStatus: status };
          }
          return b;
        })
      );

      if (backendAvailableRef.current) {
        fetch(`/api/bookings/${encodeURIComponent(bookingId)}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ status }),
        }).catch(() => {});
      }

      if (target) {
        if (status === 'checked-in') {
          if (target.assignedRoomNumber) {
            checkInRoomUnit(target.assignedRoomNumber, target.guestName, target.bookingCode);
          }
          triggerVipCheckInAlertIfFlagged({
            guestName: target.guestName,
            guestEmail: target.guestEmail,
            guestPhone: target.guestPhone,
            roomNumber: target.assignedRoomNumber,
            bookingCode: target.bookingCode,
          });
          dispatchOperationalAlert({
            title: 'Guest Check-In Completed',
            message: `${target.guestName} checked in (${target.bookingCode})${target.assignedRoomNumber ? ` to Room ${target.assignedRoomNumber}` : ''}. Keycard & passcode active.`,
            type: 'check_in',
            targetRoles: ['super_admin', 'admin', 'hotel_manager', 'receptionist', 'restaurant_owner'],
            bookingCode: target.bookingCode,
            roomNumber: target.assignedRoomNumber,
          });
        } else if (status === 'checked-out') {
          if (target.assignedRoomNumber) {
            checkOutRoomUnit(target.assignedRoomNumber);
            checkoutAndResetRoomPasscode(target.assignedRoomNumber);
          } else {
            triggerPostCheckoutSurvey({
              bookingCode: target.bookingCode,
              roomNumber: 'Unassigned',
              roomName: target.roomName,
              guestName: target.guestName,
              guestEmail: target.guestEmail,
              guestPhone: target.guestPhone,
              checkOutDate: target.checkOutDate,
              channels: ['email', 'sms'],
              triggerMode: 'auto_checkout',
            });
          }
          dispatchOperationalAlert({
            title: 'Guest Check-Out Completed',
            message: `${target.guestName} checked out (${target.bookingCode})${target.assignedRoomNumber ? ` from Room ${target.assignedRoomNumber}` : ''}. Room marked for turnaround.`,
            type: 'check_out',
            targetRoles: ['super_admin', 'admin', 'hotel_manager', 'receptionist', 'restaurant_owner', 'housekeeping'],
            bookingCode: target.bookingCode,
            roomNumber: target.assignedRoomNumber,
          });
        }

        addAuditLog(
          `Booking Status Changed: ${status}`,
          'booking',
          `Reservation ${target.bookingCode} for ${target.guestName} status changed to ${status}.`
        );
        showToast('Booking Updated', `Status changed to ${status.toUpperCase()} for ${target.guestName}`);
      }
    };

  const markBookingEmailSent = (bookingId: string, sent: boolean) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, emailSent: sent } : b))
    );
  };

  const resendBookingConfirmationEmail = async (
    booking: Booking
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const subtotalFormatted = formatCurrency(booking.subtotal, booking.currency);
      const serviceChargeNum = Math.round(booking.subtotal * 0.1 * 100) / 100;
      const serviceChargeFormatted = formatCurrency(serviceChargeNum, booking.currency);
      const taxFormatted = formatCurrency(booking.taxAmount, booking.currency);
      const totalFormatted = formatCurrency(booking.totalAmount, booking.currency);

      const res = await fetch('/api/bookings/send-confirmation-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          bookingCode: booking.bookingCode,
          guestName: booking.guestName,
          guestEmail: booking.guestEmail,
          guestPhone: booking.guestPhone,
          roomName: booking.roomName,
          assignedRoomNumber: booking.assignedRoomNumber || '',
          checkInDate: booking.checkInDate,
          checkOutDate: booking.checkOutDate,
          nights: booking.nights,
          adults: booking.adults,
          children: booking.children,
          currency: booking.currency,
          roomSubtotalFormatted: subtotalFormatted,
          addons: (booking.addons || []).map((a) => ({
            name: a.name,
            priceFormatted: formatCurrency(
              convertPrice(a.priceUSD, booking.currency, themeConfig.exchangeRates),
              booking.currency
            ),
          })),
          serviceChargeFormatted,
          taxFormatted,
          totalAmountFormatted: totalFormatted,
          paymentMethod: booking.paymentMethod,
          paymentStatus: booking.paymentStatus,
          specialRequests: booking.specialRequests || '',
          hotelName: themeConfig.hotelName,
          hotelAddress: themeConfig.address,
          hotelPhone: themeConfig.contactPhone,
          hotelEmail: themeConfig.contactEmail,
          panVatNumber: billSettings.panVatNumber,
          checkInTime: themeConfig.checkInTime,
          checkOutTime: themeConfig.checkOutTime,
          googleMapsUrl: themeConfig.googleMapsUrl,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.sent) {
        markBookingEmailSent(booking.id, true);
        addAuditLog(
          'Confirmation Email Dispatched',
          'booking',
          `Sent reservation voucher (${booking.bookingCode}) to ${booking.guestEmail}.`
        );
        showToast(
          'Confirmation Email Sent',
          `Luxury voucher delivered to ${booking.guestEmail} for ${booking.bookingCode}.`,
          'success'
        );
        return { success: true, message: `Sent to ${booking.guestEmail}` };
      }
      const msg =
        data?.error ||
        data?.message ||
        'Configure SMTP in CMS -> Email & SMTP Settings to dispatch confirmation emails.';
      showToast('Email Not Sent', msg, 'warning');
      return { success: false, message: msg };
    } catch {
      const msg = 'Network error dispatching confirmation email.';
      showToast('Email Error', msg, 'error');
      return { success: false, message: msg };
    }
  };

  const updatePaymentStatus = (bookingId: string, status: PaymentStatus) => {
    setBookings((prev) =>
      prev.map((b) => {
        if (b.id === bookingId) {
          return { ...b, paymentStatus: status };
        }
        return b;
      })
    );
    const target = bookings.find((b) => b.id === bookingId);
    if (target) {
      addAuditLog(
        `Payment Status Changed: ${status}`,
        'payment',
        `Payment for booking ${target.bookingCode} marked as ${status}.`
      );
      showToast('Payment Status Updated', `Payment marked as ${status.toUpperCase()}`);
    }
  };

  // CMS Updates
  const updateThemeConfig = (updates: Partial<HotelThemeConfig>) => {
    setThemeConfig((prev) => ({ ...prev, ...updates }));
    persistSetting('theme', updates);
    addAuditLog('CMS Configuration Updated', 'cms', `Updated fields: ${Object.keys(updates).join(', ')}`);
    showToast('Settings Saved', 'Landing page content, rates, or theme updated dynamically.');
  };

  const addRoom = (roomData: Omit<Room, 'id'>) => {
    const newRoom: Room = {
      ...roomData,
      id: 'room-' + Math.random().toString(36).substring(2, 9),
    };
    setRooms((prev) => [...prev, newRoom]);
    persistCollectionItem('rooms', newRoom.id, newRoom);
    addAuditLog('New Room Created', 'cms', `Added room "${newRoom.name}" ($${newRoom.pricePerNightUSD}/night)`);
    showToast('Room Added', `${newRoom.name} added to catalog.`);
  };

  const updateRoom = (roomId: string, updates: Partial<Room>) => {
    const existing = rooms.find((r) => r.id === roomId);
    const updated = existing ? { ...existing, ...updates } : { id: roomId, ...updates };
    setRooms((prev) =>
      prev.map((r) => {
        if (r.id === roomId) {
          return { ...r, ...updates };
        }
        return r;
      })
    );
    persistCollectionItem('rooms', roomId, updated);
    const target = rooms.find((r) => r.id === roomId);
    addAuditLog('Room Specifications Modified', 'cms', `Updated "${target?.name || roomId}"`);
    showToast('Room Updated', 'Changes saved to live directory.');
  };

  const deleteRoom = (roomId: string) => {
    const target = rooms.find((r) => r.id === roomId);
    setRooms((prev) => prev.filter((r) => r.id !== roomId));
    removeCollectionItem('rooms', roomId);
    addAuditLog('Room Removed', 'cms', `Deleted room "${target?.name || roomId}" from active catalog.`);
    showToast('Room Deleted', `Removed from hotel inventory.`);
  };

  const addAmenity = (amenityData: Omit<AmenityItem, 'id'>) => {
    const newAmenity: AmenityItem = {
      ...amenityData,
      id: 'amenity-' + Math.random().toString(36).substring(2, 9),
    };
    setAmenities((prev) => [...prev, newAmenity]);
    persistCollectionItem('amenities', newAmenity.id, newAmenity);
    addAuditLog('Amenity Added', 'cms', `Added hotel facility: "${newAmenity.name}"`);
    showToast('Amenity Added', `${newAmenity.name} is now visible to guests.`);
  };

  const updateAmenity = (amenityId: string, updates: Partial<AmenityItem>) => {
    const existing = amenities.find((a) => a.id === amenityId);
    if (existing) persistCollectionItem('amenities', amenityId, { ...existing, ...updates });
    setAmenities((prev) =>
      prev.map((a) => (a.id === amenityId ? { ...a, ...updates } : a))
    );
    addAuditLog('Amenity Modified', 'cms', `Updated amenity ${amenityId}`);
    showToast('Amenity Updated', 'Details refreshed.');
  };

  const deleteAmenity = (amenityId: string) => {
    setAmenities((prev) => prev.filter((a) => a.id !== amenityId));
    removeCollectionItem('amenities', amenityId);
    addAuditLog('Amenity Removed', 'cms', `Deleted amenity ${amenityId}`);
    showToast('Amenity Removed', 'Amenity deleted.');
  };

  // Reviews CRUD
  const addReview = (reviewData: Omit<GuestReview, 'id' | 'date'>) => {
    const newReview: GuestReview = {
      ...reviewData,
      id: 'rev-' + Math.random().toString(36).substring(2, 9),
      date: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    };
    setReviews((prev) => [newReview, ...prev]);
    persistCollectionItem('reviews', newReview.id, newReview);
    addAuditLog('Guest Review Added', 'cms', `Added review by ${newReview.author}`);
    showToast('Review Added', 'Review published to landing page.');
  };

  const updateReview = (id: string, updates: Partial<GuestReview>) => {
    const existing = reviews.find((r) => r.id === id);
    if (existing) persistCollectionItem('reviews', id, { ...existing, ...updates });
    setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
    addAuditLog('Guest Review Modified', 'cms', `Updated review ${id}`);
    showToast('Review Updated', 'Review changes saved.');
  };

  const deleteReview = (id: string) => {
    setReviews((prev) => prev.filter((r) => r.id !== id));
    removeCollectionItem('reviews', id);
    addAuditLog('Guest Review Deleted', 'cms', `Removed review ${id}`);
    showToast('Review Removed', 'Review deleted from site.');
  };

  // FAQs CRUD
  const addFaq = (faqData: Omit<FaqItem, 'id'>) => {
    const newFaq: FaqItem = {
      ...faqData,
      id: 'faq-' + Math.random().toString(36).substring(2, 9),
    };
    setFaqs((prev) => [...prev, newFaq]);
    persistCollectionItem('faqs', newFaq.id, newFaq);
    addAuditLog('FAQ Added', 'cms', `Added FAQ: "${newFaq.question}"`);
    showToast('FAQ Added', 'FAQ added to landing page.');
  };

  const updateFaq = (id: string, updates: Partial<FaqItem>) => {
    const existing = faqs.find((f) => f.id === id);
    if (existing) persistCollectionItem('faqs', id, { ...existing, ...updates });
    setFaqs((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));
    addAuditLog('FAQ Modified', 'cms', `Updated FAQ ${id}`);
    showToast('FAQ Updated', 'FAQ changes saved.');
  };

  const deleteFaq = (id: string) => {
    setFaqs((prev) => prev.filter((f) => f.id !== id));
    removeCollectionItem('faqs', id);
    addAuditLog('FAQ Deleted', 'cms', `Deleted FAQ ${id}`);
    showToast('FAQ Removed', 'FAQ removed from landing page.');
  };

  // Staff & RBAC (server-enforced Super Admin routes)
  const addStaff = async (userData: Omit<StaffUser, 'id' | 'lastActive'> & { password?: string }) => {
    try {
      const res = await fetch('/api/auth/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: userData.name,
          username: userData.username,
          email: userData.email,
          phone: userData.phone,
          password: userData.password,
          role: userData.role,
          department: userData.department,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok || !data?.user) {
        showToast('Access Denied', data?.error || 'Super Admin authentication required to create staff accounts.', 'error');
        return;
      }
      setStaff((prev) => [...prev, data.user as StaffUser]);
      addAuditLog('Staff Member Added', 'staff', `Added ${data.user.name} with role ${data.user.role}`);
      showToast('Staff Member Added', `${data.user.name} added to hotel operations team.`, 'success');
    } catch {
      showToast('Network Error', 'Unable to reach authentication server to add staff account.', 'error');
    }
  };

  const updateStaffRoleAndPermissions = async (
    staffId: string,
    role: StaffRole,
    permissions: string[],
    status?: 'active' | 'on-leave' | 'inactive'
  ) => {
    try {
      const res = await fetch(`/api/auth/staff/${encodeURIComponent(staffId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role, status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok || !data?.user) {
        showToast('Access Denied', data?.error || 'Super Admin privileges required to change staff roles.', 'error');
        return;
      }
      setStaff((prev) =>
        prev.map((s) => (s.id === staffId ? { ...(data.user as StaffUser), permissions: data.user.permissions || permissions } : s))
      );
      addAuditLog(
        'Staff Role & RBAC Updated',
        'security',
        `Updated role for ${data.user.name} to "${role}" (${permissions.length} permissions).`
      );
      showToast('Permissions Updated', `Role updated for ${data.user.name}`, 'success');
    } catch {
      showToast('Network Error', 'Unable to update staff role on server.', 'error');
    }
  };

  const deleteStaff = async (staffId: string) => {
    const target = staff.find((s) => s.id === staffId);
    try {
      const res = await fetch(`/api/auth/staff/${encodeURIComponent(staffId)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        showToast('Access Denied', data?.error || 'Super Admin privileges required to remove staff.', 'error');
        return;
      }
      setStaff((prev) => prev.filter((s) => s.id !== staffId));
      addAuditLog('Staff Member Removed', 'security', `Removed staff member ${target?.name || staffId}`);
      showToast('Staff Removed', 'Member deleted from access registry.', 'success');
    } catch {
      showToast('Network Error', 'Unable to remove staff member on server.', 'error');
    }
  };

  // Supabase Connection & Sync
  const connectSupabase = async (url: string, key: string): Promise<{ success: boolean; message: string }> => {
    const result = await testSupabaseConnection(url, key);
    if (result.success) {
      updateThemeConfig({
        supabaseUrl: url,
        supabaseAnonKey: key,
        supabaseConnected: true,
      });
      addAuditLog('Supabase Backend Connected', 'security', `Connected to Supabase project at ${url.substring(0, 24)}...`);
      showToast('Supabase Connected!', 'Backend database & Auth initialized.', 'success');
    } else {
      updateThemeConfig({ supabaseConnected: false });
      showToast('Connection Failed', result.message, 'warning');
    }
    return result;
  };

  const syncWithSupabase = async (): Promise<{ success: boolean; message: string }> => {
    const client = getSupabaseClient(themeConfig.supabaseUrl, themeConfig.supabaseAnonKey);
    if (!client) {
      return { success: false, message: 'Please connect to Supabase first in the Supabase tab.' };
    }

    const startTime = performance.now();
    try {
      // Map all rooms into a batch array (O(1) payload instead of N sequential requests)
      const roomPayloads = rooms.map((room) => ({
        id: room.id,
        name: room.name,
        slug: room.slug,
        type: room.type,
        price_per_night: room.pricePerNightUSD,
        original_price: room.originalPriceUSD || null,
        max_guests: room.maxGuests,
        bed_type: room.bedType,
        size_sq_ft: room.sizeSqFt,
        view: room.view,
        floor: room.floor,
        total_units: room.totalUnits,
        available_units: room.availableUnits,
        rating: room.rating,
        reviews_count: room.reviewsCount,
        description: room.description,
        images: room.images,
        amenities: room.amenities,
        is_featured: room.isFeatured || false,
      }));

      // Concurrent batch synchronization
      const [configRes, roomsRes] = await Promise.all([
        client.from('hotel_config').upsert({
          id: 'main_config',
          config: themeConfig,
          updated_at: new Date().toISOString(),
        }),
        client.from('rooms').upsert(roomPayloads, { onConflict: 'id' }),
      ]);

      const duration = performance.now() - startTime;

      if (configRes.error || roomsRes.error) {
        const err = configRes.error?.message || roomsRes.error?.message || 'Sync failed';
        performanceTracker.recordApiCall({
          endpoint: 'supabase: batch_sync (rooms + config)',
          method: 'UPSERT',
          status: 'error',
          durationMs: duration,
          source: 'supabase',
          isCacheHit: false,
          statusCode: 500,
          details: err,
        });
        throw new Error(err);
      }

      // Record successful batch telemetry & invalidate queries
      performanceTracker.recordApiCall({
        endpoint: 'supabase: batch_sync (rooms + config)',
        method: 'UPSERT',
        status: 'success',
        durationMs: duration,
        source: 'supabase',
        isCacheHit: false,
        statusCode: 200,
        details: `Batched ${rooms.length} room rows and configuration into 1 parallel HTTP transaction (${Math.round(duration)}ms)`,
      });

      queryClient.invalidateQueries({ queryKey: ['supabase'] });

      addAuditLog('Supabase Data Synced', 'security', `Synced ${rooms.length} rooms & config to Supabase PostgreSQL in ${Math.round(duration)}ms.`);
      showToast('Supabase Synced', `Batched ${rooms.length} rooms & config synced in ${Math.round(duration)}ms!`, 'success');
      return { success: true, message: `Successfully synced ${rooms.length} rooms and config in ${Math.round(duration)}ms!` };
    } catch (err: any) {
      console.error(err);
      return { success: false, message: err.message || 'Sync failed.' };
    }
  };

  const openLoginModal = (preferredRole?: StaffRole) => {
    setLoginModalTargetRole(preferredRole);
    setIsLoginModalOpen(true);
  };

  const closeLoginModal = () => {
    setIsLoginModalOpen(false);
  };

  const loginStaff = async (
    usernameOrEmail: string,
    password: string
  ): Promise<{ success: boolean; message: string; user?: StaffUser }> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          usernameOrEmail: usernameOrEmail.trim(),
          password,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok || !data?.user) {
        return {
          success: false,
          message: data?.message || data?.error || 'Authentication failed. Check username/email and password.',
        };
      }

      const authenticatedUser = data.user as StaffUser;

      // Sync Supabase browser session alongside server cookie when Supabase Auth is active
      if (
        authenticatedUser.authSource === 'supabase' &&
        themeConfig.supabaseConnected &&
        themeConfig.supabaseUrl &&
        themeConfig.supabaseAnonKey
      ) {
        const client = getSupabaseClient(themeConfig.supabaseUrl, themeConfig.supabaseAnonKey);
        if (client) {
          await client.auth
            .signInWithPassword({
              email: authenticatedUser.email,
              password,
            })
            .catch(() => {});
        }
      }

      setActiveUser(authenticatedUser);
      setActiveRole(authenticatedUser.role);
      setIsStaffLoggedIn(true);
      setIsLoginModalOpen(false);
      localStorage.removeItem('kamal_hotel_session');

      await refreshBootstrapFromServer();
      await hydrateAuthorizedStaffContext(authenticatedUser.role);

      addAuditLog(
        'Staff Authentication Success',
        'security',
        `${authenticatedUser.name} (${authenticatedUser.role}) authenticated via ${authenticatedUser.authSource || 'server_jwt'}.`
      );

      showToast(
        'Signed In Successfully',
        `Namaste ${authenticatedUser.name}! Active role: ${authenticatedUser.role.replace('_', ' ').toUpperCase()}`,
        'success'
      );

      return { success: true, message: 'Login successful!', user: authenticatedUser };
    } catch {
      return {
        success: false,
        message: 'Unable to reach authentication server. Please verify the backend service is running.',
      };
    }
  };

  const logoutStaff = async () => {
    const prevName = activeUser?.name || 'Staff User';
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {
      // Proceed cleanly with local state clearance
    }
    setActiveRole('guest');
    setActiveUser(null);
    setIsStaffLoggedIn(false);
    localStorage.removeItem('kamal_hotel_session');
    await refreshBootstrapFromServer();

    if (themeConfig.supabaseConnected && themeConfig.supabaseUrl && themeConfig.supabaseAnonKey) {
      const client = getSupabaseClient(themeConfig.supabaseUrl, themeConfig.supabaseAnonKey);
      if (client) {
        client.auth.signOut().catch(() => {});
      }
    }

    addAuditLog('Staff Logged Out', 'security', `${prevName} signed out of the operations console.`);
    showToast('Signed Out', 'Returned to guest portal.', 'info');
  };

  const changeUserPassword = async (userId: string, newPass: string) => {
    const target = staff.find((s) => s.id === userId);
    try {
      const res = await fetch(`/api/auth/staff/${encodeURIComponent(userId)}/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password: newPass }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        showToast('Password Update Failed', data?.error || 'Super Admin privileges required.', 'error');
        return;
      }
      addAuditLog('Staff Password Updated', 'security', `Password rotated securely for ${target?.name || userId}`);
      showToast('Password Updated', `New credentials saved for ${target?.name || 'staff user'}`, 'success');
    } catch {
      showToast('Network Error', 'Unable to update staff password on server.', 'error');
    }
  };

  // ----------------- RESTAURANT & DINING ACTIONS -----------------
  const addMenuItem = (item: Omit<MenuItem, 'id'>) => {
    const newItem: MenuItem = {
      ...item,
      id: 'menu-' + Date.now(),
    };
    setMenuItems((prev) => [...prev, newItem]);
    persistCollectionItem('menuItems', newItem.id, newItem);
    addAuditLog('Menu Item Added', 'cms', `Added dish: ${item.name} (${item.category})`);
    showToast('Dish Added', `${item.name} is now available in the restaurant menu.`);
  };

  const updateMenuItem = (id: string, updates: Partial<MenuItem>) => {
    const existing = menuItems.find((m) => m.id === id);
    if (existing) persistCollectionItem('menuItems', id, { ...existing, ...updates });
    setMenuItems((prev) => prev.map((m) => (m.id === id ? { ...m, ...updates } : m)));
    showToast('Menu Updated', 'Dish details updated successfully.');
  };

  const deleteMenuItem = (id: string) => {
    const found = menuItems.find((m) => m.id === id);
    setMenuItems((prev) => prev.filter((m) => m.id !== id));
    removeCollectionItem('menuItems', id);
    addAuditLog('Menu Item Deleted', 'cms', `Removed dish: ${found?.name}`);
    showToast('Dish Removed', 'Item deleted from menu.', 'info');
  };

  const placeRestaurantOrder = (orderData: Omit<RestaurantOrder, 'id' | 'orderNumber' | 'createdAt' | 'status'>): RestaurantOrder => {
    const orderNum = 'KHO-' + Math.floor(1000 + Math.random() * 9000);
    const newOrder: RestaurantOrder = {
      ...orderData,
      id: 'order-' + Date.now(),
      orderNumber: orderNum,
      createdAt: new Date().toISOString(),
      status: 'placed',
    };

    setRestaurantOrders((prev) => [newOrder, ...prev]);
    persistCollectionItem('restaurantOrders', newOrder.id, newOrder);

    // Update table status if dine-in
    if (newOrder.destination === 'rooftop_table' || newOrder.destination === 'courtyard') {
      setRestaurantTables((prev) =>
        prev.map((t) => {
          if (t.tableNumber === newOrder.tableOrRoomNo || t.id === newOrder.tableOrRoomNo) {
            return {
              ...t,
              status: 'order_placed',
              currentOrderId: newOrder.id,
              guestName: newOrder.guestName,
              seatedAt: t.seatedAt || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };
          }
          return t;
        })
      );
    }

    // Auto-charge to guest room folio if room destination or charge_to_room payment
    if (newOrder.paymentMode === 'charge_to_room' || newOrder.destination === 'room') {
      const cleanRoom = newOrder.roomNumber || newOrder.tableOrRoomNo;
      setInvoices((prev) => {
        const existingIdx = prev.findIndex(
          (inv) => inv.roomNumber.toLowerCase().includes(cleanRoom.toLowerCase()) || 
                   inv.guestName.toLowerCase() === newOrder.guestName.toLowerCase()
        );

        const newLineItem: BillItemLine = {
          id: 'li-ord-' + newOrder.id,
          description: `Ground-Floor Dining KOT #${orderNum} (${newOrder.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')})`,
          category: 'restaurant_dining',
          date: new Date().toISOString().split('T')[0],
          quantity: 1,
          rateUSD: newOrder.subtotalUSD,
          amountUSD: newOrder.subtotalUSD,
        };

        if (existingIdx !== -1) {
          const inv = prev[existingIdx];
          const updatedItems = [...inv.items, newLineItem];
          const newSubtotal = updatedItems.reduce((acc, i) => acc + i.amountUSD, 0);
          const discAmount = (newSubtotal * inv.discountPercent) / 100;
          const discountedSub = newSubtotal - discAmount;
          const scAmount = (discountedSub * inv.serviceChargePercent) / 100;
          const vatBase = discountedSub + scAmount;
          const taxAmount = (vatBase * inv.taxPercent) / 100;
          const grandTotal = Math.round((vatBase + taxAmount) * 100) / 100;
          const balance = Math.max(0, grandTotal - inv.amountPaidUSD);

          const updatedInv: MasterInvoice = {
            ...inv,
            items: updatedItems,
            subtotalUSD: newSubtotal,
            discountAmountUSD: discAmount,
            serviceChargeAmountUSD: scAmount,
            taxAmountUSD: taxAmount,
            grandTotalUSD: grandTotal,
            balanceDueUSD: balance,
          };

          const clone = [...prev];
          clone[existingIdx] = updatedInv;
          return clone;
        } else {
          // Create new invoice for room
          const disc = 0;
          const sub = newOrder.subtotalUSD;
          const sc = sub * 0.10;
          const vat = (sub + sc) * 0.13;
          const grand = Math.round((sub + sc + vat) * 100) / 100;

          const createdInv: MasterInvoice = {
            id: 'inv-' + Date.now(),
            invoiceNumber: 'KH-INV-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000),
            bookingCode: 'STAY-ROOM-' + cleanRoom.replace(/[^0-9]/g, ''),
            roomNumber: cleanRoom.startsWith('Room') ? cleanRoom : `Room ${cleanRoom}`,
            guestName: newOrder.guestName || 'In-House Guest',
            guestEmail: 'guest@kamalhotel.np',
            guestPhone: '+977 98',
            checkInDate: new Date().toISOString().split('T')[0],
            checkOutDate: new Date().toISOString().split('T')[0],
            issuedAt: new Date().toLocaleString(),
            items: [newLineItem],
            subtotalUSD: sub,
            discountPercent: 0,
            discountAmountUSD: 0,
            serviceChargePercent: 10,
            serviceChargeAmountUSD: sc,
            taxPercent: 13,
            taxAmountUSD: vat,
            grandTotalUSD: grand,
            amountPaidUSD: 0,
            balanceDueUSD: grand,
            paymentStatus: 'pending',
            paymentMethod: 'onsite',
          };
          return [createdInv, ...prev];
        }
      });
    }

    // Dispatch automated in-app notifications to waiter, chef, and receptionist
    const notifMessage = `New Order #${orderNum} from ${newOrder.tableOrRoomNo} (${newOrder.guestName}): ${newOrder.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}. Mode: ${newOrder.paymentMode}.`;
    
    // Add to notifications queue
    const notif: NotificationRecord = {
      id: 'notif-' + Date.now(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      recipient: `Kitchen & Service Crew (${newOrder.tableOrRoomNo})`,
      channel: 'push',
      subject: `Kitchen Alert: Order #${orderNum}`,
      message: notifMessage,
      status: 'delivered',
      bookingCode: orderNum,
    };
    setNotifications((prev) => [notif, ...prev]);

    // Append to guest chat log
    setGuestChatMessages((prev) => [
      ...prev,
      {
        id: 'msg-' + Date.now(),
        sender: 'concierge',
        roomNumber: newOrder.tableOrRoomNo,
        guestName: 'Ground-Floor Kitchen & Waiter',
        text: `✅ Order #${orderNum} received! Our chef is preparing your dishes. Estimated delivery time: 20-25 mins.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        serviceTag: 'room_service',
      },
    ]);

    // Dispatch operational alert to Service Requests queue staff, kitchen, waiter, and management
    dispatchOperationalAlert({
      title: 'New Dining Order → Service Requests Queue',
      message: `${newOrder.tableOrRoomNo} (${newOrder.guestName}): ${newOrder.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')} ($${newOrder.totalAmountUSD.toFixed(2)}). Mode: ${newOrder.paymentMode}.`,
      type: 'dining_order',
      targetRoles: ['super_admin', 'admin', 'hotel_manager', 'restaurant_owner', 'receptionist', 'chef', 'waiter'],
      roomNumber: newOrder.roomNumber || newOrder.tableOrRoomNo,
    });

    addAuditLog('Room Dining Order Placed', 'booking', `Order #${orderNum} for ${newOrder.tableOrRoomNo} ($${newOrder.totalAmountUSD.toFixed(2)})`);

    if (newOrder.guestName && newOrder.guestName.toLowerCase() !== 'walk-in') {
      const diningPts = Math.max(10, Math.round(newOrder.totalAmountUSD * 10));
      adjustLoyaltyPoints({
        guestName: newOrder.guestName,
        pointsDelta: diningPts,
        reason: `Dining Order #${orderNum} (${newOrder.tableOrRoomNo})`,
        transactionType: 'dining_earn',
        silentToast: true,
      });
    }

    showToast(`Order #${orderNum} Placed!`, `Routed to Staff Service Requests Queue & Kitchen. Total: $${newOrder.totalAmountUSD.toFixed(2)}`, 'success');
    return newOrder;
  };

  const updateOrderStatus = (orderId: string, status: RestaurantOrder['status'], waiterName?: string) => {
    setRestaurantOrders((prev) =>
      prev.map((ord) => {
        if (ord.id === orderId) {
          return {
            ...ord,
            status,
            waiterAssigned: waiterName || ord.waiterAssigned,
          };
        }
        return ord;
      })
    );

    // If order begins preparation, deplete kitchen ingredients automatically
    if (status === 'preparing') {
      setStockItems((prev) =>
        prev.map((s) => {
          if (s.category === 'Kitchen Ingredients' && s.currentStock > 2) {
            return { ...s, currentStock: s.currentStock - 1 };
          }
          return s;
        })
      );
    }

    const target = restaurantOrders.find((o) => o.id === orderId);
    if (target) {
      persistCollectionItem('restaurantOrders', orderId, { ...target, status, waiterAssigned: waiterName || target.waiterAssigned });
    }
    if (target && status === 'ready_for_delivery') {
      dispatchOperationalAlert({
        title: `KOT Ready: #${target.orderNumber}`,
        message: `Kitchen completed Order #${target.orderNumber} for ${target.tableOrRoomNo} (${target.guestName}). Ready for waiter pickup & delivery.`,
        type: 'kot',
        targetRoles: ['waiter', 'receptionist', 'restaurant_owner'],
        roomNumber: target.roomNumber || target.tableOrRoomNo,
      });
    }
    showToast('Order Status Updated', `Order #${target?.orderNumber} is now: ${status.replace('_', ' ').toUpperCase()}`, 'info');
  };

  // ----------------- OPERATIONAL EXTENSIONS (TABLES, HOUSEKEEPING, NIGHT AUDIT) -----------------
  const updateTableStatus = (tableId: string, status: TableStatus, guestName?: string, waiterName?: string, notes?: string) => {
    setRestaurantTables((prev) =>
      prev.map((t) => {
        if (t.id === tableId) {
          const updated = {
            ...t,
            status,
            guestName: guestName !== undefined ? guestName : t.guestName,
            waiterName: waiterName !== undefined ? waiterName : t.waiterName,
            notes: notes !== undefined ? notes : t.notes,
            seatedAt: status === 'seated' || status === 'order_placed' ? (t.seatedAt || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })) : t.seatedAt,
          };
          persistCollectionItem('tables', tableId, updated);
          return updated;
        }
        return t;
      })
    );
    const tbl = restaurantTables.find((t) => t.id === tableId);
    addAuditLog('Table Status Changed', 'cms', `${tbl?.tableNumber} (${tbl?.zone}) changed to ${status.toUpperCase()}`);
    showToast(`Table ${tbl?.tableNumber}`, `Status updated to ${status.replace('_', ' ').toUpperCase()}`, 'info');
  };

  const clearTable = (tableId: string) => {
    setRestaurantTables((prev) =>
      prev.map((t) => {
        if (t.id === tableId) {
          const cleared: RestaurantTable = {
            ...t,
            status: 'vacant',
            currentOrderId: undefined,
            guestName: undefined,
            waiterName: undefined,
            seatedAt: undefined,
            notes: undefined,
          };
          persistCollectionItem('tables', tableId, cleared);
          return cleared;
        }
        return t;
      })
    );
    const tbl = restaurantTables.find((t) => t.id === tableId);
    showToast(`Table ${tbl?.tableNumber} Cleared`, 'Table is now vacant and clean.', 'success');
  };

  const addRestaurantTable = (table: Omit<RestaurantTable, 'id'>) => {
    const newTbl: RestaurantTable = {
      ...table,
      id: 'tbl-' + Date.now(),
    };
    setRestaurantTables((prev) => [...prev, newTbl]);
    persistCollectionItem('tables', newTbl.id, newTbl);
    showToast('Table Registered', `Dining table ${table.tableNumber} added to floor plan.`, 'success');
  };

  const updateRoomCleanStatus = (
    unitId: string,
    cleanStatus: RoomCleanlinessStatus,
    housekeeper?: string,
    inspector?: string,
    notes?: string
  ) => {
    setRoomUnits((prev) =>
      prev.map((u) => {
        if (u.id === unitId) {
          const updated = {
            ...u,
            cleanStatus,
            assignedHousekeeper: housekeeper || u.assignedHousekeeper,
            inspectedBy: inspector || u.inspectedBy,
            maintenanceNote: notes !== undefined ? notes : u.maintenanceNote,
            lastCleanedAt: cleanStatus === 'clean' || cleanStatus === 'inspected' ? `Today ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : u.lastCleanedAt,
          };
          persistCollectionItem('roomUnits', unitId, updated);
          return updated;
        }
        return u;
      })
    );
    const unit = roomUnits.find((u) => u.id === unitId);
    addAuditLog('Housekeeping Status Updated', 'booking', `Room ${unit?.roomNumber} marked ${cleanStatus.toUpperCase()}`);
    showToast(`Room ${unit?.roomNumber}`, `Housekeeping status: ${cleanStatus.replace('_', ' ').toUpperCase()}`, 'info');
  };

  const findVipProfile: HotelContextType['findVipProfile'] = (
    guestEmail,
    guestName,
    guestPhone
  ) => {
    const cleanEmail = (guestEmail || '').trim().toLowerCase();
    const cleanName = (guestName || '').trim().toLowerCase();
    const cleanPhone = (guestPhone || '').replace(/\s+/g, '');

    return vipGuestProfiles.find((vip) => {
      if (!vip.isActive) return false;
      if (cleanEmail && vip.guestEmail.toLowerCase() === cleanEmail) return true;
      if (cleanPhone && vip.guestPhone && vip.guestPhone.replace(/\s+/g, '') === cleanPhone) return true;
      if (cleanName && vip.guestName.toLowerCase() === cleanName) return true;
      return false;
    });
  };

  const formatVipTierLabel = (tier: VipTier) => {
    switch (tier) {
      case 'returning_vip':
        return 'Returning VIP';
      case 'high_value':
        return 'High-Value Guest';
      case 'vvip_executive':
        return 'VVIP Executive';
      case 'corporate_account':
        return 'Corporate VIP';
      default:
        return 'VIP';
    }
  };

  const triggerVipCheckInAlertIfFlagged = (params: {
    guestName: string;
    guestEmail?: string;
    guestPhone?: string;
    roomNumber?: string;
    bookingCode?: string;
  }) => {
    const matchedBooking = params.bookingCode
      ? bookings.find((b) => b.bookingCode.toLowerCase() === params.bookingCode?.toLowerCase())
      : undefined;

    const vip = findVipProfile(
      params.guestEmail || matchedBooking?.guestEmail,
      params.guestName,
      params.guestPhone || matchedBooking?.guestPhone
    );

    if (!vip) return;

    const nowMs = Date.now();
    const dedupKey = `${vip.id}::${params.bookingCode || params.roomNumber || vip.guestName}`;
    const prevTs = recentVipAlertRef.current.get(dedupKey);
    if (prevTs && nowMs - prevTs < 5000) {
      return;
    }
    recentVipAlertRef.current.set(dedupKey, nowMs);

    const tierLabel = formatVipTierLabel(vip.tier);
    const roomLabel = params.roomNumber ? `Room ${params.roomNumber}` : 'Front Desk Check-In';
    const stamp = new Date().toISOString().replace('T', ' ').substring(0, 16);

    setVipGuestProfiles((prev) =>
      prev.map((v) =>
        v.id === vip.id
          ? {
              ...v,
              lastAlertTriggeredAt: stamp,
              staysCount: v.staysCount + 1,
            }
          : v
      )
    );

    dispatchOperationalAlert({
      title: `VIP Check-In Alert: ${vip.guestName} (${tierLabel})`,
      message: `${roomLabel} (${params.bookingCode || 'Walk-In'}) · ${vip.alertMessage || vip.preferences}`,
      type: 'vip_checkin',
      targetRoles: ['super_admin', 'admin', 'hotel_manager', 'receptionist', 'housekeeping', 'restaurant_owner', 'waiter'],
      linkTab: 'vip_guests',
      bookingCode: params.bookingCode,
      roomNumber: params.roomNumber,
    });

    addAuditLog(
      'VIP Check-In Alert Triggered',
      'booking',
      `Flagged ${tierLabel} ${vip.guestName} checked in (${roomLabel}). Instructions: ${vip.alertMessage || vip.preferences}`
    );

    showToast(
      `VIP Arrival Alert · ${tierLabel}`,
      `${vip.guestName} arriving in ${roomLabel}: ${vip.alertMessage || vip.preferences}`,
      'warning'
    );
  };

  const checkInRoomUnit = (roomNumber: string, guestName: string, bookingCode: string) => {
    setRoomUnits((prev) =>
      prev.map((u) => {
        if (u.roomNumber === roomNumber) {
          return {
            ...u,
            occupancyStatus: 'occupied',
            cleanStatus: 'clean',
            currentGuestName: guestName,
            currentBookingCode: bookingCode,
            checkInDate: new Date().toISOString().split('T')[0],
          };
        }
        return u;
      })
    );
    addAuditLog('Front Desk Check-In', 'booking', `Guest ${guestName} checked into Room ${roomNumber} (${bookingCode})`);
    showToast('Check-In Complete', `Room ${roomNumber} assigned to ${guestName}.`, 'success');
    triggerVipCheckInAlertIfFlagged({
      guestName,
      roomNumber,
      bookingCode,
    });
  };

  const triggerPostCheckoutSurvey: HotelContextType['triggerPostCheckoutSurvey'] = ({
    bookingCode,
    roomNumber,
    roomName,
    guestName,
    guestEmail,
    guestPhone,
    checkOutDate,
    channels = ['email', 'sms'],
    triggerMode = 'manual',
  }) => {
    if (triggerMode === 'auto_checkout' && !autoTriggerSurveyOnCheckout) {
      return null;
    }

    const dedupKey = `${bookingCode || 'walkin'}::${roomNumber}`;
    if (triggerMode === 'auto_checkout') {
      if (recentAutoSurveyRef.current.has(dedupKey)) {
        return null;
      }
      const alreadySent = surveys.some(
        (s) =>
          s.bookingCode === bookingCode &&
          s.roomNumber === roomNumber &&
          s.triggerMode === 'auto_checkout'
      );
      if (alreadySent) {
        return null;
      }
      recentAutoSurveyRef.current.add(dedupKey);
    }

    const now = new Date();
    const timestamp = now.toISOString().replace('T', ' ').substring(0, 19);
    const surveyToken = `SRV-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const resolvedOutDate = checkOutDate || now.toISOString().split('T')[0];

    const newSurvey: PostCheckoutSurvey = {
      id: 'srv-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
      surveyToken,
      bookingCode: bookingCode || `WALKIN-${roomNumber}`,
      roomNumber,
      roomName,
      guestName,
      guestEmail: guestEmail || 'guest@kamalhotel.com',
      guestPhone: guestPhone || '+977-9800000000',
      checkOutDate: resolvedOutDate,
      triggeredAt: timestamp.substring(0, 16),
      channels,
      triggerMode,
      status: 'sent',
    };

    setSurveys((prev) => [newSurvey, ...prev]);

    const dispatchedRecords: NotificationRecord[] = [];
    const hotelLabel = themeConfig.hotelName || 'Kamal Hotel';
    const surveyPath = `?survey=${surveyToken}`;

    if (channels.includes('email')) {
      dispatchedRecords.push({
        id: 'notif-srv-email-' + Math.random().toString(36).substring(2, 9),
        timestamp,
        recipient: newSurvey.guestEmail,
        channel: 'email',
        subject: `How was your stay at ${hotelLabel}, ${guestName}? (Ref: ${newSurvey.bookingCode})`,
        message: `Namaste ${guestName}, thank you for checking out of Room ${roomNumber} (${roomName}). Please share a 30-second rating of your stay & dining experience: ${surveyPath}`,
        status: 'delivered',
        bookingCode: newSurvey.bookingCode,
      });
    }

    if (channels.includes('sms')) {
      dispatchedRecords.push({
        id: 'notif-srv-sms-' + Math.random().toString(36).substring(2, 9),
        timestamp,
        recipient: newSurvey.guestPhone,
        channel: 'sms',
        subject: `Post-Checkout Survey SMS [${surveyToken}]`,
        message: `${hotelLabel}: Thank you for staying in Room ${roomNumber}! Rate cleanliness, hospitality & dining in 30s: ${surveyPath}`,
        status: 'delivered',
        bookingCode: newSurvey.bookingCode,
      });
    }

    if (dispatchedRecords.length > 0) {
      setNotifications((prev) => [...dispatchedRecords, ...prev]);
    }

    dispatchOperationalAlert({
      title: 'Post-Checkout Survey Sent',
      message: `${channels.map((c) => c.toUpperCase()).join(' + ')} satisfaction survey dispatched to ${guestName} (Room ${roomNumber}).`,
      type: 'survey_triggered',
      targetRoles: ['super_admin', 'admin', 'hotel_manager', 'receptionist'],
      linkTab: 'surveys',
      bookingCode: newSurvey.bookingCode,
      roomNumber,
    });

    addAuditLog(
      'Post-Checkout Survey Dispatched',
      'booking',
      `Sent ${channels.join(' & ').toUpperCase()} stay survey (${surveyToken}) to ${guestName} (${newSurvey.guestEmail}) for Room ${roomNumber}.`
    );

    showToast(
      'Post-Checkout Survey Sent',
      `${channels.map((c) => c.toUpperCase()).join(' & ')} rating link dispatched to ${guestName}.`,
      'success'
    );

    return newSurvey;
  };

  const submitGuestSurveyResponse: HotelContextType['submitGuestSurveyResponse'] = (
    surveyIdOrToken,
    payload
  ) => {
    const target = surveys.find(
      (s) => s.id === surveyIdOrToken || s.surveyToken === surveyIdOrToken
    );
    if (!target) return false;

    const completedAt = new Date().toISOString().replace('T', ' ').substring(0, 16);

    setSurveys((prev) =>
      prev.map((s) =>
        s.id === target.id
          ? {
              ...s,
              status: 'completed',
              completedAt,
              overallRating: payload.overallRating,
              ratings: payload.ratings,
              npsScore: payload.npsScore,
              wouldRecommend: payload.wouldRecommend,
              comment: payload.comment.trim(),
            }
          : s
      )
    );

    const isLowScore = payload.overallRating <= 3 || payload.npsScore <= 6;
    dispatchOperationalAlert({
      title: isLowScore ? 'Low Guest Survey Rating Alert' : 'New Guest Survey Feedback',
      message: `${target.guestName} (Room ${target.roomNumber}) rated their stay ${payload.overallRating}/5 stars (NPS ${payload.npsScore}/10).`,
      type: 'survey_submitted',
      targetRoles: ['super_admin', 'admin', 'hotel_manager', 'restaurant_owner'],
      linkTab: 'surveys',
      bookingCode: target.bookingCode,
      roomNumber: target.roomNumber,
    });

    addAuditLog(
      'Guest Survey Completed',
      'booking',
      `${target.guestName} submitted post-checkout rating (${payload.overallRating}/5, NPS ${payload.npsScore}) for Room ${target.roomNumber}.`
    );

    showToast(
      'Thank You for Your Feedback',
      `Stay survey recorded (${payload.overallRating}/5 stars). Manager dashboard updated.`,
      'success'
    );

    return true;
  };

  const publishSurveyToReviews = (surveyId: string) => {
    const target = surveys.find((s) => s.id === surveyId);
    if (!target || target.status !== 'completed' || target.publishedAsReview) return;

    addReview({
      author: target.guestName,
      role: `Verified Stay · Room ${target.roomNumber}`,
      location: themeConfig.city || 'Kathmandu, Nepal',
      quote:
        target.comment ||
        `Rated ${target.overallRating || 5}/5 stars for stay in ${target.roomName}.`,
      rating: target.overallRating || 5,
      isApproved: true,
    });

    setSurveys((prev) =>
      prev.map((s) => (s.id === surveyId ? { ...s, publishedAsReview: true } : s))
    );
  };

  const checkOutRoomUnit = (roomNumber: string) => {
    const unitBeforeCheckout = roomUnits.find((u) => u.roomNumber === roomNumber);
    const matchingBooking = bookings.find(
      (b) =>
        (unitBeforeCheckout?.currentBookingCode && b.bookingCode === unitBeforeCheckout.currentBookingCode) ||
        (b.assignedRoomNumber === roomNumber && b.bookingStatus === 'checked-in')
    );

    setRoomUnits((prev) =>
      prev.map((u) => {
        if (u.roomNumber === roomNumber) {
          return {
            ...u,
            occupancyStatus: 'vacant',
            cleanStatus: 'dirty',
            currentGuestName: undefined,
            currentBookingCode: undefined,
          };
        }
        return u;
      })
    );

    if (matchingBooking && matchingBooking.bookingStatus !== 'checked-out') {
      setBookings((prev) =>
        prev.map((b) =>
          b.id === matchingBooking.id ? { ...b, bookingStatus: 'checked-out' } : b
        )
      );
    }

    addAuditLog('Front Desk Check-Out', 'booking', `Room ${roomNumber} checked out and flagged DIRTY for housekeeping turnaround.`);
    showToast('Guest Checked Out', `Room ${roomNumber} vacated and flagged Dirty for Housekeeping.`, 'info');

    // Automated Post-Checkout Email & SMS Survey Trigger
    const guestName = unitBeforeCheckout?.currentGuestName || matchingBooking?.guestName;
    if (guestName) {
      const roomCatalog = rooms.find((r) => r.type === unitBeforeCheckout?.roomType);
      triggerPostCheckoutSurvey({
        bookingCode: unitBeforeCheckout?.currentBookingCode || matchingBooking?.bookingCode || `KH-${roomNumber}`,
        roomNumber,
        roomName: matchingBooking?.roomName || roomCatalog?.name || `Room ${roomNumber}`,
        guestName,
        guestEmail: matchingBooking?.guestEmail || `${guestName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@guest.kamalhotel.com`,
        guestPhone: matchingBooking?.guestPhone || themeConfig.contactPhone || '+977 9800000000',
        checkOutDate: matchingBooking?.checkOutDate || new Date().toISOString().split('T')[0],
        channels: ['email', 'sms'],
        triggerMode: 'auto_checkout',
      });
    }
  };

  const addFloor = (floorName: string): { success: boolean; message: string } => {
    const trimmed = floorName.trim();
    if (!trimmed) {
      return { success: false, message: 'Floor name cannot be empty.' };
    }
    if (floors.some((f) => f.toLowerCase() === trimmed.toLowerCase())) {
      const msg = `Floor "${trimmed}" already exists.`;
      showToast('Duplicate Floor', msg, 'error');
      return { success: false, message: msg };
    }
    setFloors((prev) => {
      const next = [...prev, trimmed];
      persistSetting('floors', { floors: next });
      return next;
    });
    addAuditLog('Added Hotel Floor', 'cms', `Created new floor: ${trimmed}`);
    showToast('Floor Added', `Floor "${trimmed}" is now configured.`, 'success');
    return { success: true, message: `Floor "${trimmed}" added successfully.` };
  };

  const deleteFloor = (floorName: string): { success: boolean; message: string } => {
    const trimmed = floorName.trim();
    const roomsOnFloor = roomUnits.filter((u) => u.floor.toLowerCase() === trimmed.toLowerCase());
    if (roomsOnFloor.length > 0) {
      const msg = `Cannot delete "${trimmed}" because it has ${roomsOnFloor.length} active room unit(s) (${roomsOnFloor.map((r) => r.roomNumber).join(', ')}). Delete or reassign these rooms first.`;
      showToast('Cannot Delete Floor', msg, 'error');
      return { success: false, message: msg };
    }
    setFloors((prev) => {
      const next = prev.filter((f) => f.toLowerCase() !== trimmed.toLowerCase());
      persistSetting('floors', { floors: next });
      return next;
    });
    addAuditLog('Deleted Hotel Floor', 'cms', `Removed floor: ${trimmed}`);
    showToast('Floor Deleted', `Floor "${trimmed}" removed from hotel layout.`, 'info');
    return { success: true, message: `Floor "${trimmed}" deleted successfully.` };
  };

  const addRoomUnit = (
    unitData: Omit<RoomOperationalUnit, 'id'>
  ): { success: boolean; message: string; unit?: RoomOperationalUnit } => {
    const cleanRoomNum = unitData.roomNumber.trim();
    if (!cleanRoomNum) {
      return { success: false, message: 'Room number is required.' };
    }
    if (roomUnits.some((u) => u.roomNumber.toLowerCase() === cleanRoomNum.toLowerCase())) {
      const msg = `Room unit "${cleanRoomNum}" already exists. Please choose a different number.`;
      showToast('Duplicate Room', msg, 'error');
      return { success: false, message: msg };
    }
    const newUnit: RoomOperationalUnit = {
      ...unitData,
      id: 'unit-' + cleanRoomNum.toLowerCase().replace(/\s+/g, '-'),
      roomNumber: cleanRoomNum,
      occupancyStatus: unitData.occupancyStatus || 'vacant',
      cleanStatus: unitData.cleanStatus || 'clean',
    };
    setRoomUnits((prev) => [...prev, newUnit]);
    persistCollectionItem('roomUnits', newUnit.id, newUnit);
    addAuditLog('Added Room Unit', 'cms', `Registered new physical room unit ${cleanRoomNum} on ${unitData.floor}`);
    showToast('Room Unit Added', `Room ${cleanRoomNum} on ${unitData.floor} registered.`, 'success');
    return { success: true, message: `Room unit ${cleanRoomNum} added successfully.`, unit: newUnit };
  };

  const updateRoomUnit = (unitId: string, updates: Partial<RoomOperationalUnit>) => {
    const existing = roomUnits.find((u) => u.id === unitId);
    if (existing) persistCollectionItem('roomUnits', unitId, { ...existing, ...updates });
    setRoomUnits((prev) => prev.map((u) => (u.id === unitId ? { ...u, ...updates } : u)));
    addAuditLog('Updated Room Unit', 'cms', `Updated room unit ID ${unitId}`);
    showToast('Room Updated', 'Room configuration updated.', 'info');
  };

  const deleteRoomUnit = (unitId: string): { success: boolean; message: string } => {
    const unit = roomUnits.find((u) => u.id === unitId);
    if (!unit) {
      return { success: false, message: 'Room unit not found.' };
    }
    if (unit.occupancyStatus === 'occupied') {
      const msg = `Cannot delete Room ${unit.roomNumber}: it is currently occupied by ${unit.currentGuestName || 'a guest'}. Perform checkout first.`;
      showToast('Action Blocked', msg, 'error');
      return { success: false, message: msg };
    }
    setRoomUnits((prev) => prev.filter((u) => u.id !== unitId));
    removeCollectionItem('roomUnits', unitId);
    addAuditLog('Deleted Room Unit', 'cms', `Deleted room unit ${unit.roomNumber} from ${unit.floor}`);
    showToast('Room Deleted', `Room ${unit.roomNumber} deleted from inventory.`, 'warning');
    return { success: true, message: `Room ${unit.roomNumber} deleted successfully.` };
  };

  const addLostFoundItem = (item: Omit<LostAndFoundItem, 'id'>): LostAndFoundItem => {
    const year = new Date().getFullYear();
    const randomSeq = Math.floor(1010 + Math.random() * 8900);
    const referenceId = item.referenceId?.trim() || `LF-${year}-${randomSeq}`;
    const newItem: LostAndFoundItem = {
      ...item,
      id: 'lf-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
      referenceId,
    };
    setLostAndFound((prev) => [newItem, ...prev]);
    addAuditLog(
      'Lost & Found Logged',
      'cms',
      `[${referenceId}] Logged item "${item.itemDescription}" found in ${item.roomNumber} -> Vault: ${item.storageLocation}`
    );
    showToast(
      `Lost & Found Logged (${referenceId})`,
      `Item safely deposited into ${item.storageLocation}. Recovery slip ready.`,
      'success'
    );
    return newItem;
  };

  const updateLostFoundStatus = (
    id: string,
    status: LostAndFoundItem['status'],
    claimedByOrMeta?: string | { claimedByName?: string; claimedByIdNumber?: string; contactPhone?: string }
  ) => {
    const meta =
      typeof claimedByOrMeta === 'string'
        ? { claimedByName: claimedByOrMeta }
        : claimedByOrMeta || {};
    const target = lostAndFound.find((l) => l.id === id);

    setLostAndFound((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            status,
            claimedByGuestName: meta.claimedByName || item.claimedByGuestName,
            claimedByIdNumber: meta.claimedByIdNumber || item.claimedByIdNumber,
            contactPhone: meta.contactPhone || item.contactPhone,
            claimedAt: status === 'claimed' ? new Date().toLocaleString() : item.claimedAt,
          };
        }
        return item;
      })
    );
    addAuditLog(
      'Lost & Found Status Updated',
      'cms',
      `${target?.referenceId || id} marked ${status.toUpperCase()}${meta.claimedByName ? ` (Claimant: ${meta.claimedByName})` : ''}.`
    );
    showToast('Lost & Found Updated', `${target?.referenceId || 'Item'} marked ${status.toUpperCase()}`, 'info');
  };

  const addShiftHandover = (shiftData: Omit<ShiftHandoverLog, 'id' | 'timestamp'>) => {
    const newShift: ShiftHandoverLog = {
      ...shiftData,
      id: 'sh-' + Date.now(),
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
    };
    setShiftHandovers((prev) => [newShift, ...prev]);
    addAuditLog('Shift Handover Submitted', 'staff', `${shiftData.staffName} submitted ${shiftData.shift} shift log (Cash: NPR ${shiftData.cashInDrawerNPR.toLocaleString()})`);
    showToast('Shift Logged', `${shiftData.shift.toUpperCase()} handover recorded.`, 'success');
  };

  const runNightAudit = (auditorName: string, cashDrawerCountedUSD?: number): NightAuditRecord => {
    const totalRoomsSold = roomUnits.filter((u) => u.occupancyStatus === 'occupied').length;
    const totalRoomsAvailable = roomUnits.length;
    const occupancyPercentage = Math.round((totalRoomsSold / (totalRoomsAvailable || 1)) * 100);
    const roomRevenueUSD = bookings
      .filter((b) => b.bookingStatus === 'checked-in')
      .reduce((acc, b) => acc + (b.subtotal / (b.nights || 1)), 0);
    const fAndBRevenueUSD = restaurantOrders.reduce((acc, o) => acc + o.subtotalUSD, 0);
    const servicesRevenueUSD = Math.round(
      invoices
        .flatMap((inv) => inv.items)
        .filter((it) => it.category !== 'room_stay' && it.category !== 'restaurant_dining')
        .reduce((acc, it) => acc + (Number(it.amountUSD) || 0), 0) * 100
    ) / 100;
    const totalRevenueUSD = roomRevenueUSD + fAndBRevenueUSD + servicesRevenueUSD;
    const serviceChargeCollectedUSD = Math.round(totalRevenueUSD * 0.10 * 100) / 100;
    const vatCollectedUSD = Math.round((totalRevenueUSD + serviceChargeCollectedUSD) * 0.13 * 100) / 100;
    const adrUSD = totalRoomsSold > 0 ? Math.round((roomRevenueUSD / totalRoomsSold) * 100) / 100 : 0;
    const revParUSD = totalRoomsAvailable > 0 ? Math.round((roomRevenueUSD / totalRoomsAvailable) * 100) / 100 : 0;

    const newRecord: NightAuditRecord = {
      id: 'na-' + Date.now(),
      auditDate: new Date().toISOString().split('T')[0],
      auditorName,
      totalRoomsSold,
      totalRoomsAvailable,
      occupancyPercentage,
      roomRevenueUSD: Math.round(roomRevenueUSD * 100) / 100,
      fAndBRevenueUSD: Math.round(fAndBRevenueUSD * 100) / 100,
      servicesRevenueUSD,
      totalRevenueUSD: Math.round(totalRevenueUSD * 100) / 100,
      serviceChargeCollectedUSD,
      vatCollectedUSD,
      adrUSD,
      revParUSD,
      cashDrawerDiscrepancyUSD: 0,
      status: 'closed',
      notes: `Batch run completed by ${auditorName}. Posted daily room tariffs and verified payment reconciliation.`,
    };

    if (backendAvailableRef.current) {
      fetch('/api/accounting/night-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ cashDrawerCountedUSD }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (d?.ok && d?.nightAudit) {
            setNightAudits((prev) => [
              d.nightAudit,
              ...prev.filter((x) => x.id !== newRecord.id && x.id !== d.nightAudit.id),
            ]);
          }
        })
        .catch(() => {});
    }

    setNightAudits((prev) => [newRecord, ...prev]);
    addAuditLog('Night Audit Executed', 'rate', `Night Audit batch closed by ${auditorName}. ADR: $${adrUSD}, RevPAR: $${revParUSD}, Occupancy: ${occupancyPercentage}%`);
    showToast('Night Audit Completed', `Closed day operations. Occupancy: ${occupancyPercentage}%, ADR: $${adrUSD}`, 'success');
    return newRecord;
  };

  const fastSwitchRole = (role: StaffRole | 'guest', staffId?: string) => {
    if (!import.meta.env.DEV) {
      showToast(
        'Authentication Required',
        'Role switching shortcuts are disabled in production. Sign in with your staff account.',
        'warning'
      );
      return;
    }

    if (role === 'guest') {
      setActiveRole('guest');
      setActiveUser(null);
      setIsStaffLoggedIn(false);
      localStorage.removeItem('kamal_hotel_session');
      showToast('Switched to Guest', 'Browsing as public hotel guest.', 'info');
      return;
    }

    let target = staffId ? staff.find((s) => s.id === staffId) : undefined;
    if (!target) {
      target = staff.find((s) => s.role === role && s.status === 'active') || staff.find((s) => s.role === role);
    }
    if (!target) {
      target = staff[0];
    }

    setActiveRole(role);
    setActiveUser(target);
    setIsStaffLoggedIn(true);
    addAuditLog('Role Switched (Dev Only)', 'security', `Dev preview shifted to ${target.name} (${target.role})`);
    showToast(`Dev Role: ${target.name}`, `Previewing ${role.replace('_', ' ').toUpperCase()}`, 'info');
  };

  const updateStaffCredentials = async (
    staffId: string,
    updates: {
      username?: string;
      password?: string;
      name?: string;
      role?: StaffRole;
      status?: 'active' | 'on-leave' | 'inactive';
      department?: string;
    }
  ) => {
    try {
      const res = await fetch(`/api/auth/staff/${encodeURIComponent(staffId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok || !data?.user) {
        showToast('Access Denied', data?.error || 'Super Admin privileges required to update credentials.', 'error');
        return;
      }
      setStaff((prev) =>
        prev.map((s) => (s.id === staffId ? (data.user as StaffUser) : s))
      );
      addAuditLog(
        'Staff Credentials Updated',
        'staff',
        `Updated credentials for ${data.user.name} (username: ${data.user.username})`
      );
      showToast('Credentials Saved', `Updated account credentials for ${data.user.name}`, 'success');
    } catch {
      showToast('Network Error', 'Unable to update staff credentials on server.', 'error');
    }
  };

  const resetAllHotelDataToDefault = () => {
    localStorage.removeItem('kamal_hotel_tables_v1');
    localStorage.removeItem('kamal_hotel_floors_v1');
    localStorage.removeItem('kamal_hotel_room_units_v1');
    localStorage.removeItem('kamal_hotel_lost_found_v1');
    localStorage.removeItem('kamal_hotel_shifts_v1');
    localStorage.removeItem('kamal_hotel_night_audits_v1');
    localStorage.removeItem('kamal_hotel_orders_v1');
    localStorage.removeItem('kamal_hotel_invoices_v1');
    localStorage.removeItem('kamal_hotel_stock_v1');
    localStorage.removeItem('kamal_hotel_staff_v3');
    localStorage.removeItem('kamal_hotel_surveys_v1');
    localStorage.removeItem('kamal_hotel_staff_shifts_v1');
    localStorage.removeItem('kamal_hotel_staff_avail_v1');
    localStorage.removeItem('kamal_hotel_digital_keys_v1');
    localStorage.removeItem('kamal_hotel_door_logs_v1');
    localStorage.removeItem('kamal_hotel_maintenance_v1');
    localStorage.removeItem('kamal_hotel_rewards_v1');
    localStorage.removeItem('kamal_hotel_wake_up_calls_v1');
    localStorage.removeItem('kamal_hotel_deep_clean_v1');
    localStorage.removeItem('kamal_hotel_floor_supplies_v1');
    localStorage.removeItem('kamal_hotel_express_turnovers_v1');
    localStorage.removeItem('kamal_hotel_room_service_requests_v1');
    localStorage.removeItem('kamal_hotel_vip_guests_v1');
    setRestaurantTables(INITIAL_TABLES);
    setFloors(INITIAL_FLOORS);
    setRoomUnits(INITIAL_ROOM_UNITS);
    setLostAndFound(INITIAL_LOST_FOUND);
    setShiftHandovers(INITIAL_SHIFTS);
    setNightAudits(INITIAL_NIGHT_AUDITS);
    setSurveys(INITIAL_POST_CHECKOUT_SURVEYS);
    setStaffShifts(INITIAL_STAFF_SHIFTS);
    setStaffAvailability(INITIAL_STAFF_AVAILABILITY);
    setDigitalKeycards(INITIAL_DIGITAL_KEYCARDS);
    setDoorUnlockLogs(INITIAL_DOOR_UNLOCK_LOGS);
    setMaintenanceTickets(INITIAL_MAINTENANCE_TICKETS);
    setLoyaltyMembers(INITIAL_KAMAL_REWARDS);
    setWakeUpCalls(INITIAL_WAKE_UP_CALLS);
    setDeepCleaningSchedules(INITIAL_DEEP_CLEANING_SCHEDULES);
    setFloorSupplies(INITIAL_FLOOR_SUPPLIES);
    setExpressTurnovers(INITIAL_EXPRESS_TURNOVERS);
    setRoomServiceRequests(INITIAL_ROOM_SERVICE_REQUESTS);
    setVipGuestProfiles(INITIAL_VIP_GUEST_PROFILES);
    setRestaurantOrders([]);
    setInvoices(INITIAL_INVOICES);
    setStockItems(INITIAL_STOCK_ITEMS);
    setStaff(INITIAL_STAFF);
    showToast('Hotel System Reset', 'All operational departments reset to factory demo state.', 'info');
  };

  // ----------------- SHIFT SCHEDULING & ATTENDANCE ACTIONS -----------------
  const assignStaffShift: HotelContextType['assignStaffShift'] = ({
    staffId,
    department,
    date,
    shiftSlot,
    assignedStation,
    notes,
  }) => {
    const member = staff.find((s) => s.id === staffId);
    if (!member) return null;

    const existing = staffShifts.find(
      (s) => s.staffId === staffId && s.date === date && s.shiftSlot === shiftSlot
    );

    if (existing) {
      const updated: StaffShiftAssignment = {
        ...existing,
        department,
        assignedStation: assignedStation.trim() || existing.assignedStation,
        notes: notes !== undefined ? notes : existing.notes,
      };
      setStaffShifts((prev) => prev.map((s) => (s.id === existing.id ? updated : s)));
      addAuditLog(
        'Shift Schedule Updated',
        'staff',
        `Updated ${member.name} (${department}) on ${date} [${shiftSlot.toUpperCase()}]: ${updated.assignedStation}`
      );
      showToast('Shift Updated', `${member.name} assigned to ${updated.assignedStation}.`, 'success');
      return updated;
    }

    const created: StaffShiftAssignment = {
      id: 'shift-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
      staffId: member.id,
      staffName: member.name,
      staffRole: member.role,
      department,
      date,
      shiftSlot,
      assignedStation: assignedStation.trim() || `${department} Duty`,
      attendanceStatus: 'scheduled',
      notes,
    };

    setStaffShifts((prev) => [created, ...prev]);

    dispatchOperationalAlert({
      title: 'Shift Assignment Updated',
      message: `${member.name} scheduled for ${department} (${shiftSlot} shift, ${date}) at ${created.assignedStation}.`,
      type: 'room_assigned',
      targetRoles: ['super_admin', 'admin', 'hotel_manager', member.role],
      linkTab: 'shift_scheduling',
    });

    addAuditLog(
      'Staff Shift Assigned',
      'staff',
      `Scheduled ${member.name} (${department}) for ${shiftSlot.toUpperCase()} on ${date} — ${created.assignedStation}`
    );
    showToast('Shift Assigned', `${member.name} scheduled (${shiftSlot.toUpperCase()}, ${date}).`, 'success');
    return created;
  };

  const clockStaffAction: HotelContextType['clockStaffAction'] = (shiftId, action) => {
    const target = staffShifts.find((s) => s.id === shiftId);
    if (!target) return;

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

    let nextStatus: ShiftAttendanceStatus = target.attendanceStatus;
    let nextClockIn = target.clockInTime;
    let nextClockOut = target.clockOutTime;
    let label = 'Updated';

    if (action === 'clock_in') {
      nextStatus = 'clocked_in';
      nextClockIn = nowTime;
      nextClockOut = undefined;
      label = `Clocked In at ${nowTime}`;
    } else if (action === 'break') {
      nextStatus = 'on_break';
      label = `Started Break at ${nowTime}`;
    } else if (action === 'resume') {
      nextStatus = 'clocked_in';
      label = `Resumed Duty at ${nowTime}`;
    } else if (action === 'clock_out') {
      nextStatus = 'clocked_out';
      nextClockOut = nowTime;
      label = `Clocked Out at ${nowTime}`;
    }

    setStaffShifts((prev) =>
      prev.map((s) =>
        s.id === shiftId
          ? { ...s, attendanceStatus: nextStatus, clockInTime: nextClockIn, clockOutTime: nextClockOut }
          : s
      )
    );

    setStaff((prev) =>
      prev.map((st) =>
        st.id === target.staffId ? { ...st, lastActive: `${label}` } : st
      )
    );

    addAuditLog('Staff Clock Action', 'staff', `${target.staffName} (${target.department}): ${label}`);
    showToast(target.staffName, label, action === 'clock_in' ? 'success' : 'info');
  };

  const removeStaffShift = (shiftId: string) => {
    const target = staffShifts.find((s) => s.id === shiftId);
    setStaffShifts((prev) => prev.filter((s) => s.id !== shiftId));
    if (target) {
      addAuditLog('Shift Removed', 'staff', `Removed ${target.shiftSlot} shift for ${target.staffName} on ${target.date}`);
      showToast('Shift Removed', `Removed shift for ${target.staffName}.`, 'info');
    }
  };

  const updateStaffAvailability: HotelContextType['updateStaffAvailability'] = (
    staffId,
    date,
    availability,
    note
  ) => {
    setStaffAvailability((prev) => {
      const existing = prev.find((a) => a.staffId === staffId && a.date === date);
      if (existing) {
        return prev.map((a) =>
          a.id === existing.id ? { ...a, availability, note } : a
        );
      }
      return [
        ...prev,
        {
          id: 'av-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
          staffId,
          date,
          availability,
          note,
        },
      ];
    });
    const member = staff.find((s) => s.id === staffId);
    showToast(
      'Availability Updated',
      `${member?.name || 'Staff'} marked ${availability.replace('_', ' ')} for ${date}.`,
      'info'
    );
  };

  // ----------------- SMTP & TENANT ONBOARDING ACTIONS -----------------
  const updateSmtpConfig = async (updates: Partial<SmtpConfig>) => {
    try {
      const response = await fetch('/api/settings/smtp', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok || !data?.smtp) {
        showToast(
          'SMTP Save Rejected',
          data?.error || 'Admin or Super Admin authentication required to save SMTP settings.',
          'error'
        );
        return;
      }
      setSmtpConfig((prev) => ({
        ...prev,
        ...data.smtp,
        smtpPassword: '',
      }));
      showToast('SMTP Settings Saved', 'Encrypted outgoing mail configuration stored on server.', 'success');
    } catch {
      showToast('Network Error', 'Unable to save SMTP settings to server.', 'error');
    }
  };

  const testSmtpConnection = async (
    testEmail?: string,
    overrideConfig?: Partial<SmtpConfig>
  ): Promise<{ success: boolean; message: string }> => {
    const effective = { ...smtpConfig, ...overrideConfig };
    const target = (testEmail || effective.senderEmail || themeConfig.contactEmail || '').trim();

    if (!effective.smtpHost || !effective.senderEmail) {
      const err = 'SMTP Host and Sender From Email are required before testing connection.';
      setSmtpConfig((prev) => ({
        ...prev,
        ...overrideConfig,
        smtpPassword: '',
        isConfigured: false,
        lastTestStatus: 'failed',
        lastTestedAt: new Date().toISOString(),
        lastTestMessage: err,
      }));
      return { success: false, message: err };
    }

    try {
      const response = await fetch('/api/email/test-smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          testEmail: target,
          hotelName: themeConfig.hotelName,
          smtpConfig: overrideConfig || effective,
        }),
      });

      const data = await response.json().catch(() => ({}));
      const testedAt = new Date().toISOString();

      if (!response.ok || !data?.ok) {
        const errMsg = data?.error || 'SMTP authentication or handshake failed.';
        setSmtpConfig((prev) => ({
          ...prev,
          isConfigured: false,
          smtpPassword: '',
          lastTestStatus: 'failed',
          lastTestedAt: testedAt,
          lastTestMessage: errMsg,
        }));
        showToast('SMTP Test Failed', errMsg, 'error');
        return { success: false, message: errMsg };
      }

      const okMsg =
        data?.message ||
        `Verified connection with ${effective.smtpHost}:${effective.smtpPort} and dispatched test email to ${target}.`;

      setSmtpConfig((prev) => ({
        ...prev,
        ...(data?.smtp || {}),
        smtpPassword: '',
        isConfigured: true,
        lastTestStatus: 'success',
        lastTestedAt: testedAt,
        lastTestMessage: okMsg,
      }));

      dispatchOperationalAlert({
        title: 'SMTP Mail Gateway Connected',
        message: okMsg,
        type: 'payment',
        targetRoles: ['super_admin', 'admin'],
        linkTab: 'cms',
      });

      showToast('Test Email Delivered', `Check ${target} inbox to confirm receipt.`, 'success');
      return { success: true, message: okMsg };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error calling SMTP endpoint.';
      setSmtpConfig((prev) => ({
        ...prev,
        smtpPassword: '',
        isConfigured: false,
        lastTestStatus: 'failed',
        lastTestedAt: new Date().toISOString(),
        lastTestMessage: msg,
      }));
      return { success: false, message: msg };
    }
  };

  const purgeAllDemoData = (options: {
    resetLandingPage?: boolean;
    resetRooms?: boolean;
    resetMenu?: boolean;
    resetTables?: boolean;
    resetStaff?: boolean;
    newHotelName?: string;
    newCity?: string;
    newLegalName?: string;
    newPanVat?: string;
    newEmail?: string;
    newPhone?: string;
    newHeroHeadline?: string;
  }) => {
    // 1. Wipe all operational transactions & demo guest records
    setBookings([]);
    localStorage.removeItem('kamal_hotel_bookings_v2');

    setRestaurantOrders([]);
    localStorage.removeItem('kamal_hotel_orders_v1');

    setInvoices([]);
    localStorage.removeItem('kamal_hotel_invoices_v1');

    setGuestSessions([]);
    localStorage.removeItem('kamal_hotel_guest_sessions_v1');
    localStorage.removeItem('kamal_hotel_active_guest_session');
    setActiveGuestSession(null);

    setGuestChatMessages([]);
    localStorage.removeItem('kamal_hotel_guest_chat_v1');

    setNotifications([]);
    localStorage.removeItem('kamal_hotel_notifications_v2');

    setOperationalAlerts([]);
    localStorage.removeItem('kamal_hotel_operational_alerts_v1');

    setShiftHandovers([]);
    localStorage.removeItem('kamal_hotel_shifts_v1');

    setNightAudits([]);
    localStorage.removeItem('kamal_hotel_night_audits_v1');

    setLostAndFound([]);
    localStorage.removeItem('kamal_hotel_lost_found_v1');

    setSurveys([]);
    localStorage.removeItem('kamal_hotel_surveys_v1');

    setStaffShifts([]);
    localStorage.removeItem('kamal_hotel_staff_shifts_v1');
    setStaffAvailability([]);
    localStorage.removeItem('kamal_hotel_staff_avail_v1');

    setDigitalKeycards([]);
    localStorage.removeItem('kamal_hotel_digital_keys_v1');
    setDoorUnlockLogs([]);
    localStorage.removeItem('kamal_hotel_door_logs_v1');

    setMaintenanceTickets([]);
    localStorage.removeItem('kamal_hotel_maintenance_v1');

    setLoyaltyMembers([]);
    localStorage.removeItem('kamal_hotel_rewards_v1');

    setWakeUpCalls([]);
    localStorage.removeItem('kamal_hotel_wake_up_calls_v1');

    setDeepCleaningSchedules([]);
    localStorage.removeItem('kamal_hotel_deep_clean_v1');

    setFloorSupplies([]);
    localStorage.removeItem('kamal_hotel_floor_supplies_v1');

    setExpressTurnovers([]);
    localStorage.removeItem('kamal_hotel_express_turnovers_v1');

    setRoomServiceRequests([]);
    localStorage.removeItem('kamal_hotel_room_service_requests_v1');

    setVipGuestProfiles([]);
    localStorage.removeItem('kamal_hotel_vip_guests_v1');

    // Reset room units to vacant & clean
    setRoomUnits((prev) =>
      prev.map((u) => ({
        ...u,
        occupancyStatus: 'vacant',
        cleanStatus: 'clean',
        maintenanceNote: '',
        currentGuestName: undefined,
        currentBookingCode: undefined,
        checkInDate: undefined,
        checkOutDate: undefined,
        minibarConsumedUSD: 0,
        dndActive: false,
      }))
    );

    // Reset restaurant tables to vacant
    setRestaurantTables((prev) =>
      prev.map((t) => ({
        ...t,
        status: 'vacant',
        guestName: undefined,
        currentOrderId: undefined,
        waiterName: undefined,
        seatedAt: undefined,
      }))
    );

    // 2. White-label Landing Page & Hotel Branding
    if (options.newHotelName || options.resetLandingPage) {
      const hotelName = options.newHotelName || 'Boutique Heritage Hotel';
      const city = options.newCity || 'Kathmandu, Nepal';
      const legalName = options.newLegalName || `${hotelName} Hospitality Pvt. Ltd.`;
      const panVat = options.newPanVat || '601928374';
      const email = options.newEmail || 'reservations@hoteldomain.com';
      const phone = options.newPhone || '+977-1-4422990';
      const heroHeadline = options.newHeroHeadline || `Welcome to ${hotelName}`;

      setThemeConfig((prev) => ({
        ...prev,
        hotelName,
        city,
        hotelLegalName: legalName,
        panVatNumber: panVat,
        contactEmail: email,
        officialEmail: email,
        contactPhone: phone,
        receptionPhone: phone,
        heroHeadline,
        heroSubheadline: `Experience exceptional hospitality, exquisite rooms, and authentic dining in ${city}.`,
      }));

      setBillSettings((prev) => ({
        ...prev,
        hotelLegalName: legalName,
        panVatNumber: panVat,
        contactEmail: email,
        contactSupportPhone: phone,
      }));
    }

    if (options.resetRooms) {
      setRooms([]);
      setRoomUnits([]);
    }

    if (options.resetMenu) {
      setMenuItems([]);
      localStorage.removeItem('kamal_hotel_menu_v1');
    }

    if (options.resetTables) {
      setRestaurantTables([]);
      localStorage.removeItem('kamal_hotel_tables_v1');
    }

    if (options.resetStaff) {
      setStaff((prev) => prev.filter((s) => s.role === 'super_admin'));
    }

    addAuditLog(
      'Clean Tenant Initialized',
      'security',
      `Super Admin executed 1-click purge for fresh hotel client onboarding.`
    );

    showToast(
      'Clean Hotel Initialized!',
      `Demo transactions wiped clean. The system is ready for the new hotel client.`,
      'success'
    );
  };

  const batchImportMenuItems = (items: Omit<MenuItem, 'id'>[], replaceExisting?: boolean): { imported: number; failed: number } => {
    const formatted: MenuItem[] = items.map((it, idx) => ({
      ...it,
      id: `menu-dish-${Date.now()}-${idx}`,
      available: true,
      priceUSD: Number(it.priceUSD) || 8,
      preparationTimeMinutes: Number(it.preparationTimeMinutes) || 20,
    }));

    if (replaceExisting) {
      setMenuItems(formatted);
    } else {
      setMenuItems((prev) => [...prev, ...formatted]);
    }

    addAuditLog('Menu Excel/CSV Upload', 'cms', `Uploaded and processed ${formatted.length} dishes to menu inventory.`);
    showToast('Menu Uploaded Successfully', `Added ${formatted.length} dishes to the restaurant catalog.`, 'success');
    return { imported: formatted.length, failed: 0 };
  };

  const addRoomTypeCatalog = (newRoom: Room) => {
    setRooms((prev) => {
      const exists = prev.find((r) => r.id === newRoom.id);
      if (exists) {
        return prev.map((r) => (r.id === newRoom.id ? newRoom : r));
      }
      return [...prev, newRoom];
    });
    addAuditLog('Room Type Catalog Added', 'cms', `Added room type: ${newRoom.name} ($${newRoom.pricePerNightUSD}/night)`);
    showToast('Room Type Added', `${newRoom.name} added to catalog.`, 'success');
  };

  const massGenerateRoomUnits = (floor: string, roomType: RoomType, startNumber: number, count: number): number => {
    let countAdded = 0;
    const generated: RoomOperationalUnit[] = [];
    for (let i = 0; i < count; i++) {
      const roomNum = String(startNumber + i);
      const exists = roomUnits.find((u) => u.roomNumber === roomNum);
      if (!exists) {
        generated.push({
          id: `unit-${Date.now()}-${i}`,
          roomNumber: roomNum,
          floor,
          roomType,
          occupancyStatus: 'vacant',
          cleanStatus: 'clean',
        });
        countAdded++;
      }
    }
    if (generated.length > 0) {
      setRoomUnits((prev) => [...prev, ...generated]);
      showToast('Rooms Generated', `Generated ${countAdded} physical rooms on ${floor}.`, 'success');
    }
    return countAdded;
  };

  // ----------------- STOCK & INVENTORY ACTIONS -----------------
  const addStockItem = (item: Omit<StockItem, 'id'>) => {
    const newStock: StockItem = {
      ...item,
      id: 'stock-' + Date.now(),
    };
    setStockItems((prev) => [...prev, newStock]);
    persistCollectionItem('stockItems', newStock.id, newStock);
    addAuditLog('Stock Item Created', 'cms', `Added inventory SKU ${item.sku}: ${item.name} (${item.category})`);
    showToast('Stock Added', `${item.name} logged into inventory system.`);
  };

  const updateStockItem = (id: string, updates: Partial<StockItem>) => {
    const existing = stockItems.find((s) => s.id === id);
    if (existing) persistCollectionItem('stockItems', id, { ...existing, ...updates });
    setStockItems((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
    showToast('Inventory Updated', 'Stock item modified successfully.');
  };

  const deleteStockItem = (id: string) => {
    const found = stockItems.find((s) => s.id === id);
    setStockItems((prev) => prev.filter((s) => s.id !== id));
    removeCollectionItem('stockItems', id);
    addAuditLog('Stock Item Deleted', 'cms', `Removed stock item: ${found?.name} (${found?.sku})`);
    showToast('Item Removed', 'Inventory record deleted.', 'info');
  };

  const adjustStockQuantity = (id: string, delta: number, reason: string) => {
    setStockItems((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const updated = Math.max(0, s.currentStock + delta);
          const next = {
            ...s,
            currentStock: updated,
            lastRestockedDate: delta > 0 ? new Date().toISOString().split('T')[0] : s.lastRestockedDate,
          };
          persistCollectionItem('stockItems', id, next);
          return next;
        }
        return s;
      })
    );
    const item = stockItems.find((s) => s.id === id);
    addAuditLog('Stock Adjusted', 'cms', `${delta > 0 ? '+' : ''}${delta} ${item?.unit} of ${item?.name} (${reason})`);
    showToast('Stock Adjusted', `Updated count for ${item?.name}: ${((item?.currentStock || 0) + delta)} ${item?.unit}`);
  };

  // ----------------- BILLING & INVOICING ACTIONS -----------------
  const updateBillSettings = (updates: Partial<BillSettings>) => {
    setBillSettings((prev) => ({ ...prev, ...updates }));
    persistSetting('bill', updates);
    addAuditLog('Bill Settings Customized', 'cms', 'Updated invoice template, tax/service rates, or logo.');
    showToast('Bill Settings Saved', 'Invoice template and formatting rules updated.', 'success');
  };

  const generateInvoiceForBooking = (bookingId: string): MasterInvoice => {
    const booking = bookings.find((b) => b.id === bookingId);
    if (booking) {
      const existing = invoices.find((inv) => inv.bookingCode === booking.bookingCode);
      if (existing) {
        return existing;
      }
    }

    const invoiceNum = 'KH-INV-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
    
    // Find room charge
    const room = rooms.find((r) => r.id === booking?.roomTypeId);
    const roomRateUSD = room ? room.pricePerNightUSD : 50;
    const nights = booking?.nights || 1;

    // Check if guest has any room service restaurant orders
    const guestOrders = restaurantOrders.filter(
      (o) => o.tableOrRoomNo === booking?.bookingCode || o.guestName.toLowerCase() === booking?.guestName.toLowerCase()
    );

    const items: BillItemLine[] = [
      {
        id: 'li-' + Math.random().toString(36).substring(2, 7),
        description: `${booking?.roomName || 'Room Stay'} (${nights} Nights @ $${roomRateUSD}/night)`,
        category: 'room_stay',
        date: booking?.checkInDate || new Date().toISOString().split('T')[0],
        quantity: nights,
        rateUSD: roomRateUSD,
        amountUSD: roomRateUSD * nights,
      },
    ];

    // Add addons
    if (booking?.addons && booking.addons.length > 0) {
      booking.addons.forEach((addon) => {
        items.push({
          id: 'li-' + Math.random().toString(36).substring(2, 7),
          description: addon.name,
          category: addon.name.toLowerCase().includes('airport') ? 'airport_transfer' : 'other',
          date: booking.checkInDate,
          quantity: 1,
          rateUSD: addon.priceUSD,
          amountUSD: addon.priceUSD,
        });
      });
    }

    // Add dining orders
    guestOrders.forEach((ord) => {
      items.push({
        id: 'li-' + ord.id,
        description: `Ground-Floor Dining Order #${ord.orderNumber} (${ord.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')})`,
        category: 'restaurant_dining',
        date: ord.createdAt.split('T')[0],
        quantity: 1,
        rateUSD: ord.subtotalUSD,
        amountUSD: ord.subtotalUSD,
      });
    });

    const subtotal = items.reduce((acc, i) => acc + i.amountUSD, 0);
    const discountAmount = (subtotal * (billSettings.defaultDiscountPercent || 0)) / 100;
    const discountedSubtotal = subtotal - discountAmount;
    const serviceCharge = (discountedSubtotal * billSettings.serviceChargePercent) / 100;
    const taxableBase = discountedSubtotal + serviceCharge;
    const tax = (taxableBase * billSettings.taxPercent) / 100;
    const grandTotal = Math.round((taxableBase + tax) * 100) / 100;

    const newInv: MasterInvoice = {
      id: 'inv-' + Date.now(),
      invoiceNumber: invoiceNum,
      bookingCode: booking?.bookingCode || 'DIRECT-WALKIN',
      roomNumber: booking?.assignedRoomNumber
        ? `Room ${booking.assignedRoomNumber}`
        : booking
        ? `Room ${booking.roomTypeId.replace('room-', '30')}`
        : 'Room 302',
      guestName: booking?.guestName || 'Guest Walk-in',
      guestEmail: booking?.guestEmail || 'guest@example.com',
      guestPhone: booking?.guestPhone || '+977 98',
      checkInDate: booking?.checkInDate || new Date().toISOString().split('T')[0],
      checkOutDate: booking?.checkOutDate || new Date().toISOString().split('T')[0],
      issuedAt: new Date().toLocaleString(),
      items,
      subtotalUSD: subtotal,
      discountPercent: billSettings.defaultDiscountPercent,
      discountAmountUSD: discountAmount,
      serviceChargePercent: billSettings.serviceChargePercent,
      serviceChargeAmountUSD: serviceCharge,
      taxPercent: billSettings.taxPercent,
      taxAmountUSD: tax,
      grandTotalUSD: grandTotal,
      amountPaidUSD: booking?.paymentStatus === 'paid' ? grandTotal : 0,
      balanceDueUSD: booking?.paymentStatus === 'paid' ? 0 : grandTotal,
      paymentStatus: booking?.paymentStatus || 'pending',
      paymentMethod: booking?.paymentMethod || 'card',
    };

    setInvoices((prev) => [newInv, ...prev]);
    if (backendAvailableRef.current) {
      fetch('/api/pms/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...newInv, invoiceNumber: undefined }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (d?.ok && d?.invoice) {
            setInvoices((prev) => prev.map((x) => (x.id === newInv.id ? d.invoice : x)));
          }
        })
        .catch(() => {});
    }
    showToast('Invoice Generated', `Master bill created for ${newInv.guestName} (${invoiceNum})`);
    return newInv;
  };

  const createCustomInvoice = (invData: Omit<MasterInvoice, 'id' | 'invoiceNumber' | 'issuedAt'>): MasterInvoice => {
    const invNum = 'KH-INV-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
    const newInv: MasterInvoice = {
      ...invData,
      id: 'inv-' + Date.now(),
      invoiceNumber: invNum,
      issuedAt: new Date().toLocaleString(),
    };
    setInvoices((prev) => [newInv, ...prev]);
    if (backendAvailableRef.current) {
      fetch('/api/pms/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...newInv, invoiceNumber: undefined }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (d?.ok && d?.invoice) {
            setInvoices((prev) => prev.map((x) => (x.id === newInv.id ? d.invoice : x)));
          }
        })
        .catch(() => {});
    }
    addAuditLog('Custom Bill Issued', 'payment', `Invoice ${invNum} created for ${invData.guestName} ($${invData.grandTotalUSD.toFixed(2)})`);
    showToast('Bill Created', `Invoice ${invNum} registered successfully.`);
    return newInv;
  };

  const updateInvoice = (id: string, updates: Partial<MasterInvoice>) => {
    const existing = invoices.find((inv) => inv.id === id);
    if (existing) persistCollectionItem('invoices', id, { ...existing, ...updates });
    setInvoices((prev) => prev.map((inv) => (inv.id === id ? { ...inv, ...updates } : inv)));
    showToast('Invoice Saved', 'Bill adjustments updated.', 'success');
  };

  const addPaymentToInvoice = (invoiceId: string, amount: number, method: PaymentMethod) => {
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id === invoiceId) {
          const newPaid = inv.amountPaidUSD + amount;
          const newBalance = Math.max(0, inv.grandTotalUSD - newPaid);
          const newStatus: PaymentStatus = newBalance === 0 ? 'paid' : 'pending';
          return {
            ...inv,
            amountPaidUSD: newPaid,
            balanceDueUSD: newBalance,
            paymentStatus: newStatus,
            paymentMethod: method,
          };
        }
        return inv;
      })
    );
    if (backendAvailableRef.current) {
      fetch('/api/payments/onsite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ invoiceId, amountUSD: amount, method }),
      }).catch(() => {});
    }
    addAuditLog('Payment Registered', 'payment', `Collected $${amount} for Invoice #${invoiceId}`);
    showToast('Payment Recorded', `Payment of $${amount.toFixed(2)} applied via ${method.toUpperCase()}.`);
  };

  // ----------------- IN-HOUSE GUEST PASSCODE SESSIONS -----------------
  const loginGuestByRoom = (roomNumber: string, passcode: string): { success: boolean; message: string; session?: GuestRoomSession } => {
    const cleanRoom = roomNumber.trim().toLowerCase();
    const cleanPass = passcode.trim();

    const session = guestSessions.find(
      (s) => s.roomNumber.toLowerCase().includes(cleanRoom) && s.passcode === cleanPass && s.isActive
    );

    if (!session) {
      return {
        success: false,
        message: 'Invalid room number or in-house passcode. Please verify with reception or your keycard envelope.',
      };
    }

    // Strict stay period validation: PIN works only during stay dates
    const today = new Date().toISOString().split('T')[0];
    if (session.checkOutDate && today > session.checkOutDate) {
      return {
        success: false,
        message: `Your stay has ended as of ${session.checkOutDate}. Passcode has expired. Please contact reception.`,
      };
    }

    setActiveGuestSession(session);
    showToast('Welcome to Your Room Portal!', `Logged into ${session.roomNumber} (${session.guestName})`, 'success');
    return { success: true, message: 'Welcome!', session };
  };

  const loginGuestWithDatabase = async (
    roomNumber: string,
    passcode: string
  ): Promise<{ success: boolean; message: string; session?: GuestRoomSession }> => {
    const cleanRoom = roomNumber.trim();
    const cleanPass = passcode.trim();
    if (!cleanRoom || !cleanPass) {
      return {
        success: false,
        message: 'Please enter both your assigned room number and 4-digit stay PIN.',
      };
    }

    try {
      const res = await fetch('/api/guest/room-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ roomNumber: cleanRoom, passcode: cleanPass }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json().catch(() => null);
        if (res.ok && data?.ok && data.session) {
          backendAvailableRef.current = true;
          setBackendConnected(true);
          if (data.booking) {
            setBookings((prev) => [data.booking, ...prev.filter((b) => b.id !== data.booking.id)]);
          }
          if (data.invoice) {
            setInvoices((prev) => [data.invoice, ...prev.filter((inv) => inv.id !== data.invoice.id)]);
          }
          if (Array.isArray(data.orders) && data.orders.length > 0) {
            setRestaurantOrders((prev) => {
              const map = new Map(prev.map((o) => [o.id, o]));
              data.orders.forEach((o: RestaurantOrder) => map.set(o.id, o));
              return Array.from(map.values());
            });
          }
          if (data.keycard) {
            setDigitalKeycards((prev) => [data.keycard, ...prev.filter((k) => k.id !== data.keycard.id)]);
          }
          if (Array.isArray(data.chatMessages) && data.chatMessages.length > 0) {
            setGuestChatMessages((prev) => {
              const map = new Map(prev.map((m) => [m.id, m]));
              data.chatMessages.forEach((m: CSRChatMessage) => map.set(m.id, m));
              return Array.from(map.values());
            });
          }
          setActiveGuestSession(data.session);
          showToast('Welcome to Your Room Portal!', `Logged into ${data.session.roomNumber} (${data.session.guestName})`, 'success');
          return { success: true, message: 'Welcome!', session: data.session };
        }
        if (res.status === 401 || res.status === 429) {
          return {
            success: false,
            message: data?.error || 'Invalid room number or stay passcode.',
          };
        }
      }
    } catch {
      // Static / offline mode fallback below when backend is unreachable
    }

    if (!backendAvailableRef.current) {
      return loginGuestByRoom(cleanRoom, cleanPass);
    }

    return {
      success: false,
      message: 'Unable to verify room passcode against the server database. Please check your connection or contact Front Desk.',
    };
  };

  const logoutGuestSession = () => {
    setActiveGuestSession(null);
    showToast('Guest Portal Signed Out', 'Thank you for visiting.', 'info');
  };

  const generateNewRoomPasscode = (roomNumber: string, bookingCode: string, guestName: string): GuestRoomSession => {
    const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
    const newSession: GuestRoomSession = {
      roomNumber,
      bookingCode,
      guestName,
      passcode: randomPin,
      checkInDate: new Date().toISOString().split('T')[0],
      checkOutDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
      isActive: true,
      createdAt: new Date().toLocaleString(),
      expiresAt: new Date(Date.now() + 86400000 * 3).toLocaleString(),
    };

    setGuestSessions((prev) => [newSession, ...prev.filter((s) => s.roomNumber !== roomNumber)]);
    addAuditLog('Guest Passcode Issued', 'security', `Generated PIN ${randomPin} for ${roomNumber} (${guestName})`);
    showToast('Guest Passcode Generated', `${roomNumber} passcode is: ${randomPin}. Guest can now log in.`, 'success');
    return newSession;
  };

  const checkoutAndResetRoomPasscode = (roomNumber: string) => {
    const cleanRoom = roomNumber.toLowerCase();

    // 1. Expire and deactivate session
    setGuestSessions((prev) =>
      prev.map((s) => (s.roomNumber.toLowerCase() === cleanRoom ? { ...s, isActive: false, passcode: 'EXPIRED' } : s))
    );

    // 2. Clear active session if logged in
    if (activeGuestSession?.roomNumber.toLowerCase() === cleanRoom) {
      setActiveGuestSession(null);
    }

    // 3. Mark booking as checked-out cleanly by assignedRoomNumber or bookingCode
    const cleanTargetDigits = cleanRoom.replace(/room/g, '').trim();
    setBookings((prev) =>
      prev.map((b) => {
        if (
          b.assignedRoomNumber?.toLowerCase() === cleanTargetDigits ||
          b.bookingCode.toLowerCase().includes(cleanRoom)
        ) {
          return { ...b, bookingStatus: 'checked-out' };
        }
        return b;
      })
    );

    // 4. Reset & purge room chat messages and revoke active digital keycards
    setGuestChatMessages((prev) =>
      prev.filter((m) => m.roomNumber?.toLowerCase() !== cleanRoom)
    );

    const normalizedTarget = cleanRoom.replace('room', '').trim();
    setDigitalKeycards((prev) =>
      prev.map((dk) => {
        const dkNum = dk.roomNumber.toLowerCase().replace('room', '').trim();
        if (dkNum === normalizedTarget && dk.status === 'active') {
          return { ...dk, status: 'revoked' };
        }
        return dk;
      })
    );

    addAuditLog('Room Checked Out & Passcode Purged', 'security', `Checkout completed for ${roomNumber}. PIN and Digital QR keycards expired for next guest.`);
    showToast('Checkout Complete', `Passcode & QR Keycard for ${roomNumber} revoked for next guest.`, 'success');
  };

  // ----------------- DIGITAL KEYCARD GENERATOR & SMART DOOR READER ACTIONS -----------------
  const normalizeRoomDigits = (val: string) => val.toLowerCase().replace(/room/g, '').replace(/[^a-z0-9]/g, '').trim();

  const issueDigitalKeycard: HotelContextType['issueDigitalKeycard'] = ({
    roomNumber,
    guestName,
    bookingCode,
    accessScope,
    validFrom,
    expiresAt,
  }) => {
    const cleanRoomDisplay = roomNumber.toLowerCase().startsWith('room')
      ? roomNumber.trim()
      : `Room ${roomNumber.trim()}`;
    const roomDigits = normalizeRoomDigits(cleanRoomDisplay) || '302';
    const randHex = Math.random().toString(16).substring(2, 8).toUpperCase();
    const keyToken = `DK-${roomDigits}-${randHex}`;
    const nowIso = new Date().toISOString();

    const created: DigitalKeycard = {
      id: 'dkey-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
      keyToken,
      roomNumber: cleanRoomDisplay,
      guestName: guestName.trim() || 'In-House Guest',
      bookingCode: bookingCode.trim() || 'WALKIN-KEY',
      accessScope,
      validFrom: validFrom || nowIso,
      expiresAt,
      issuedBy: activeUser?.name || 'Front Desk Reception',
      issuedAt: nowIso.slice(0, 16).replace('T', ' '),
      status: 'active',
      unlockCount: 0,
    };

    setDigitalKeycards((prev) => [created, ...prev]);

    addAuditLog(
      'Digital QR Keycard Issued',
      'security',
      `Issued time-bound QR Keycard ${keyToken} for ${created.roomNumber} (${created.guestName}), valid until ${new Date(expiresAt).toLocaleString()}.`
    );
    showToast(
      'Digital Keycard Created',
      `QR Key ${keyToken} active for ${created.roomNumber}.`,
      'success'
    );
    return created;
  };

  const revokeDigitalKeycard = (keyId: string) => {
    const target = digitalKeycards.find((k) => k.id === keyId);
    setDigitalKeycards((prev) =>
      prev.map((k) => (k.id === keyId ? { ...k, status: 'revoked' } : k))
    );
    if (target) {
      addAuditLog('Digital Keycard Revoked', 'security', `Revoked QR Keycard ${target.keyToken} (${target.roomNumber})`);
      showToast('Keycard Revoked', `${target.keyToken} for ${target.roomNumber} deactivated immediately.`, 'warning');
    }
  };

  const extendDigitalKeycard = (keyId: string, extraHours: number) => {
    const target = digitalKeycards.find((k) => k.id === keyId);
    if (!target) return;

    const baseMs = Math.max(Date.now(), new Date(target.expiresAt).getTime());
    const nextExpiry = new Date(baseMs + extraHours * 3600 * 1000).toISOString();

    setDigitalKeycards((prev) =>
      prev.map((k) =>
        k.id === keyId ? { ...k, expiresAt: nextExpiry, status: 'active' } : k
      )
    );
    addAuditLog(
      'Digital Keycard Extended',
      'security',
      `Extended QR Keycard ${target.keyToken} (+${extraHours}h until ${new Date(nextExpiry).toLocaleString()})`
    );
    showToast('Validity Extended', `${target.keyToken} extended by +${extraHours} hours.`, 'success');
  };

  const verifyAndUnlockDoor: HotelContextType['verifyAndUnlockDoor'] = (
    tokenOrPayload,
    targetRoomNumber
  ) => {
    const raw = tokenOrPayload.trim();
    let parsedToken = raw;

    if (raw.startsWith('{')) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.token === 'string') {
          parsedToken = parsed.token.trim();
        }
      } catch {
        // Fallback to raw match
      }
    } else if (raw.includes('keyToken=')) {
      try {
        const u = new URL(raw);
        const param = u.searchParams.get('keyToken');
        if (param) parsedToken = param.trim();
      } catch {
        // ignore URL parse error
      }
    }

    const matchedKey = digitalKeycards.find(
      (k) => k.keyToken.toUpperCase() === parsedToken.toUpperCase()
    );

    const expectedRoom = targetRoomNumber || activeGuestSession?.roomNumber || 'Room 302';
    const expectedDigits = normalizeRoomDigits(expectedRoom);
    const nowTimestamp = new Date().toISOString().slice(0, 16).replace('T', ' ');

    const logAttempt = (
      result: DoorUnlockEvent['result'],
      reason: string,
      guestName: string,
      roomLabel: string,
      tokenLabel: string
    ) => {
      const evt: DoorUnlockEvent = {
        id: 'dlog-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
        roomNumber: roomLabel,
        keyToken: tokenLabel || 'UNKNOWN',
        guestName,
        timestamp: nowTimestamp,
        result,
        reason,
      };
      setDoorUnlockLogs((prev) => [evt, ...prev.slice(0, 49)]);
    };

    if (!matchedKey) {
      const msg = 'Unrecognized QR key token. Door bolt remains locked.';
      logAttempt('denied_invalid', msg, 'Unknown Presenter', expectedRoom, parsedToken);
      return { granted: false, result: 'denied_invalid', message: msg };
    }

    const keyDigits = normalizeRoomDigits(matchedKey.roomNumber);
    if (expectedDigits && keyDigits !== expectedDigits) {
      const msg = `Keycard belongs to ${matchedKey.roomNumber}, not ${expectedRoom}.`;
      logAttempt('denied_wrong_room', msg, matchedKey.guestName, expectedRoom, matchedKey.keyToken);
      return { granted: false, result: 'denied_wrong_room', message: msg, keycard: matchedKey };
    }

    if (matchedKey.status === 'revoked') {
      const msg = `Keycard ${matchedKey.keyToken} was revoked by Front Desk.`;
      logAttempt('denied_revoked', msg, matchedKey.guestName, matchedKey.roomNumber, matchedKey.keyToken);
      return { granted: false, result: 'denied_revoked', message: msg, keycard: matchedKey };
    }

    const nowMs = Date.now();
    const expMs = new Date(matchedKey.expiresAt).getTime();
    const validFromMs = new Date(matchedKey.validFrom).getTime();

    if (matchedKey.status === 'expired' || nowMs > expMs) {
      setDigitalKeycards((prev) =>
        prev.map((k) => (k.id === matchedKey.id ? { ...k, status: 'expired' } : k))
      );
      const msg = `Time-bound key expired on ${new Date(matchedKey.expiresAt).toLocaleString()}.`;
      logAttempt('denied_expired', msg, matchedKey.guestName, matchedKey.roomNumber, matchedKey.keyToken);
      return { granted: false, result: 'denied_expired', message: msg, keycard: matchedKey };
    }

    if (nowMs < validFromMs) {
      const msg = `Key becomes valid at ${new Date(matchedKey.validFrom).toLocaleString()}.`;
      logAttempt('denied_expired', msg, matchedKey.guestName, matchedKey.roomNumber, matchedKey.keyToken);
      return { granted: false, result: 'denied_expired', message: msg, keycard: matchedKey };
    }

    const updatedKey: DigitalKeycard = {
      ...matchedKey,
      unlockCount: (matchedKey.unlockCount || 0) + 1,
      lastUnlockedAt: nowTimestamp,
    };

    setDigitalKeycards((prev) =>
      prev.map((k) => (k.id === matchedKey.id ? updatedKey : k))
    );

    const scopeLabel =
      matchedKey.accessScope === 'vip_all_access'
        ? 'VIP All-Access'
        : matchedKey.accessScope === 'room_and_amenities'
        ? 'Room + Pool & Spa'
        : 'Room Door Only';

    const successMsg = `Access granted for ${matchedKey.guestName} (${scopeLabel}). Latch disengaged for ${matchedKey.roomNumber}.`;
    logAttempt('granted', successMsg, matchedKey.guestName, matchedKey.roomNumber, matchedKey.keyToken);
    addAuditLog('Smart Door Unlocked (QR Key)', 'security', `${matchedKey.roomNumber} unlocked via ${matchedKey.keyToken} (${matchedKey.guestName})`);
    return {
      granted: true,
      result: 'granted',
      message: successMsg,
      keycard: updatedKey,
    };
  };

  // ----------------- MAINTENANCE TRACKER & OUT-OF-ORDER AUTO-SYNC -----------------
  const reportMaintenanceIssue: HotelContextType['reportMaintenanceIssue'] = ({
    unitId,
    category,
    priority,
    issueTitle,
    description,
    assignedTechnician,
  }) => {
    const unit = roomUnits.find((u) => u.id === unitId);
    if (!unit) return null;

    const cleanTitle = issueTitle.trim() || 'General Room Maintenance Issue';
    const ticketCode = `MNT-${Math.floor(1050 + Math.random() * 8900)}`;
    const nowStamp = new Date().toISOString().slice(0, 16).replace('T', ' ');

    const ticket: MaintenanceTicket = {
      id: 'mnt-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
      ticketCode,
      unitId: unit.id,
      roomNumber: unit.roomNumber,
      floor: unit.floor,
      category,
      priority,
      issueTitle: cleanTitle,
      description: description.trim() || cleanTitle,
      reportedBy: activeUser?.name || 'Sunita Thapa (Housekeeping)',
      reportedByRole: (activeRole === 'guest' ? 'housekeeping' : activeRole) as StaffRole,
      reportedAt: nowStamp,
      status: 'reported',
      previousCleanStatus: unit.cleanStatus === 'out_of_order' ? 'dirty' : unit.cleanStatus,
      assignedTechnician: assignedTechnician?.trim() || undefined,
    };

    setMaintenanceTickets((prev) => [ticket, ...prev]);

    // Auto-update physical RoomOperationalUnit so Room Heatmap immediately displays "Out of Order"
    setRoomUnits((prev) =>
      prev.map((u) =>
        u.id === unit.id
          ? {
              ...u,
              cleanStatus: 'out_of_order',
              maintenanceNote: cleanTitle,
            }
          : u
      )
    );

    dispatchOperationalAlert({
      title: `Room ${unit.roomNumber} Marked Out of Order`,
      message: `${ticketCode} (${priority.toUpperCase()}): ${cleanTitle}. Reported by ${ticket.reportedBy}. Heatmap automatically updated to Out of Order pending manager repair sign-off.`,
      type: 'room_assigned',
      targetRoles: ['super_admin', 'admin', 'hotel_manager', 'receptionist', 'housekeeping'],
      linkTab: 'maintenance',
      roomNumber: unit.roomNumber,
    });

    addAuditLog(
      'Maintenance Issue Reported (Auto-OOO)',
      'cms',
      `${ticketCode} opened for Room ${unit.roomNumber}: "${cleanTitle}". Heatmap set to OUT_OF_ORDER.`
    );
    showToast(
      `Room ${unit.roomNumber} Flagged Out of Order`,
      `${ticketCode} logged and room heatmap updated automatically.`,
      'warning'
    );
    return ticket;
  };

  const updateMaintenanceTicketStatus: HotelContextType['updateMaintenanceTicketStatus'] = (
    ticketId,
    status,
    assignedTechnician,
    repairNotes
  ) => {
    const target = maintenanceTickets.find((t) => t.id === ticketId);
    if (!target) return;

    setMaintenanceTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId
          ? {
              ...t,
              status,
              assignedTechnician:
                assignedTechnician !== undefined ? assignedTechnician : t.assignedTechnician,
              repairNotes: repairNotes !== undefined ? repairNotes : t.repairNotes,
            }
          : t
      )
    );

    addAuditLog(
      'Maintenance Progress Updated',
      'cms',
      `${target.ticketCode} (Room ${target.roomNumber}) moved to ${status.replace('_', ' ').toUpperCase()}.`
    );
    showToast(
      `${target.ticketCode} Updated`,
      `Room ${target.roomNumber} ticket marked ${status.replace('_', ' ')}.`,
      'info'
    );
  };

  const confirmMaintenanceRepair: HotelContextType['confirmMaintenanceRepair'] = (
    ticketId,
    nextRoomCleanStatus = 'dirty',
    repairNotes
  ) => {
    const target = maintenanceTickets.find((t) => t.id === ticketId);
    if (!target) return;

    const nowStamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const managerName = activeUser?.name || 'Anita Gurung (Hotel Manager)';

    const remainingOpenForRoom = maintenanceTickets.filter(
      (t) => t.id !== ticketId && t.unitId === target.unitId && t.status !== 'resolved'
    );

    setMaintenanceTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId
          ? {
              ...t,
              status: 'resolved',
              repairNotes: repairNotes !== undefined && repairNotes.trim() ? repairNotes.trim() : t.repairNotes,
              confirmedByManager: managerName,
              resolvedAt: nowStamp,
            }
          : t
      )
    );

    setRoomUnits((prev) =>
      prev.map((u) => {
        if (u.id !== target.unitId) return u;
        if (remainingOpenForRoom.length > 0) {
          return {
            ...u,
            cleanStatus: 'out_of_order',
            maintenanceNote: remainingOpenForRoom[0].issueTitle,
          };
        }
        return {
          ...u,
          cleanStatus: nextRoomCleanStatus,
          maintenanceNote: '',
          inspectedBy: nextRoomCleanStatus === 'clean' || nextRoomCleanStatus === 'inspected' ? managerName : u.inspectedBy,
          lastCleanedAt:
            nextRoomCleanStatus === 'clean' || nextRoomCleanStatus === 'inspected'
              ? `Repaired & Verified ${nowStamp.slice(11)}`
              : u.lastCleanedAt,
        };
      })
    );

    addAuditLog(
      'Maintenance Repairs Confirmed',
      'cms',
      `${managerName} confirmed repairs for ${target.ticketCode} (Room ${target.roomNumber}). Heatmap updated to ${
        remainingOpenForRoom.length > 0 ? 'OUT_OF_ORDER (remaining tickets)' : nextRoomCleanStatus.toUpperCase()
      }.`
    );

    showToast(
      `Room ${target.roomNumber} Repairs Confirmed`,
      remainingOpenForRoom.length > 0
        ? `Ticket resolved, but ${remainingOpenForRoom.length} other ticket(s) keep Room ${target.roomNumber} Out of Order.`
        : `Room ${target.roomNumber} cleared from Out of Order and set to ${nextRoomCleanStatus.replace('_', ' ').toUpperCase()}.`,
      'success'
    );
  };

  // ----------------- KAMAL REWARDS LOYALTY ACTIONS -----------------
  const computeLoyaltyTier = (lifetimePoints: number): LoyaltyTier => {
    if (lifetimePoints >= 3000) return 'Platinum Summit';
    if (lifetimePoints >= 1000) return 'Gold Himalayan';
    return 'Silver Explorer';
  };

  const getGuestLoyaltyAccount: HotelContextType['getGuestLoyaltyAccount'] = (
    guestEmail,
    guestName,
    bookingCode
  ) => {
    const cleanEmail = (guestEmail || '').trim().toLowerCase();
    const cleanName = (guestName || '').trim().toLowerCase();
    const cleanCode = (bookingCode || '').trim().toLowerCase();

    if (cleanEmail) {
      const byEmail = loyaltyMembers.find((m) => m.guestEmail.toLowerCase() === cleanEmail);
      if (byEmail) return byEmail;
    }

    if (cleanCode) {
      const byCode = loyaltyMembers.find((m) =>
        m.transactions.some((tx) => tx.bookingCode?.toLowerCase() === cleanCode)
      );
      if (byCode) return byCode;

      const linkedBooking = bookings.find((b) => b.bookingCode.toLowerCase() === cleanCode);
      if (linkedBooking?.guestEmail) {
        const byLinkedEmail = loyaltyMembers.find(
          (m) => m.guestEmail.toLowerCase() === linkedBooking.guestEmail.toLowerCase()
        );
        if (byLinkedEmail) return byLinkedEmail;
      }
    }

    if (cleanName) {
      return loyaltyMembers.find(
        (m) =>
          m.guestName.toLowerCase() === cleanName ||
          m.guestName.toLowerCase().includes(cleanName) ||
          cleanName.includes(m.guestName.toLowerCase())
      );
    }

    return undefined;
  };

  const adjustLoyaltyPoints: HotelContextType['adjustLoyaltyPoints'] = ({
    guestName,
    guestEmail,
    guestPhone,
    bookingCode,
    pointsDelta,
    reason,
    transactionType,
    silentToast,
  }) => {
    const cleanDelta = Math.round(pointsDelta);
    const existing = getGuestLoyaltyAccount(guestEmail, guestName, bookingCode);
    const nowStamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const actor =
      activeUser?.name ||
      (transactionType === 'booking_earn' || transactionType === 'dining_earn'
        ? 'System Auto-Earn'
        : 'Front Desk Staff');
    const resolvedType: LoyaltyTransactionType =
      transactionType || (cleanDelta >= 0 ? 'manual_credit' : 'manual_debit');

    if (existing) {
      const nextBalance = Math.max(0, existing.pointsBalance + cleanDelta);
      const actualDelta = nextBalance - existing.pointsBalance;
      const nextLifetime =
        actualDelta > 0
          ? existing.lifetimePointsEarned + actualDelta
          : existing.lifetimePointsEarned;
      const nextTier = computeLoyaltyTier(Math.max(nextLifetime, nextBalance));

      const newTx: LoyaltyPointTransaction = {
        id: 'ltx-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
        timestamp: nowStamp,
        type: resolvedType,
        pointsDelta: actualDelta,
        balanceAfter: nextBalance,
        reason: reason.trim() || 'Manual staff point adjustment',
        bookingCode: bookingCode || undefined,
        adjustedBy: actor,
      };

      const updatedMember: KamalRewardsMember = {
        ...existing,
        pointsBalance: nextBalance,
        lifetimePointsEarned: nextLifetime,
        tier: nextTier,
        transactions: [newTx, ...existing.transactions],
      };

      setLoyaltyMembers((prev) =>
        prev.map((m) => (m.id === existing.id ? updatedMember : m))
      );

      addAuditLog(
        'Kamal Rewards Adjusted',
        'booking',
        `${updatedMember.guestName} (${updatedMember.memberNumber}): ${actualDelta >= 0 ? '+' : ''}${actualDelta} pts -> Balance: ${nextBalance.toLocaleString()} pts (${reason}).`
      );

      if (!silentToast) {
        showToast(
          'Kamal Rewards Updated',
          `${updatedMember.guestName}: ${actualDelta >= 0 ? '+' : ''}${actualDelta} pts (Balance: ${nextBalance.toLocaleString()} pts)`,
          actualDelta >= 0 ? 'success' : 'info'
        );
      }
      return updatedMember;
    }

    const startBalance = Math.max(0, cleanDelta);
    const memberNumber = `KR-${new Date().getFullYear()}-${String(105 + loyaltyMembers.length).padStart(4, '0')}`;
    const newTx: LoyaltyPointTransaction = {
      id: 'ltx-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
      timestamp: nowStamp,
      type: resolvedType,
      pointsDelta: startBalance,
      balanceAfter: startBalance,
      reason: reason.trim() || 'Initial Kamal Rewards enrollment & credit',
      bookingCode: bookingCode || undefined,
      adjustedBy: actor,
    };

    const createdMember: KamalRewardsMember = {
      id: 'kr-' + Date.now(),
      memberNumber,
      guestName: guestName.trim() || 'Hotel Guest',
      guestEmail:
        (guestEmail || '').trim().toLowerCase() ||
        `${guestName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@guest.kamalhotel.np`,
      guestPhone,
      pointsBalance: startBalance,
      lifetimePointsEarned: startBalance,
      tier: computeLoyaltyTier(startBalance),
      joinedAt: nowStamp.slice(0, 10),
      transactions: [newTx],
    };

    setLoyaltyMembers((prev) => [createdMember, ...prev]);

    addAuditLog(
      'Kamal Rewards Member Enrolled',
      'booking',
      `Enrolled ${createdMember.guestName} (${memberNumber}) with ${startBalance.toLocaleString()} pts.`
    );

    if (!silentToast) {
      showToast(
        'Kamal Rewards Account Updated',
        `${createdMember.guestName} enrolled (${createdMember.pointsBalance.toLocaleString()} pts).`,
        'success'
      );
    }
    return createdMember;
  };

  const redeemLoyaltyPerk: HotelContextType['redeemLoyaltyPerk'] = ({
    guestName,
    guestEmail,
    bookingCode,
    costPoints,
    perkTitle,
  }) => {
    const account = getGuestLoyaltyAccount(guestEmail, guestName, bookingCode);
    if (!account || account.pointsBalance < costPoints) {
      const msg = `Insufficient Kamal Rewards points. Need ${costPoints.toLocaleString()} pts (available: ${account?.pointsBalance.toLocaleString() || 0} pts).`;
      showToast('Redemption Unavailable', msg, 'warning');
      return { success: false, message: msg };
    }

    adjustLoyaltyPoints({
      guestName: account.guestName,
      guestEmail: account.guestEmail,
      bookingCode,
      pointsDelta: -Math.abs(costPoints),
      reason: `Perk Redeemed: ${perkTitle}`,
      transactionType: 'reward_redeemed',
      silentToast: true,
    });

    dispatchOperationalAlert({
      title: 'Kamal Rewards Perk Redeemed',
      message: `${account.guestName} (${bookingCode || account.memberNumber}) redeemed ${costPoints.toLocaleString()} pts for "${perkTitle}".`,
      type: 'booking',
      targetRoles: ['super_admin', 'admin', 'hotel_manager', 'receptionist', 'waiter'],
      bookingCode,
    });

    showToast(
      'Reward Redeemed',
      `Applied "${perkTitle}" (-${costPoints.toLocaleString()} pts). Front desk & hospitality notified.`,
      'success'
    );
    return { success: true, message: `Redeemed ${perkTitle} successfully.` };
  };

  // ----------------- WAKE-UP CALL SCHEDULER ACTIONS -----------------
  const scheduleWakeUpCall: HotelContextType['scheduleWakeUpCall'] = ({
    roomNumber,
    bookingCode,
    guestName,
    wakeUpDate,
    wakeUpTime,
    repeatDaily = false,
    deliveryMethod = 'phone_ring',
    beveragePreference,
    notes,
  }) => {
    const requestCode = `WK-${Math.floor(1050 + Math.random() * 8900)}`;
    const nowStamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const newCall: WakeUpCallRequest = {
      id: 'wk-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
      requestCode,
      roomNumber,
      bookingCode,
      guestName,
      wakeUpDate,
      wakeUpTime,
      repeatDaily,
      deliveryMethod,
      beveragePreference: beveragePreference || 'None',
      notes: notes?.trim() || undefined,
      status: 'scheduled',
      requestedAt: nowStamp,
    };

    setWakeUpCalls((prev) => [newCall, ...prev]);

    const deliveryLabel =
      deliveryMethod === 'both'
        ? 'Telephone + Door Knock'
        : deliveryMethod === 'in_person_knock'
        ? 'Door Knock'
        : 'Telephone Ring';

    dispatchOperationalAlert({
      title: `Wake-Up Call Requested (${roomNumber})`,
      message: `${guestName} requested a ${wakeUpTime} wake-up call for ${wakeUpDate} via ${deliveryLabel}${
        beveragePreference && beveragePreference !== 'None' ? ` · ${beveragePreference}` : ''
      }.`,
      type: 'wake_up_call',
      targetRoles: ['super_admin', 'admin', 'hotel_manager', 'receptionist'],
      roomNumber: roomNumber.replace(/^Room\s+/i, ''),
      bookingCode,
    });

    addAuditLog(
      'Wake-Up Call Scheduled',
      'booking',
      `${guestName} (${roomNumber}) scheduled ${requestCode} for ${wakeUpDate} at ${wakeUpTime} (${deliveryLabel}).`
    );

    showToast(
      'Wake-Up Call Confirmed',
      `Front Desk alerted for ${wakeUpDate} at ${wakeUpTime} (${roomNumber}).`,
      'success'
    );
    return newCall;
  };

  const updateWakeUpCallStatus: HotelContextType['updateWakeUpCallStatus'] = (wakeUpId, status) => {
    const actor = activeUser?.name || (activeRole === 'guest' ? 'Guest Portal' : 'Front Desk Staff');
    const nowStamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const target = wakeUpCalls.find((w) => w.id === wakeUpId);

    setWakeUpCalls((prev) =>
      prev.map((w) => {
        if (w.id !== wakeUpId) return w;
        return {
          ...w,
          status,
          acknowledgedBy: status === 'acknowledged' || status === 'completed' ? w.acknowledgedBy || actor : w.acknowledgedBy,
          completedBy: status === 'completed' ? actor : w.completedBy,
          completedAt: status === 'completed' ? nowStamp : w.completedAt,
        };
      })
    );

    if (target) {
      if (status === 'alerted') {
        dispatchOperationalAlert({
          title: `Wake-Up Call Due Now (${target.roomNumber})`,
          message: `Action required: Place wake-up call to ${target.guestName} (${target.roomNumber}) scheduled for ${target.wakeUpTime}.`,
          type: 'wake_up_call',
          targetRoles: ['super_admin', 'admin', 'hotel_manager', 'receptionist'],
          roomNumber: target.roomNumber.replace(/^Room\s+/i, ''),
          bookingCode: target.bookingCode,
        });
      }

      addAuditLog(
        'Wake-Up Call Updated',
        'booking',
        `${target.requestCode} (${target.roomNumber}) marked ${status.toUpperCase()} by ${actor}.`
      );

      showToast(
        'Wake-Up Call Updated',
        `${target.roomNumber} (${target.wakeUpTime}) marked ${status.replace('_', ' ')}.`,
        status === 'cancelled' ? 'info' : 'success'
      );
    }
  };

  // ----------------- HOUSEKEEPING CHECKLIST: DEEP CLEANING & FLOOR SUPPLIES -----------------
  const createDeepCleaningSchedule: HotelContextType['createDeepCleaningSchedule'] = ({
    unitId,
    scheduledDate,
    frequency,
    assignedHousekeeper,
    tasks,
    notes,
  }) => {
    const unit = roomUnits.find((u) => u.id === unitId);
    if (!unit) return null;

    const cleanTasks: DeepCleaningChecklistItem[] = (tasks.length > 0
      ? tasks
      : [
          'HEPA carpet vacuum & upholstery steam sanitize',
          'Window glass, balcony door tracks & sill wash',
          'Bathroom fixture descale & tile grout sanitize',
          'Split AC filter clean & exhaust fan wipe',
        ]
    )
      .map((label, idx) => ({
        id: `task-${Date.now()}-${idx}`,
        label: label.trim(),
        completed: false,
      }))
      .filter((t) => t.label.length > 0);

    const created: DeepCleaningSchedule = {
      id: 'dc-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
      scheduleCode: `DC-${Math.floor(210 + Math.random() * 780)}`,
      unitId: unit.id,
      roomNumber: unit.roomNumber,
      floor: unit.floor,
      scheduledDate,
      frequency,
      assignedHousekeeper: assignedHousekeeper.trim() || 'Sunita Thapa',
      status: 'scheduled',
      tasks: cleanTasks,
      notes: notes?.trim() || undefined,
    };

    setDeepCleaningSchedules((prev) => [created, ...prev]);
    addAuditLog(
      'Deep-Clean Schedule Created',
      'cms',
      `Scheduled ${frequency} deep clean (${created.scheduleCode}) for Room ${unit.roomNumber} (${unit.floor}) on ${scheduledDate} — Lead: ${created.assignedHousekeeper}.`
    );
    showToast(
      'Deep-Clean Scheduled',
      `Room ${unit.roomNumber} (${unit.floor}) assigned to ${created.assignedHousekeeper} for ${scheduledDate}.`,
      'success'
    );
    return created;
  };

  const toggleDeepCleanTask: HotelContextType['toggleDeepCleanTask'] = (scheduleId, taskId) => {
    const nowStamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
    setDeepCleaningSchedules((prev) =>
      prev.map((sched) => {
        if (sched.id !== scheduleId) return sched;
        const nextTasks = sched.tasks.map((t) =>
          t.id === taskId ? { ...t, completed: !t.completed } : t
        );
        const doneCount = nextTasks.filter((t) => t.completed).length;
        let nextStatus: DeepCleanStatus = sched.status;
        if (doneCount === nextTasks.length && nextTasks.length > 0) {
          nextStatus = 'completed';
        } else if (doneCount > 0) {
          nextStatus = 'in_progress';
        } else if (sched.status === 'completed') {
          nextStatus = 'scheduled';
        }
        return {
          ...sched,
          tasks: nextTasks,
          status: nextStatus,
          completedAt: nextStatus === 'completed' ? nowStamp : undefined,
        };
      })
    );
  };

  const updateDeepCleanStatus: HotelContextType['updateDeepCleanStatus'] = (scheduleId, status) => {
    const nowStamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const target = deepCleaningSchedules.find((s) => s.id === scheduleId);
    setDeepCleaningSchedules((prev) =>
      prev.map((s) => {
        if (s.id !== scheduleId) return s;
        return {
          ...s,
          status,
          tasks:
            status === 'completed'
              ? s.tasks.map((t) => ({ ...t, completed: true }))
              : s.tasks,
          completedAt: status === 'completed' ? nowStamp : undefined,
        };
      })
    );
    if (target) {
      addAuditLog(
        'Deep-Clean Status Updated',
        'cms',
        `${target.scheduleCode} (Room ${target.roomNumber}) marked ${status.replace('_', ' ').toUpperCase()}.`
      );
      showToast(
        'Checklist Updated',
        `Room ${target.roomNumber} deep clean marked ${status.replace('_', ' ')}.`,
        'success'
      );
    }
  };

  const adjustFloorSupplyStock: HotelContextType['adjustFloorSupplyStock'] = (
    supplyId,
    value,
    mode = 'delta'
  ) => {
    const actor = activeUser?.name || 'Housekeeping Staff';
    const nowStamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
    let targetName = '';
    let targetFloor = '';
    let resultingStock = 0;

    setFloorSupplies((prev) =>
      prev.map((item) => {
        if (item.id !== supplyId) return item;
        const nextStock =
          mode === 'set' ? Math.max(0, Math.round(value)) : Math.max(0, item.currentStock + Math.round(value));
        targetName = item.itemName;
        targetFloor = item.floor;
        resultingStock = nextStock;
        return {
          ...item,
          currentStock: nextStock,
          lastRestockedAt: nextStock >= item.currentStock ? nowStamp : item.lastRestockedAt,
          updatedBy: actor,
        };
      })
    );

    if (targetName) {
      addAuditLog(
        'Floor Supply Stock Updated',
        'cms',
        `${targetFloor}: ${targetName} updated to ${resultingStock} units by ${actor}.`
      );
    }
  };

  const addFloorSupplyItem: HotelContextType['addFloorSupplyItem'] = ({
    floor,
    itemName,
    category,
    currentStock,
    parLevel,
    unit,
  }) => {
    const actor = activeUser?.name || 'Housekeeping Lead';
    const nowStamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const created: FloorSupplyItem = {
      id: 'fs-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
      floor,
      itemName: itemName.trim(),
      category,
      currentStock: Math.max(0, Math.round(currentStock)),
      parLevel: Math.max(1, Math.round(parLevel)),
      unit: unit.trim() || 'pcs',
      lastRestockedAt: nowStamp,
      updatedBy: actor,
    };

    setFloorSupplies((prev) => [created, ...prev]);
    addAuditLog(
      'Floor Supply Item Added',
      'cms',
      `Added "${created.itemName}" (${created.currentStock}/${created.parLevel} ${created.unit}) to ${floor}.`
    );
    showToast('Floor Supply Added', `${created.itemName} added to ${floor} inventory.`, 'success');
    return created;
  };

  // ----------------- EXPRESS ROOM TURNOVER WORKFLOW ACTIONS -----------------
  const markRoomReadyForGuestFromTurnover = (unitId: string, roomNumber: string, jobCode: string) => {
    const actor = activeUser?.name || 'Housekeeping Team';
    const readyStamp = `Today ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    setRoomUnits((prev) =>
      prev.map((u) =>
        u.id === unitId
          ? {
              ...u,
              occupancyStatus: 'vacant',
              cleanStatus: 'inspected',
              maintenanceNote: '',
              currentGuestName: undefined,
              currentBookingCode: undefined,
              inspectedBy: `Ready for Guest (${jobCode})`,
              lastCleanedAt: readyStamp,
            }
          : u
      )
    );

    dispatchOperationalAlert({
      title: `Room ${roomNumber} Ready for Guest`,
      message: `Express Turnover ${jobCode} finished all checklist tasks by ${actor}. Heatmap updated to Ready for Guest.`,
      type: 'room_assigned',
      targetRoles: ['super_admin', 'admin', 'hotel_manager', 'receptionist', 'housekeeping'],
      roomNumber,
    });

    addAuditLog(
      'Express Turnover Completed',
      'booking',
      `${jobCode}: Room ${roomNumber} completed all turnover tasks -> Heatmap updated to READY FOR GUEST.`
    );

    showToast(
      `Room ${roomNumber} Ready for Guest`,
      'All express turnover tasks completed. Room Heatmap updated automatically.',
      'success'
    );
  };

  const triggerExpressTurnover: HotelContextType['triggerExpressTurnover'] = ({
    unitId,
    priority,
    assignedHousekeeper,
    targetReadyTime,
    notes,
  }) => {
    const unit = roomUnits.find((u) => u.id === unitId);
    if (!unit) return null;

    const actor = activeUser?.name || 'Front Desk Operations';
    const nowStamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const jobCode = `ET-${unit.roomNumber}-${Math.floor(10 + Math.random() * 89)}`;

    const sequencedSteps: ExpressTurnoverStep[] = [
      { id: `ets-${Date.now()}-1`, stepOrder: 1, label: 'Strip used bedding, towels & empty waste bins', category: 'strip_linen', completed: false },
      { id: `ets-${Date.now()}-2`, stepOrder: 2, label: 'Sanitize bathroom fittings, rain shower & mirrors', category: 'sanitize_bath', completed: false },
      { id: `ets-${Date.now()}-3`, stepOrder: 3, label: 'Make bed with fresh 400TC linens & fluff pillows', category: 'fresh_bedding', completed: false },
      { id: `ets-${Date.now()}-4`, stepOrder: 4, label: 'HEPA vacuum carpet & wipe desk/balcony glass', category: 'sanitize_bath', completed: false },
      { id: `ets-${Date.now()}-5`, stepOrder: 5, label: 'Restock Ayurvedic toiletries, filtered water & tea tray', category: 'amenities_minibar', completed: false },
      { id: `ets-${Date.now()}-6`, stepOrder: 6, label: 'Final fragrance, thermostat & smart lock QA verify', category: 'supervisor_qa', completed: false },
    ];

    const newJob: ExpressTurnoverJob = {
      id: 'et-' + Date.now(),
      jobCode,
      unitId: unit.id,
      roomNumber: unit.roomNumber,
      floor: unit.floor,
      priority,
      assignedHousekeeper: assignedHousekeeper.trim() || 'Sunita Thapa',
      triggeredBy: actor,
      triggeredAt: nowStamp,
      targetReadyTime: targetReadyTime || '14:00',
      status: 'pending',
      steps: sequencedSteps,
      notes: notes?.trim() || undefined,
    };

    setExpressTurnovers((prev) => [newJob, ...prev]);

    // Move room into turnaround on heatmap
    setRoomUnits((prev) =>
      prev.map((u) =>
        u.id === unit.id
          ? {
              ...u,
              occupancyStatus: 'vacant',
              cleanStatus: 'in_progress',
              assignedHousekeeper: newJob.assignedHousekeeper,
            }
          : u
      )
    );

    dispatchOperationalAlert({
      title: `Express Turnover Triggered (Room ${unit.roomNumber})`,
      message: `${priority.replace('_', ' ').toUpperCase()} sequence assigned to ${newJob.assignedHousekeeper} · Target ready: ${newJob.targetReadyTime}.`,
      type: 'room_assigned',
      targetRoles: ['super_admin', 'admin', 'hotel_manager', 'housekeeping', 'receptionist'],
      roomNumber: unit.roomNumber,
    });

    addAuditLog(
      'Express Turnover Triggered',
      'booking',
      `Triggered ${jobCode} for Room ${unit.roomNumber} (${unit.floor}) assigned to ${newJob.assignedHousekeeper}.`
    );

    showToast(
      `Express Turnover Started (${jobCode})`,
      `Room ${unit.roomNumber} moved to Turnaround Queue for ${newJob.assignedHousekeeper}.`,
      'info'
    );
    return newJob;
  };

  const toggleExpressTurnoverStep: HotelContextType['toggleExpressTurnoverStep'] = (jobId, stepId) => {
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const nowFull = new Date().toISOString().slice(0, 16).replace('T', ' ');
    let completedJobTarget: { unitId: string; roomNumber: string; jobCode: string } | null = null;
    let movedBackToProgressUnit: string | null = null;

    setExpressTurnovers((prev) =>
      prev.map((job) => {
        if (job.id !== jobId) return job;
        const nextSteps = job.steps.map((s) =>
          s.id === stepId
            ? { ...s, completed: !s.completed, completedAt: !s.completed ? nowTime : undefined }
            : s
        );
        const doneCount = nextSteps.filter((s) => s.completed).length;
        const allDone = doneCount === nextSteps.length && nextSteps.length > 0;
        const nextStatus: ExpressTurnoverJob['status'] = allDone
          ? 'completed'
          : doneCount > 0
          ? 'in_progress'
          : 'pending';

        if (allDone && job.status !== 'completed') {
          completedJobTarget = { unitId: job.unitId, roomNumber: job.roomNumber, jobCode: job.jobCode };
        } else if (!allDone && job.status === 'completed') {
          movedBackToProgressUnit = job.unitId;
        }

        return {
          ...job,
          steps: nextSteps,
          status: nextStatus,
          completedAt: allDone ? nowFull : undefined,
        };
      })
    );

    if (completedJobTarget) {
      const target = completedJobTarget as { unitId: string; roomNumber: string; jobCode: string };
      markRoomReadyForGuestFromTurnover(target.unitId, target.roomNumber, target.jobCode);
    } else if (movedBackToProgressUnit) {
      setRoomUnits((prev) =>
        prev.map((u) =>
          u.id === movedBackToProgressUnit ? { ...u, cleanStatus: 'in_progress' } : u
        )
      );
    }
  };

  const completeExpressTurnoverJob: HotelContextType['completeExpressTurnoverJob'] = (jobId) => {
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const nowFull = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const targetJob = expressTurnovers.find((j) => j.id === jobId);
    if (!targetJob) return;

    setExpressTurnovers((prev) =>
      prev.map((job) => {
        if (job.id !== jobId) return job;
        return {
          ...job,
          status: 'completed',
          completedAt: nowFull,
          steps: job.steps.map((s) => ({
            ...s,
            completed: true,
            completedAt: s.completedAt || nowTime,
          })),
        };
      })
    );

    markRoomReadyForGuestFromTurnover(targetJob.unitId, targetJob.roomNumber, targetJob.jobCode);
  };

  // ----------------- INTERCOM & IN-ROOM VOIP ACTIONS -----------------
  const sendGuestServiceMessage = (text: string, serviceTag: CSRChatMessage['serviceTag'] = 'concierge') => {
    const room = activeGuestSession?.roomNumber || 'Room 302';
    const guest = activeGuestSession?.guestName || 'In-House Guest';
    const msg: CSRChatMessage = {
      id: 'msg-' + Date.now(),
      sender: 'guest',
      roomNumber: room,
      guestName: guest,
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      serviceTag,
    };
    setGuestChatMessages((prev) => [...prev, msg]);

    // Dispatch operational alert to super_admin, admin, hotel_manager, and receptionist
    dispatchOperationalAlert({
      title: `Guest Service Chat (${room})`,
      message: `${guest} (${room}): "${text.length > 70 ? text.substring(0, 67) + '...' : text}"`,
      type: 'chat',
      targetRoles: ['super_admin', 'admin', 'hotel_manager', 'receptionist'],
      roomNumber: room,
    });

    // Automated Reception reply acknowledgment
    setTimeout(() => {
      setGuestChatMessages((prev) => [
        ...prev,
        {
          id: 'reply-' + Date.now(),
          sender: 'receptionist',
          roomNumber: room,
          guestName: 'Bikash (Front Desk)',
          text: `Namaste ${guest}! We have received your request regarding: "${text}". Our team has dispatched assistance to ${room}.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          serviceTag,
        },
      ]);
    }, 1200);
  };

  const sendStaffReplyMessage = (text: string, roomNumber: string) => {
    const staffName = activeUser?.name || 'Reception Staff';
    const msg: CSRChatMessage = {
      id: 'staff-reply-' + Date.now(),
      sender: 'receptionist',
      roomNumber,
      guestName: staffName,
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      serviceTag: 'front_desk',
    };
    setGuestChatMessages((prev) => [...prev, msg]);
    showToast('Intercom Message Sent', `Delivered to ${roomNumber}`);
  };

  const startVoipCall = (targetRoomOrDept: string) => {
    setIsVoipCallActive(true);
    setActiveVoipTarget(targetRoomOrDept);
    showToast('VoIP Intercom Connected', `Audio link active with ${targetRoomOrDept} (Kamal Hotel SIP Intercom)`, 'info');
  };

  const endVoipCall = () => {
    setIsVoipCallActive(false);
    setActiveVoipTarget(null);
    showToast('VoIP Call Ended', 'Intercom session closed.', 'info');
  };

  // ----------------- COUPONS & PROMO VOUCHERS -----------------
  const addCoupon = (newCp: Omit<HotelCoupon, 'id' | 'timesUsed'>) => {
    const coupon: HotelCoupon = {
      ...newCp,
      id: 'cp-' + Math.random().toString(36).substring(2, 9),
      timesUsed: 0,
      code: newCp.code.trim().toUpperCase(),
    };
    setCoupons((prev) => [coupon, ...prev]);
    persistCollectionItem('coupons', coupon.id, coupon);
    addAuditLog('Created Coupon ' + coupon.code, 'rate', `Added coupon ${coupon.code} with value ${coupon.discountValue}${coupon.discountType === 'percentage' ? '%' : ' USD'}`);
    showToast('Coupon Created', `Promo code "${coupon.code}" is now active.`, 'success');
  };

  const updateCoupon = (id: string, updates: Partial<HotelCoupon>) => {
    const existing = coupons.find((c) => c.id === id);
    if (existing) {
      persistCollectionItem('coupons', id, {
        ...existing,
        ...updates,
        code: updates.code ? updates.code.trim().toUpperCase() : existing.code,
      });
    }
    setCoupons((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates, code: updates.code ? updates.code.trim().toUpperCase() : c.code } : c))
    );
    showToast('Coupon Updated', 'Promo code parameters updated successfully.', 'info');
  };

  const deleteCoupon = (id: string) => {
    setCoupons((prev) => prev.filter((c) => c.id !== id));
    removeCollectionItem('coupons', id);
    showToast('Coupon Deleted', 'Coupon removed from active system.', 'warning');
  };

  const toggleCouponStatus = (id: string) => {
    setCoupons((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const next = { ...c, isActive: !c.isActive };
          persistCollectionItem('coupons', id, next);
          return next;
        }
        return c;
      })
    );
  };

  const validateAndApplyCoupon = (
    code: string,
    subtotalUSD: number,
    serviceScope: CouponServiceScope = 'all'
  ) => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      return { valid: false, discountAmountUSD: 0, message: 'Please enter a coupon or promo code.' };
    }

    const coupon = coupons.find((c) => c.code === cleanCode);
    if (!coupon) {
      return { valid: false, discountAmountUSD: 0, message: `Promo code "${cleanCode}" is invalid or does not exist.` };
    }

    if (!coupon.isActive) {
      return { valid: false, discountAmountUSD: 0, message: `Promo code "${cleanCode}" is currently inactive.` };
    }

    const today = new Date().toISOString().split('T')[0];
    if (coupon.validFrom && today < coupon.validFrom) {
      return { valid: false, discountAmountUSD: 0, message: `Promo code "${cleanCode}" is not yet active.` };
    }
    if (coupon.validUntil && today > coupon.validUntil) {
      return { valid: false, discountAmountUSD: 0, message: `Promo code "${cleanCode}" expired on ${coupon.validUntil}.` };
    }

    if (coupon.usageLimit && coupon.timesUsed >= coupon.usageLimit) {
      return { valid: false, discountAmountUSD: 0, message: `Promo code "${cleanCode}" has reached its maximum redemptions.` };
    }

    if (coupon.applicableTo !== 'all' && serviceScope !== 'all' && coupon.applicableTo !== serviceScope) {
      return { valid: false, discountAmountUSD: 0, message: `Coupon "${cleanCode}" is only applicable to ${coupon.applicableTo.replace('_', ' ')}.` };
    }

    if (coupon.minSpendUSD && subtotalUSD < coupon.minSpendUSD) {
      return {
        valid: false,
        discountAmountUSD: 0,
        message: `Minimum spend of $${coupon.minSpendUSD.toFixed(2)} required for "${cleanCode}".`,
      };
    }

    let discountAmountUSD = 0;
    if (coupon.discountType === 'percentage') {
      discountAmountUSD = (subtotalUSD * coupon.discountValue) / 100;
      if (coupon.maxDiscountUSD && discountAmountUSD > coupon.maxDiscountUSD) {
        discountAmountUSD = coupon.maxDiscountUSD;
      }
    } else {
      discountAmountUSD = Math.min(subtotalUSD, coupon.discountValue);
    }

    return {
      valid: true,
      discountAmountUSD: Math.round(discountAmountUSD * 100) / 100,
      coupon,
      message: `Coupon "${coupon.code}" applied! You saved $${discountAmountUSD.toFixed(2)} (${coupon.description}).`,
    };
  };

  const redeemCoupon = (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    let found = false;
    setCoupons((prev) =>
      prev.map((c) => {
        if (c.code === cleanCode) {
          found = true;
          return { ...c, timesUsed: c.timesUsed + 1 };
        }
        return c;
      })
    );
    return found;
  };

  // ----------------- ROOM SERVICE AMENITY REQUEST ACTIONS -----------------
  const submitRoomServiceRequest: HotelContextType['submitRoomServiceRequest'] = ({
    roomNumber,
    bookingCode,
    guestName,
    items,
    priority = 'normal',
    preferredTime = 'Within 20 mins',
    notes,
  }) => {
    const cleanRoomDigits = roomNumber.replace(/[^0-9A-Za-z]/g, '').slice(-3) || 'RM';
    const seq = String(Math.floor(100 + Math.random() * 900));
    const requestCode = `RS-${cleanRoomDigits}-${seq}`;
    const requestedAt = new Date().toISOString().replace('T', ' ').substring(0, 16);

    const newRequest: RoomServiceRequest = {
      id: 'rs-req-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
      requestCode,
      roomNumber,
      bookingCode,
      guestName,
      items,
      priority,
      preferredTime,
      notes: notes?.trim() || undefined,
      status: 'pending',
      requestedAt,
    };

    setRoomServiceRequests((prev) => [newRequest, ...prev]);

    const itemSummary = items.map((i) => `${i.quantity}x ${i.name}`).join(', ');
    dispatchOperationalAlert({
      title: `Housekeeping Room Service Request (${roomNumber})`,
      message: `${guestName} requested ${itemSummary}${priority === 'urgent' ? ' · URGENT' : ''}. Ref: ${requestCode}`,
      type: 'room_service_amenity',
      targetRoles: ['housekeeping', 'hotel_manager', 'receptionist', 'admin', 'super_admin'],
      linkTab: 'housekeeping',
      bookingCode,
      roomNumber,
    });

    addAuditLog(
      'Room Service Amenity Request',
      'booking',
      `${requestCode} from ${roomNumber} (${guestName}): ${itemSummary}`
    );

    showToast(
      'Request Sent to Housekeeping',
      `${requestCode}: ${itemSummary} forwarded to housekeeping queue.`,
      'success'
    );

    return newRequest;
  };

  const updateRoomServiceRequestStatus: HotelContextType['updateRoomServiceRequestStatus'] = (
    requestId,
    status,
    assignedHousekeeper
  ) => {
    const target = roomServiceRequests.find((r) => r.id === requestId);
    const completedAt =
      status === 'delivered'
        ? new Date().toISOString().replace('T', ' ').substring(0, 16)
        : undefined;

    setRoomServiceRequests((prev) =>
      prev.map((req) =>
        req.id === requestId
          ? {
              ...req,
              status,
              assignedHousekeeper: assignedHousekeeper || req.assignedHousekeeper,
              completedAt: completedAt || req.completedAt,
            }
          : req
      )
    );

    if (target) {
      addAuditLog(
        'Room Service Status Updated',
        'booking',
        `${target.requestCode} (${target.roomNumber}) marked ${status.toUpperCase()}${assignedHousekeeper ? ` by ${assignedHousekeeper}` : ''}.`
      );
      showToast(
        `Room Service · ${target.requestCode}`,
        `${target.roomNumber} amenity delivery marked ${status.replace('_', ' ').toUpperCase()}.`,
        status === 'delivered' ? 'success' : 'info'
      );
    }
  };

  // ----------------- VIP GUEST FLAGGING ACTIONS -----------------
  const flagVipGuest: HotelContextType['flagVipGuest'] = ({
    guestName,
    guestEmail,
    guestPhone,
    tier,
    staysCount = 1,
    lifetimeSpendUSD = 0,
    preferences,
    alertMessage,
  }) => {
    const cleanEmail = guestEmail.trim().toLowerCase();
    const cleanName = guestName.trim();
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const existing = vipGuestProfiles.find(
      (v) =>
        (cleanEmail && v.guestEmail.toLowerCase() === cleanEmail) ||
        v.guestName.toLowerCase() === cleanName.toLowerCase()
    );

    if (existing) {
      const updated: VipGuestProfile = {
        ...existing,
        guestName: cleanName,
        guestEmail: cleanEmail || existing.guestEmail,
        guestPhone: guestPhone?.trim() || existing.guestPhone,
        tier,
        staysCount: Math.max(staysCount, existing.staysCount),
        lifetimeSpendUSD: Math.max(lifetimeSpendUSD, existing.lifetimeSpendUSD),
        preferences: preferences.trim() || existing.preferences,
        alertMessage: alertMessage.trim() || existing.alertMessage,
        flaggedBy: activeUser?.name || 'Reception Desk',
        flaggedAt: nowStr,
        isActive: true,
      };
      setVipGuestProfiles((prev) => prev.map((v) => (v.id === existing.id ? updated : v)));
      addAuditLog('VIP Profile Updated', 'booking', `Updated VIP flag (${formatVipTierLabel(tier)}) for ${cleanName}.`);
      showToast('VIP Profile Updated', `${cleanName} flagged as ${formatVipTierLabel(tier)}. Check-in alerts active.`, 'success');
      return updated;
    }

    const created: VipGuestProfile = {
      id: 'vip-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
      guestName: cleanName,
      guestEmail: cleanEmail || `${cleanName.toLowerCase().replace(/\s+/g, '.')}@guest.com`,
      guestPhone: guestPhone?.trim() || undefined,
      tier,
      staysCount: Math.max(1, staysCount),
      lifetimeSpendUSD: Math.max(0, lifetimeSpendUSD),
      preferences: preferences.trim() || 'Preferred corner quiet room & welcome tea.',
      alertMessage: alertMessage.trim() || `Notify duty manager upon arrival of ${cleanName}.`,
      flaggedBy: activeUser?.name || 'Reception Desk',
      flaggedAt: nowStr,
      isActive: true,
    };

    setVipGuestProfiles((prev) => [created, ...prev]);
    addAuditLog('Guest Flagged as VIP', 'booking', `Flagged ${cleanName} (${formatVipTierLabel(tier)}) for special arrival alerts.`);
    showToast('VIP Guest Flagged', `${cleanName} labeled as ${formatVipTierLabel(tier)}. Staff will be alerted on next check-in.`, 'success');
    return created;
  };

  const toggleVipGuestActive: HotelContextType['toggleVipGuestActive'] = (vipId) => {
    const target = vipGuestProfiles.find((v) => v.id === vipId);
    setVipGuestProfiles((prev) =>
      prev.map((v) => (v.id === vipId ? { ...v, isActive: !v.isActive } : v))
    );
    if (target) {
      showToast(
        'VIP Alert Toggled',
        `Check-in alerts for ${target.guestName} ${target.isActive ? 'paused' : 'reactivated'}.`,
        'info'
      );
    }
  };

  const removeVipGuestFlag: HotelContextType['removeVipGuestFlag'] = (vipId) => {
    const target = vipGuestProfiles.find((v) => v.id === vipId);
    setVipGuestProfiles((prev) => prev.filter((v) => v.id !== vipId));
    if (target) {
      addAuditLog('VIP Flag Removed', 'booking', `Removed VIP label for ${target.guestName}.`);
      showToast('VIP Flag Removed', `${target.guestName} removed from VIP watchlist.`, 'info');
    }
  };

  return (
    <HotelContext.Provider
      value={{
        rooms,
        amenities,
        bookings,
        staff,
        auditLogs,
        notifications,
        themeConfig,
        reviews,
        faqs,
        activeRole,
        activeUser,
        darkMode,
        currentCurrency,
        toasts,
        selectedRoomForBooking,
        isBookingModalOpen,
        isStaffLoggedIn,
        isLoginModalOpen,
        loginModalTargetRole,
        setDarkMode,
        setCurrentCurrency,
        setActiveRole,
        openBookingModal,
        closeBookingModal,
        openLoginModal,
        closeLoginModal,
        loginStaff,
        logoutStaff,
        changeUserPassword,
        createBooking,
        applyServerCreatedBooking,
        refreshBootstrapFromServer,
        assignRoomToBooking,
        getAvailableRoomsForType,
        updateBookingStatus,
        updatePaymentStatus,
        markBookingEmailSent,
        resendBookingConfirmationEmail,
        // Operational Alerts
        operationalAlerts,
        unreadAlertsCount,
        dispatchOperationalAlert,
        markAlertAsRead,
        markAllAlertsAsRead,
        clearAlerts,
        unreadChatMessagesCount,
        updateThemeConfig,
        addRoom,
        updateRoom,
        deleteRoom,
        addAmenity,
        updateAmenity,
        deleteAmenity,
        addReview,
        updateReview,
        deleteReview,
        addFaq,
        updateFaq,
        deleteFaq,
        // Restaurant & Dining
        menuItems,
        restaurantOrders,
        addMenuItem,
        updateMenuItem,
        deleteMenuItem,
        placeRestaurantOrder,
        updateOrderStatus,

        // Stock & Inventory
        stockItems,
        addStockItem,
        updateStockItem,
        deleteStockItem,
        adjustStockQuantity,

        // Billing & Invoices
        billSettings,
        invoices,
        updateBillSettings,
        generateInvoiceForBooking,
        createCustomInvoice,
        updateInvoice,
        addPaymentToInvoice,

        // Guest Sessions & Passcode
        guestSessions,
        activeGuestSession,
        loginGuestByRoom,
        loginGuestWithDatabase,
        logoutGuestSession,
        generateNewRoomPasscode,
        checkoutAndResetRoomPasscode,

        // Intercom & In-Room VoIP
        guestChatMessages,
        sendGuestServiceMessage,
        sendStaffReplyMessage,
        isVoipCallActive,
        activeVoipTarget,
        startVoipCall,
        endVoipCall,

        addStaff,
        updateStaffRoleAndPermissions,
        deleteStaff,
        connectSupabase,
        syncWithSupabase,
        addAuditLog,
        showToast,
        removeToast,

        // Coupons & Promo Vouchers
        coupons,
        addCoupon,
        updateCoupon,
        deleteCoupon,
        toggleCouponStatus,
        validateAndApplyCoupon,
        redeemCoupon,

        // Operational Extensions
        restaurantTables,
        updateTableStatus,
        clearTable,
        addRestaurantTable,
        floors,
        addFloor,
        deleteFloor,
        roomUnits,
        addRoomUnit,
        updateRoomUnit,
        deleteRoomUnit,
        updateRoomCleanStatus,
        checkInRoomUnit,
        checkOutRoomUnit,
        lostAndFound,
        addLostFoundItem,
        updateLostFoundStatus,
        shiftHandovers,
        addShiftHandover,
        nightAudits,
        runNightAudit,
        fastSwitchRole,
        updateStaffCredentials,
        resetAllHotelDataToDefault,

        // Tenant Setup & SMTP
        smtpConfig,
        updateSmtpConfig,
        testSmtpConnection,
        purgeAllDemoData,
        batchImportMenuItems,
        addRoomTypeCatalog,
        massGenerateRoomUnits,

        // Post-Checkout Guest Surveys
        surveys,
        autoTriggerSurveyOnCheckout,
        setAutoTriggerSurveyOnCheckout,
        activeSurveyToken,
        openSurveyModal,
        closeSurveyModal,
        triggerPostCheckoutSurvey,
        submitGuestSurveyResponse,
        publishSurveyToReviews,

        // Department Shift Scheduling & Attendance
        staffShifts,
        staffAvailability,
        assignStaffShift,
        clockStaffAction,
        removeStaffShift,
        updateStaffAvailability,

        // Digital Keycards & Door Reader
        digitalKeycards,
        doorUnlockLogs,
        issueDigitalKeycard,
        revokeDigitalKeycard,
        extendDigitalKeycard,
        verifyAndUnlockDoor,

        // Maintenance Tracker & Out-of-Order Auto-Sync
        maintenanceTickets,
        reportMaintenanceIssue,
        updateMaintenanceTicketStatus,
        confirmMaintenanceRepair,

        // Kamal Rewards Loyalty System
        loyaltyMembers,
        getGuestLoyaltyAccount,
        adjustLoyaltyPoints,
        redeemLoyaltyPerk,

        // Wake-Up Call Scheduler & Front Desk Alerts
        wakeUpCalls,
        scheduleWakeUpCall,
        updateWakeUpCallStatus,

        // Housekeeping Checklist: Deep-Cleaning & Floor Supplies
        deepCleaningSchedules,
        floorSupplies,
        createDeepCleaningSchedule,
        toggleDeepCleanTask,
        updateDeepCleanStatus,
        adjustFloorSupplyStock,
        addFloorSupplyItem,

        // Express Room Turnover Workflow
        expressTurnovers,
        triggerExpressTurnover,
        toggleExpressTurnoverStep,
        completeExpressTurnoverJob,

        // Room Service Amenity Requests -> Housekeeping Queue
        roomServiceRequests,
        submitRoomServiceRequest,
        updateRoomServiceRequestStatus,

        // VIP Guest Flagging & Check-In Alerts
        vipGuestProfiles,
        findVipProfile,
        flagVipGuest,
        toggleVipGuestActive,
        removeVipGuestFlag,

        // Real-time New Booking Popup Alert
        latestBookingPopup,
        dismissBookingPopup,
      }}
    >
      {children}
    </HotelContext.Provider>
  );
};

export const useHotel = () => {
  const context = useContext(HotelContext);
  if (!context) {
    throw new Error('useHotel must be used within a HotelProvider');
  }
  return context;
};


import React, { useState } from 'react';
import { useHotel } from '../../context/HotelContext';
import { 
  StaffRole, 
  Booking, 
  Room, 
  AmenityItem, 
  StaffUser, 
  ThemePalette,
  CurrencyCode,
  GuestReview,
  FaqItem,
  MasterInvoice
} from '../../types/hotel';
import { getThemeClasses, formatCurrency, convertPrice } from '../../utils/theme';
import { downloadBookingVoucherPdf } from '../../utils/printUtility';
import { SUPABASE_SQL_SCHEMA } from '../../services/supabase';
import { 
  LayoutDashboard, 
  CalendarDays, 
  BedDouble, 
  Sliders, 
  Users, 
  ShieldCheck, 
  Bell, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  TrendingUp, 
  DollarSign, 
  Clock, 
  XCircle,
  Database,
  Copy,
  Check,
  ExternalLink,
  MapPin,
  Star,
  Utensils,
  Share2,
  Navigation,
  Smartphone,
  Mail,
  MessageSquare,
  Coins,
  Receipt,
  Boxes,
  Key,
  BarChart3,
  Ticket,
  Image as ImageIcon,
  ConciergeBell,
  UtensilsCrossed,
  ChefHat,
  Sparkles,
  Moon,
  ShieldAlert,
  Layers,
  Terminal,
  Sun,
  Tag,
  Eye,
  Building2,
  Activity,
  Calculator,
  CalendarClock,
  QrCode,
  Wrench,
  Award,
  ArchiveRestore,
  Zap,
  Crown,
  BookOpen,
  Download,
  Printer
} from 'lucide-react';
import { RestaurantBillingManager } from '../Restaurant/RestaurantBillingManager';
import { InventoryStockManager } from '../Inventory/InventoryStockManager';
import { MasterBillingManager } from '../Billing/MasterBillingManager';
import { InvoicePrintModal } from '../Billing/InvoicePrintModal';
import { AccountingFinancialReports } from '../Accounting/AccountingFinancialReports';
import { GuestPasscodeSessionManager } from '../GuestPortal/GuestPasscodeSessionManager';
import { CouponManager } from '../Coupons/CouponManager';
import { StaffGuestIntercom } from '../Intercom/StaffGuestIntercom';
import { MediaGalleryManager } from '../CMS/MediaGalleryManager';
import { CmsManagerPanel } from '../CMS/CmsManagerPanel';
import { ModalDismissButton, useModalDismiss } from '../Common/ModalDismissHandler';
import { ReceptionDesk } from './ReceptionDesk';
import { WaiterPosView } from './WaiterPosView';
import { KitchenKdsView } from './KitchenKdsView';
import { HousekeepingManager } from './HousekeepingManager';
import { NightAuditManager } from './NightAuditManager';
import { AdminUserManager } from './AdminUserManager';
import { RoomFloorManager } from './RoomFloorManager';
import { OperationalQaTestBench } from '../QA/OperationalQaTestBench';
import { HotelTenantOnboardingWizard } from '../SuperAdmin/HotelTenantOnboardingWizard';
import { PerformanceMonitoringDashboard } from './PerformanceMonitoringDashboard';
import { RevenueTrendsWidget } from './RevenueTrendsWidget';
import { OccupancyAnalyticsWidget } from './OccupancyAnalyticsWidget';
import { RoomHeatmapWidget } from './RoomHeatmapWidget';
import { GuestSurveyFeedbackPanel } from './GuestSurveyFeedbackPanel';
import { DynamicInvoicingStudio } from '../Billing/DynamicInvoicingStudio';
import { ShiftSchedulingPanel } from './ShiftSchedulingPanel';
import { DigitalKeycardGenerator } from '../GuestPortal/DigitalKeycardGenerator';
import { MaintenanceTrackerPanel } from './MaintenanceTrackerPanel';
import { WakeUpCallFrontDeskPanel } from './WakeUpCallFrontDeskPanel';
import { LostAndFoundTrackerPanel } from './LostAndFoundTrackerPanel';
import { ExpressTurnoverPanel } from './ExpressTurnoverPanel';
import { VipGuestFlagPanel } from './VipGuestFlagPanel';
import { ServiceRequestsQueuePanel } from './ServiceRequestsQueuePanel';
import { OperationsGuidePanel } from './OperationsGuidePanel';
import { useRenderTracker } from '../../hooks/useRenderTracker';

interface StaffDashboardProps {
  onPreviewGuestSite?: () => void;
}

export const StaffDashboard: React.FC<StaffDashboardProps> = ({ onPreviewGuestSite }) => {
  useRenderTracker('StaffDashboard');
  const { 
    bookings, 
    rooms, 
    amenities, 
    staff, 
    auditLogs, 
    notifications,
    reviews,
    faqs,
    themeConfig, 
    activeRole,
    activeUser,
    currentCurrency,
    updateBookingStatus,
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
    addStaff,
    deleteStaff,
    changeUserPassword,
    updateStaffCredentials,
    updateStaffRoleAndPermissions,
    connectSupabase,
    syncWithSupabase,
    showToast,
    assignRoomToBooking,
    getAvailableRoomsForType,
    roomUnits,
    lostAndFound,
    expressTurnovers,
    roomServiceRequests,
    restaurantOrders,
    vipGuestProfiles,
    findVipProfile,
    flagVipGuest,
    operationalAlerts,
    markAlertAsRead,
    unreadChatMessagesCount,
    getGuestLoyaltyAccount,
    adjustLoyaltyPoints,
    invoices,
    billSettings,
    updateInvoice,
    generateInvoiceForBooking,
    resendBookingConfirmationEmail
  } = useHotel();

  const themeClasses = getThemeClasses(themeConfig.palette);

  // Tabs
  type DashboardTab = 
    | 'tenant_setup'
    | 'room_floors'
    | 'qa_test_suite'
    | 'overview' 
    | 'reception'
    | 'service_requests'
    | 'waiter_pos'
    | 'kitchen_kds'
    | 'housekeeping'
    | 'express_turnover'
    | 'lost_found'
    | 'vip_guests'
    | 'maintenance'
    | 'night_audit'
    | 'admin_users'
    | 'restaurant' 
    | 'billing' 
    | 'dynamic_invoicing'
    | 'inventory' 
    | 'passcodes' 
    | 'digital_keycards'
    | 'coupons'
    | 'intercom'
    | 'media'
    | 'accounting' 
    | 'bookings' 
    | 'rooms' 
    | 'cms' 
    | 'supabase' 
    | 'staff' 
    | 'shift_scheduling'
    | 'notifications' 
    | 'audit'
    | 'perf_monitor'
    | 'surveys'
    | 'ops_guide';

  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');

  React.useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ tab?: DashboardTab }>).detail;
      if (detail?.tab) {
        setActiveTab(detail.tab);
      }
    };
    window.addEventListener('kamal-open-dashboard-tab', handler as EventListener);
    return () => window.removeEventListener('kamal-open-dashboard-tab', handler as EventListener);
  }, []);

  // Strict Role Auto-Routing: immediately opens the respective authorized operational view
  React.useEffect(() => {
    if (activeRole === 'waiter') {
      setActiveTab('waiter_pos');
    } else if (activeRole === 'chef') {
      setActiveTab('kitchen_kds');
    } else if (activeRole === 'receptionist') {
      setActiveTab('reception');
    } else if (activeRole === 'housekeeping') {
      setActiveTab('housekeeping');
    } else if (activeRole === 'restaurant_owner') {
      setActiveTab('restaurant');
    } else if (activeRole === 'admin' || activeRole === 'hotel_manager') {
      setActiveTab('overview');
    } else if (activeRole === 'super_admin') {
      // Retain or default to overview
    }
  }, [activeRole]);

  // Search & Filters
  const [bookingSearch, setBookingSearch] = useState<string>('');
  const [bookingStatusFilter, setBookingStatusFilter] = useState<string>('all');
  const [auditCategoryFilter, setAuditCategoryFilter] = useState<string>('all');

  // Modals for CRUD
  const [isAddRoomOpen, setIsAddRoomOpen] = useState<boolean>(false);
  const [isAddStaffOpen, setIsAddStaffOpen] = useState<boolean>(false);
  const [isAddAmenityOpen, setIsAddAmenityOpen] = useState<boolean>(false);
  const [isAddReviewOpen, setIsAddReviewOpen] = useState<boolean>(false);
  const [isAddFaqOpen, setIsAddFaqOpen] = useState<boolean>(false);

  // Room Assignment Modal
  const [assigningBooking, setAssigningBooking] = useState<Booking | null>(null);
  const [selectedRoomNumber, setSelectedRoomNumber] = useState<string>('');
  const [selectedBookingInvoice, setSelectedBookingInvoice] = useState<MasterInvoice | null>(null);
  const [resendingBookingId, setResendingBookingId] = useState<string | null>(null);

  // Kamal Rewards Manual Point Adjustment Modal
  const [adjustingLoyaltyBooking, setAdjustingLoyaltyBooking] = useState<Booking | null>(null);
  const [loyaltyAdjMode, setLoyaltyAdjMode] = useState<'credit' | 'debit'>('credit');
  const [loyaltyPointsAmount, setLoyaltyPointsAmount] = useState<string>('250');
  const [loyaltyReason, setLoyaltyReason] = useState<string>('Front Desk Courtesy Bonus');

  // Editing items
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [editingAmenity, setEditingAmenity] = useState<AmenityItem | null>(null);
  const [editingReview, setEditingReview] = useState<GuestReview | null>(null);
  const [editingFaq, setEditingFaq] = useState<FaqItem | null>(null);
  const [editingStaffMember, setEditingStaffMember] = useState<StaffUser | null>(null);

  // Modal dismiss bindings (ESC key & body scroll lock)
  useModalDismiss(isAddRoomOpen, () => { setIsAddRoomOpen(false); setEditingRoom(null); });
  useModalDismiss(isAddStaffOpen, () => setIsAddStaffOpen(false));
  useModalDismiss(isAddAmenityOpen, () => { setIsAddAmenityOpen(false); setEditingAmenity(null); });
  useModalDismiss(isAddReviewOpen, () => { setIsAddReviewOpen(false); setEditingReview(null); });
  useModalDismiss(isAddFaqOpen, () => { setIsAddFaqOpen(false); setEditingFaq(null); });
  useModalDismiss(Boolean(editingStaffMember), () => setEditingStaffMember(null));
  useModalDismiss(Boolean(assigningBooking), () => setAssigningBooking(null));
  useModalDismiss(Boolean(adjustingLoyaltyBooking), () => setAdjustingLoyaltyBooking(null));

  // Supabase connection form state
  const [inputSupabaseUrl, setInputSupabaseUrl] = useState<string>(themeConfig.supabaseUrl || '');
  const [inputSupabaseKey, setInputSupabaseKey] = useState<string>(themeConfig.supabaseAnonKey || '');
  const [isConnectingSupabase, setIsConnectingSupabase] = useState<boolean>(false);
  const [copiedSchema, setCopiedSchema] = useState<boolean>(false);

  // Analytics Calculations
  const totalRoomsCount = rooms.reduce((acc, r) => acc + r.totalUnits, 0);
  const totalAvailableRooms = rooms.reduce((acc, r) => acc + r.availableUnits, 0);
  const occupiedRooms = totalRoomsCount - totalAvailableRooms;
  const occupancyRate = totalRoomsCount > 0 ? Math.round((occupiedRooms / totalRoomsCount) * 100) : 0;
  
  const totalRevenue = bookings
    .filter((b) => b.paymentStatus === 'paid')
    .reduce((acc, b) => acc + b.totalAmount, 0);

  const todayCheckIns = bookings.filter((b) => b.bookingStatus === 'confirmed').length;

  const hasPermission = (perm: string): boolean => {
    if (activeRole === 'super_admin') return true;
    if (!activeUser) return false;
    return activeUser.permissions.includes('all_access') || activeUser.permissions.includes(perm);
  };

  // Filtered Bookings (Memoized for performance)
  const filteredBookings = React.useMemo(() => {
    const q = bookingSearch.toLowerCase();
    return bookings.filter((b) => {
      const matchesSearch =
        !q ||
        b.guestName.toLowerCase().includes(q) ||
        b.bookingCode.toLowerCase().includes(q) ||
        b.roomName.toLowerCase().includes(q);
      const matchesStatus = bookingStatusFilter === 'all' || b.bookingStatus === bookingStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [bookings, bookingSearch, bookingStatusFilter]);

  // Filtered Audit Logs (Memoized for performance)
  const filteredAuditLogs = React.useMemo(() => {
    return auditLogs.filter((log) => {
      return auditCategoryFilter === 'all' || log.category === auditCategoryFilter;
    });
  }, [auditLogs, auditCategoryFilter]);

  // Handle Room Form Submit
  const handleSaveRoom = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const roomData = {
      name: formData.get('name') as string,
      slug: (formData.get('name') as string).toLowerCase().replace(/\s+/g, '-'),
      type: formData.get('type') as any,
      pricePerNightUSD: Number(formData.get('pricePerNightUSD')),
      originalPriceUSD: Number(formData.get('originalPriceUSD')) || undefined,
      maxGuests: Number(formData.get('maxGuests')),
      bedType: formData.get('bedType') as string,
      sizeSqFt: Number(formData.get('sizeSqFt')),
      view: formData.get('view') as string,
      floor: formData.get('floor') as string,
      totalUnits: Number(formData.get('totalUnits')),
      availableUnits: Number(formData.get('availableUnits')),
      rating: 4.9,
      reviewsCount: 12,
      description: formData.get('description') as string,
      images: [
        (formData.get('image') as string) || './assets/images/room_deluxe_suite_1793848735141.jpg',
      ],
      amenities: (formData.get('amenities') as string).split(',').map((s) => s.trim()),
    };

    if (editingRoom) {
      updateRoom(editingRoom.id, roomData);
      setEditingRoom(null);
    } else {
      addRoom(roomData);
      setIsAddRoomOpen(false);
    }
  };

  // Change Password state
  const [selectedStaffForPassword, setSelectedStaffForPassword] = useState<StaffUser | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState<string>('');

  useModalDismiss(Boolean(selectedStaffForPassword), () => setSelectedStaffForPassword(null));

  const getDefaultPermissionsForRole = (role: StaffRole): string[] => {
    if (role === 'super_admin') {
      return ['all_access', 'manage_staff', 'edit_cms', 'modify_rates', 'manage_bookings', 'manage_rooms', 'view_finances', 'view_audit_logs', 'supabase_sync'];
    }
    if (role === 'admin') {
      return ['edit_cms', 'modify_rates', 'manage_bookings', 'manage_rooms', 'view_finances', 'manage_coupons', 'process_checkin'];
    }
    if (role === 'hotel_manager') {
      return ['manage_bookings', 'manage_rooms', 'modify_rates', 'process_checkin', 'view_finances', 'view_audit_logs'];
    }
    if (role === 'restaurant_owner') {
      return ['manage_restaurant_pos', 'view_dining_revenue', 'manage_menu_specials', 'view_kot', 'manage_inventory'];
    }
    if (role === 'receptionist') {
      return ['process_checkin', 'manage_bookings', 'view_availability'];
    }
    if (role === 'chef') {
      return ['view_dining_orders', 'manage_menu_specials', 'view_breakfast_counts'];
    }
    if (role === 'waiter') {
      return ['view_dining_orders', 'room_service_dispatch', 'view_guest_preferences'];
    }
    if (role === 'housekeeping') {
      return ['manage_rooms_cleanliness', 'view_availability'];
    }
    return ['view_availability'];
  };

  // Handle Staff Form Submit
  const handleSaveStaff = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const role = formData.get('role') as StaffRole;
    const rawPassword = String(formData.get('password') || '').trim();
    if (rawPassword.length < 8) {
      showToast('Password Policy', 'Staff password must be at least 8 characters.', 'warning');
      return;
    }
    const permissions = getDefaultPermissionsForRole(role);

    await addStaff({
      name: formData.get('name') as string,
      username: (formData.get('username') as string).trim().toLowerCase(),
      password: rawPassword,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      role,
      permissions,
      status: 'active',
      department: formData.get('department') as string,
      lastActive: 'Just registered',
    });
    setIsAddStaffOpen(false);
  };

  // Handle Connect Supabase
  const handleConnectSupabase = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsConnectingSupabase(true);
    await connectSupabase(inputSupabaseUrl.trim(), inputSupabaseKey.trim());
    setIsConnectingSupabase(false);
  };

  const handleCopySchema = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSchema(true);
    showToast('Schema Copied!', 'SQL migration copied to clipboard. Ready to paste in Supabase SQL Editor.', 'success');
    setTimeout(() => setCopiedSchema(false), 3000);
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] dark:bg-[#0F0D0B] text-[#1A1714] dark:text-[#F4EFE6] transition-colors py-6 lg:py-8 w-full max-w-full overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Dashboard Title & Active Persona Header */}
        <div className="bg-white dark:bg-[#171411] rounded-2xl p-5 sm:p-6 border border-[#E6DFD3] dark:border-[#2A241E] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#96682E] dark:text-[#D4A76A]">
                Kamal Hotel PMS · Kamalpokhari, Kathmandu
              </span>
              <span className="text-xs text-[#8E8477]">·</span>
              <span className={`text-xs px-2 py-0.5 rounded font-mono ${
                themeConfig.supabaseConnected 
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300' 
                  : 'bg-[#F3EDE2] dark:bg-[#261E14] text-[#7C531D] dark:text-[#DFBE88]'
              }`}>
                {themeConfig.supabaseConnected ? 'Supabase Sync Active' : 'Local Storage Mode'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-semibold text-[#1A1714] dark:text-[#F4EFE6] tracking-tight">
              Operations, CMS &amp; Database Console
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-[#1A1714] dark:text-[#F4EFE6]">
                {activeUser ? activeUser.name : 'Authorized Staff'}
              </div>
              <div className="text-[11px] text-[#6B6258] dark:text-[#AFA699] font-mono uppercase">
                Role: {activeRole.replace('_', ' ')}
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#F3EDE2] dark:bg-[#261E14] border border-[#E6DFD3] dark:border-[#342C24] text-[#96682E] dark:text-[#DFBE88] font-bold flex items-center justify-center font-serif text-base">
              {activeRole === 'super_admin'
                ? 'SA'
                : activeRole === 'admin'
                ? 'AD'
                : activeRole === 'hotel_manager'
                ? 'HM'
                : activeRole === 'restaurant_owner'
                ? 'RO'
                : activeRole === 'chef'
                ? 'CH'
                : activeRole === 'waiter'
                ? 'WT'
                : activeRole === 'housekeeping'
                ? 'HK'
                : 'FD'}
            </div>
          </div>
        </div>

        {/* VIP Arrival Staff Notification Banner */}
        {(() => {
          const vipAlerts = operationalAlerts.filter((a) => !a.isRead && a.type === 'vip_checkin');
          if (vipAlerts.length === 0) return null;
          const latest = vipAlerts[0];
          return (
            <div className="bg-[#FAF3E6] dark:bg-[#261E14] border border-[#C69553] rounded-xl px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-start gap-2.5">
                <Crown className="w-4 h-4 text-[#96682E] dark:text-[#D4A76A] shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-[#1A1714] dark:text-[#F4EFE6]">
                    {latest.title}
                  </div>
                  <div className="text-[#5C544B] dark:text-[#D7CFC3] mt-0.5">
                    {latest.message}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('vip_guests')}
                  className="px-3 py-1.5 rounded-lg border border-[#C69553] text-[#7C531D] dark:text-[#EAD8B8] hover:bg-[#F3E6CE] dark:hover:bg-[#322719] font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Open VIP Watchlist
                </button>
                <button
                  type="button"
                  onClick={() => markAlertAsRead(latest.id)}
                  className="px-3 py-1.5 rounded-lg bg-[#1A1714] dark:bg-[#C69553] hover:bg-[#2E2721] dark:hover:bg-[#D4A76A] text-white dark:text-[#14110E] font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Acknowledge
                </button>
              </div>
            </div>
          );
        })()}

        {/* Dashboard Navigation & Active Workspace */}
        {(() => {
          const openFood = restaurantOrders.filter(
            (o) => o.status !== 'delivered' && o.status !== 'cancelled'
          ).length;
          const openAmenities = roomServiceRequests.filter(
            (r) => r.status === 'pending' || r.status === 'acknowledged' || r.status === 'in_progress'
          ).length;
          const totalOpenService = openFood + openAmenities;

          type NavGroup = 'Overview' | 'Front Office' | 'Dining & Kitchen' | 'Housekeeping' | 'Finance & Billing' | 'Admin & CMS';
          type NavItem = {
            id: DashboardTab;
            group: NavGroup;
            label: string;
            icon: React.ReactNode;
            perm: boolean;
          };

          const rawNavItems: NavItem[] = [
            { id: 'overview', group: 'Overview', label: 'Overview & KPIs', icon: <LayoutDashboard className="w-4 h-4 shrink-0" />, perm: true },
            { id: 'ops_guide', group: 'Overview', label: 'Operations Guide', icon: <BookOpen className="w-4 h-4 shrink-0" />, perm: true },
            { id: 'notifications', group: 'Overview', label: `Alerts (${notifications.length})`, icon: <Bell className="w-4 h-4 shrink-0" />, perm: true },
            { id: 'perf_monitor', group: 'Overview', label: 'Performance & Cache Monitor', icon: <Activity className="w-4 h-4 shrink-0" />, perm: activeRole === 'super_admin' || activeRole === 'admin' || activeRole === 'hotel_manager' },

            { id: 'reception', group: 'Front Office', label: 'Front Desk & GRC Check-in', icon: <ConciergeBell className="w-4 h-4 shrink-0" />, perm: activeRole === 'super_admin' || activeRole === 'admin' || activeRole === 'hotel_manager' || activeRole === 'receptionist' },
            { id: 'bookings', group: 'Front Office', label: `Reservations (${bookings.length})`, icon: <CalendarDays className="w-4 h-4 shrink-0" />, perm: activeRole === 'super_admin' || activeRole === 'admin' || activeRole === 'hotel_manager' || activeRole === 'receptionist' },
            { id: 'passcodes', group: 'Front Office', label: 'Guest Passcodes & PINs', icon: <Key className="w-4 h-4 shrink-0" />, perm: activeRole === 'super_admin' || activeRole === 'admin' || activeRole === 'hotel_manager' || activeRole === 'receptionist' },
            { id: 'digital_keycards', group: 'Front Office', label: 'Digital Keycards (QR)', icon: <QrCode className="w-4 h-4 shrink-0" />, perm: activeRole === 'super_admin' || activeRole === 'admin' || activeRole === 'hotel_manager' || activeRole === 'receptionist' },
            { id: 'vip_guests', group: 'Front Office', label: `VIP Guests (${vipGuestProfiles.filter((v) => v.isActive).length})`, icon: <Crown className="w-4 h-4 shrink-0" />, perm: activeRole === 'super_admin' || activeRole === 'admin' || activeRole === 'hotel_manager' || activeRole === 'receptionist' },
            { id: 'intercom', group: 'Front Office', label: unreadChatMessagesCount > 0 ? `Guest Intercom (${unreadChatMessagesCount})` : 'Guest Intercom & Chat', icon: <MessageSquare className="w-4 h-4 shrink-0" />, perm: activeRole === 'super_admin' || activeRole === 'admin' || activeRole === 'hotel_manager' || activeRole === 'receptionist' || activeRole === 'waiter' },
            { id: 'surveys', group: 'Front Office', label: 'Guest Surveys & Feedback', icon: <Star className="w-4 h-4 shrink-0" />, perm: activeRole === 'super_admin' || activeRole === 'admin' || activeRole === 'hotel_manager' || activeRole === 'receptionist' || activeRole === 'restaurant_owner' },

            { id: 'waiter_pos', group: 'Dining & Kitchen', label: 'Waiter POS & Dine-in Tables', icon: <UtensilsCrossed className="w-4 h-4 shrink-0" />, perm: activeRole === 'super_admin' || activeRole === 'admin' || activeRole === 'restaurant_owner' || activeRole === 'hotel_manager' || activeRole === 'waiter' },
            { id: 'kitchen_kds', group: 'Dining & Kitchen', label: 'Kitchen Display (KDS)', icon: <ChefHat className="w-4 h-4 shrink-0" />, perm: activeRole === 'super_admin' || activeRole === 'admin' || activeRole === 'restaurant_owner' || activeRole === 'hotel_manager' || activeRole === 'chef' },
            { id: 'restaurant', group: 'Dining & Kitchen', label: 'Ground-Floor Dining & POS', icon: <Utensils className="w-4 h-4 shrink-0" />, perm: activeRole === 'super_admin' || activeRole === 'admin' || activeRole === 'restaurant_owner' || activeRole === 'hotel_manager' || activeRole === 'chef' || activeRole === 'waiter' },
            { id: 'service_requests', group: 'Dining & Kitchen', label: totalOpenService > 0 ? `Service Requests (${totalOpenService})` : 'Service Requests', icon: <Bell className="w-4 h-4 shrink-0" />, perm: activeRole === 'super_admin' || activeRole === 'admin' || activeRole === 'hotel_manager' || activeRole === 'receptionist' || activeRole === 'restaurant_owner' || activeRole === 'waiter' || activeRole === 'chef' || activeRole === 'housekeeping' },
            { id: 'inventory', group: 'Dining & Kitchen', label: 'Stock & Inventory', icon: <Boxes className="w-4 h-4 shrink-0" />, perm: activeRole === 'super_admin' || activeRole === 'admin' || activeRole === 'restaurant_owner' || activeRole === 'hotel_manager' || activeRole === 'chef' || activeRole === 'housekeeping' },

            { id: 'housekeeping', group: 'Housekeeping', label: openAmenities > 0 ? `Housekeeping (${openAmenities} Req)` : 'Housekeeping & Turnaround', icon: <Sparkles className="w-4 h-4 shrink-0" />, perm: activeRole === 'super_admin' || activeRole === 'admin' || activeRole === 'hotel_manager' || activeRole === 'housekeeping' },
            { id: 'express_turnover', group: 'Housekeeping', label: `Express Turnover (${expressTurnovers.filter((j) => j.status !== 'completed').length})`, icon: <Zap className="w-4 h-4 shrink-0" />, perm: activeRole === 'super_admin' || activeRole === 'admin' || activeRole === 'hotel_manager' || activeRole === 'housekeeping' || activeRole === 'receptionist' },
            { id: 'maintenance', group: 'Housekeeping', label: 'Maintenance & Checklist', icon: <Wrench className="w-4 h-4 shrink-0" />, perm: activeRole === 'super_admin' || activeRole === 'admin' || activeRole === 'hotel_manager' || activeRole === 'housekeeping' || activeRole === 'receptionist' },
            { id: 'lost_found', group: 'Housekeeping', label: `Lost & Found (${lostAndFound.filter((i) => i.status === 'stored').length})`, icon: <ArchiveRestore className="w-4 h-4 shrink-0" />, perm: activeRole === 'super_admin' || activeRole === 'admin' || activeRole === 'hotel_manager' || activeRole === 'housekeeping' || activeRole === 'receptionist' },
            { id: 'room_floors', group: 'Housekeeping', label: 'Rooms & Floors Manager', icon: <Layers className="w-4 h-4 shrink-0" />, perm: activeRole === 'super_admin' || activeRole === 'admin' || activeRole === 'hotel_manager' || activeRole === 'receptionist' },
            { id: 'rooms', group: 'Housekeeping', label: `Room Inventory (${rooms.length})`, icon: <BedDouble className="w-4 h-4 shrink-0" />, perm: activeRole === 'super_admin' || activeRole === 'admin' || activeRole === 'hotel_manager' || activeRole === 'receptionist' || activeRole === 'housekeeping' },

            { id: 'billing', group: 'Finance & Billing', label: 'Billing & Folios (5 Templates)', icon: <Receipt className="w-4 h-4 shrink-0" />, perm: activeRole === 'super_admin' || activeRole === 'admin' || activeRole === 'hotel_manager' || activeRole === 'receptionist' },
            { id: 'dynamic_invoicing', group: 'Finance & Billing', label: 'Dynamic Invoicing', icon: <Calculator className="w-4 h-4 shrink-0" />, perm: activeRole === 'super_admin' || activeRole === 'admin' || activeRole === 'hotel_manager' || activeRole === 'receptionist' },
            { id: 'accounting', group: 'Finance & Billing', label: 'Accounting & P&L', icon: <BarChart3 className="w-4 h-4 shrink-0" />, perm: activeRole === 'super_admin' || activeRole === 'admin' || activeRole === 'restaurant_owner' || activeRole === 'hotel_manager' },
            { id: 'coupons', group: 'Finance & Billing', label: 'Coupons & Vouchers', icon: <Ticket className="w-4 h-4 shrink-0" />, perm: activeRole === 'super_admin' || activeRole === 'admin' || activeRole === 'hotel_manager' || activeRole === 'receptionist' },
            { id: 'night_audit', group: 'Finance & Billing', label: 'Night Audit & Day Close', icon: <Moon className="w-4 h-4 shrink-0" />, perm: activeRole === 'super_admin' || activeRole === 'admin' || activeRole === 'hotel_manager' },

            { id: 'cms', group: 'Admin & CMS', label: 'CMS Page & Rates Editor', icon: <Sliders className="w-4 h-4 shrink-0" />, perm: activeRole === 'super_admin' || activeRole === 'admin' },
            { id: 'media', group: 'Admin & CMS', label: 'Hero & Photos CMS', icon: <ImageIcon className="w-4 h-4 shrink-0" />, perm: activeRole === 'super_admin' || activeRole === 'admin' },
            { id: 'staff', group: 'Admin & CMS', label: `Staff & RBAC (${staff.length})`, icon: <Users className="w-4 h-4 shrink-0" />, perm: activeRole === 'super_admin' },
            { id: 'admin_users', group: 'Admin & CMS', label: 'Staff Credentials & Balancer', icon: <ShieldAlert className="w-4 h-4 shrink-0" />, perm: activeRole === 'super_admin' },
            { id: 'shift_scheduling', group: 'Admin & CMS', label: 'Shift Scheduling', icon: <CalendarClock className="w-4 h-4 shrink-0" />, perm: activeRole === 'super_admin' || activeRole === 'admin' || activeRole === 'hotel_manager' || activeRole === 'restaurant_owner' || activeRole === 'receptionist' || activeRole === 'housekeeping' },
            { id: 'audit', group: 'Admin & CMS', label: `Audit Logs (${auditLogs.length})`, icon: <ShieldCheck className="w-4 h-4 shrink-0" />, perm: activeRole === 'super_admin' || activeRole === 'admin' || activeRole === 'hotel_manager' },
            { id: 'supabase', group: 'Admin & CMS', label: 'Supabase Backend & DB', icon: <Database className="w-4 h-4 shrink-0" />, perm: activeRole === 'super_admin' },
            { id: 'tenant_setup', group: 'Admin & CMS', label: 'Tenant Onboarding & Setup', icon: <Building2 className="w-4 h-4 shrink-0" />, perm: activeRole === 'super_admin' },
            { id: 'qa_test_suite', group: 'Admin & CMS', label: 'Operational QA Test Bench', icon: <Terminal className="w-4 h-4 shrink-0" />, perm: import.meta.env.DEV || activeRole === 'super_admin' || activeRole === 'admin' },
          ];
          const navItems = rawNavItems.filter((tab) => tab.perm);

          const groupOrder: NavGroup[] = [
            'Overview',
            'Front Office',
            'Dining & Kitchen',
            'Housekeeping',
            'Finance & Billing',
            'Admin & CMS',
          ];

          return (
            <div className="lg:grid lg:grid-cols-[248px_1fr] gap-6 items-start">
              {/* Unified Responsive Department Navigation (Horizontal strip < lg, Grouped Left Sidebar >= lg) */}
              <aside className="flex items-center gap-1.5 overflow-x-auto pb-2.5 mb-5 border-b border-[#E6DFD3] dark:border-[#2A241E] lg:block lg:mb-0 lg:bg-white lg:dark:bg-[#171411] lg:rounded-2xl lg:border lg:p-3.5 lg:shadow-sm lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:space-y-4">
                {groupOrder.map((groupName) => {
                  const groupTabs = navItems.filter((t) => t.group === groupName);
                  if (groupTabs.length === 0) return null;
                  return (
                    <div key={groupName} className="contents lg:block lg:space-y-1">
                      <div className="hidden lg:block px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8E8477]">
                        {groupName}
                      </div>
                      {groupTabs.map((tab) => {
                        const isActive = activeTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`whitespace-nowrap shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer lg:w-full lg:gap-2.5 lg:px-3 lg:text-left ${
                              isActive
                                ? 'bg-[#1A1714] text-[#FAF7F2] dark:bg-[#C69553] dark:text-[#14110E] font-semibold shadow-xs'
                                : 'text-[#5C544B] dark:text-[#C5BCB0] hover:text-[#1A1714] dark:hover:text-[#F4EFE6] hover:bg-[#EFE9DF] dark:hover:bg-[#211B16]'
                            }`}
                          >
                            <span className={isActive ? 'text-[#DFBE88] dark:text-[#14110E]' : 'text-[#96682E] dark:text-[#D4A76A]'}>
                              {tab.icon}
                            </span>
                            <span className="lg:truncate">{tab.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </aside>

              {/* Right Workspace Content Column */}
              <div className="min-w-0 space-y-6">

        {/* TAB 1: OVERVIEW & REAL-TIME KPIS */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="bg-white dark:bg-[#171411] p-6 rounded-2xl border border-[#E6DFD3] dark:border-[#2A241E] shadow-sm">
                <div className="flex items-center justify-between text-xs text-[#6B6258] dark:text-[#AFA699] font-medium">
                  <span>Occupancy Rate</span>
                  <TrendingUp className="w-4 h-4 text-[#96682E] dark:text-[#D4A76A]" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-sans font-semibold tracking-tight text-[#1A1714] dark:text-[#F4EFE6] tabular-nums">
                    {occupancyRate}%
                  </span>
                  <span className="text-xs text-[#8E8477]">
                    ({occupiedRooms} of {totalRoomsCount} rooms)
                  </span>
                </div>
                <div className="mt-3 w-full bg-[#EFE9DF] dark:bg-[#2A241E] h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-[#96682E] dark:bg-[#C69553] h-full rounded-full transition-all"
                    style={{ width: `${occupancyRate}%` }}
                  />
                </div>
              </div>

              <div className="bg-white dark:bg-[#171411] p-6 rounded-2xl border border-[#E6DFD3] dark:border-[#2A241E] shadow-sm">
                <div className="flex items-center justify-between text-xs text-[#6B6258] dark:text-[#AFA699] font-medium">
                  <span>Total Confirmed Revenue</span>
                  <DollarSign className="w-4 h-4 text-[#96682E] dark:text-[#D4A76A]" />
                </div>
                <div className="mt-2 text-3xl font-sans font-semibold tracking-tight text-[#1A1714] dark:text-[#F4EFE6] tabular-nums">
                  {formatCurrency(totalRevenue, currentCurrency)}
                </div>
                <div className="mt-2 text-[11px] text-[#8E8477]">
                  Across {bookings.length} reservations (NPR, USD &amp; INR)
                </div>
              </div>

              <div className="bg-white dark:bg-[#171411] p-6 rounded-2xl border border-[#E6DFD3] dark:border-[#2A241E] shadow-sm">
                <div className="flex items-center justify-between text-xs text-[#6B6258] dark:text-[#AFA699] font-medium">
                  <span>Pending Arrivals / Check-Ins</span>
                  <Clock className="w-4 h-4 text-[#96682E] dark:text-[#D4A76A]" />
                </div>
                <div className="mt-2 text-3xl font-sans font-semibold tracking-tight text-[#1A1714] dark:text-[#F4EFE6] tabular-nums">
                  {todayCheckIns}
                </div>
                <div className="mt-2 text-[11px] text-[#8E8477]">
                  Front Desk ready in Kamalpokhari
                </div>
              </div>

              <div className="bg-white dark:bg-[#171411] p-6 rounded-2xl border border-[#E6DFD3] dark:border-[#2A241E] shadow-sm">
                <div className="flex items-center justify-between text-xs text-[#6B6258] dark:text-[#AFA699] font-medium">
                  <span>Ground-Floor Dining Status</span>
                  <Utensils className="w-4 h-4 text-[#96682E] dark:text-[#D4A76A]" />
                </div>
                <div className="mt-2 text-xl font-serif font-bold text-[#1A1714] dark:text-[#F4EFE6] uppercase">
                  {themeConfig.rooftopDiningStatus.replace('_', ' ')}
                </div>
                <div className="mt-2 text-[11px] text-[#96682E] dark:text-[#D4A76A] font-semibold">
                  {themeConfig.rooftopOpeningDateText}
                </div>
              </div>
            </div>

            {/* Daily Occupancy Rates & Actionable Revenue Management Insights */}
            <OccupancyAnalyticsWidget onNavigateTab={(tab) => setActiveTab(tab)} />

            {/* Monthly Revenue Growth & Booking Earnings Chart */}
            <RevenueTrendsWidget />

            {/* Real-Time Room Occupancy & Maintenance Heatmap */}
            <RoomHeatmapWidget />

            {/* Front Desk Wake-Up Call Queue & Alerts */}
            {(activeRole === 'super_admin' ||
              activeRole === 'admin' ||
              activeRole === 'hotel_manager' ||
              activeRole === 'receptionist') && <WakeUpCallFrontDeskPanel compact />}

            {/* Aggregated Manager Feedback & Post-Checkout Survey Summary */}
            {(activeRole === 'super_admin' ||
              activeRole === 'admin' ||
              activeRole === 'hotel_manager' ||
              activeRole === 'restaurant_owner') && (
              <GuestSurveyFeedbackPanel
                compact
                onOpenFullConsole={() => setActiveTab('surveys')}
              />
            )}

            {/* Room Availability Matrix */}
            <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-lg font-serif font-bold text-stone-900 dark:text-stone-50">
                    Live Room Availability & Status Matrix (Kathmandu)
                  </h3>
                  <p className="text-xs text-stone-500">
                    Real-time status of each room category across floors in Kamalpokhari.
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span>Available</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span>Occupied</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {rooms.map((room) => {
                  const priceInCurrent = convertPrice(room.pricePerNightUSD, currentCurrency, themeConfig.exchangeRates);
                  return (
                    <div
                      key={room.id}
                      className="p-4 rounded-lg bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/80 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-semibold text-xs text-stone-900 dark:text-stone-100">
                            {room.name}
                          </div>
                          <div className="text-[11px] text-stone-400">{room.floor}</div>
                        </div>
                        <span className="text-xs font-mono font-bold text-amber-700 dark:text-amber-400">
                          {formatCurrency(priceInCurrent, currentCurrency)}
                        </span>
                      </div>

                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between text-stone-500">
                          <span>Units Status:</span>
                          <span className="font-semibold text-stone-800 dark:text-stone-200">
                            {room.availableUnits} free / {room.totalUnits} total
                          </span>
                        </div>
                        <div className="w-full bg-stone-200 dark:bg-stone-700 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full transition-all"
                            style={{
                              width: `${(room.availableUnits / room.totalUnits) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB: SUPER ADMIN TENANT ONBOARDING & FRESH SETUP */}
        {activeTab === 'tenant_setup' && (
          <HotelTenantOnboardingWizard />
        )}

        {/* TAB: FRONT DESK & RECEPTION */}
        {activeTab === 'reception' && (
          <ReceptionDesk />
        )}

        {/* TAB: UNIFIED SERVICE REQUESTS QUEUE */}
        {activeTab === 'service_requests' && (
          <ServiceRequestsQueuePanel />
        )}

        {/* TAB: WAITER POS & TABLE TERMINAL */}
        {activeTab === 'waiter_pos' && (
          <WaiterPosView />
        )}

        {/* TAB: KITCHEN DISPLAY SYSTEM (KDS) */}
        {activeTab === 'kitchen_kds' && (
          <KitchenKdsView />
        )}

        {/* TAB: HOUSEKEEPING & TURNAROUND */}
        {activeTab === 'housekeeping' && (
          <HousekeepingManager />
        )}

        {/* TAB: EXPRESS TURNOVER WORKFLOW */}
        {activeTab === 'express_turnover' && (
          <ExpressTurnoverPanel />
        )}

        {/* TAB: LOST & FOUND TRACKER & RECOVERY SLIPS */}
        {activeTab === 'lost_found' && (
          <LostAndFoundTrackerPanel />
        )}

        {/* TAB: VIP GUEST FLAGGING & ARRIVAL ALERTS */}
        {activeTab === 'vip_guests' && (
          <VipGuestFlagPanel />
        )}

        {/* TAB: MAINTENANCE TRACKER & OUT-OF-ORDER AUTO-SYNC */}
        {activeTab === 'maintenance' && (
          <MaintenanceTrackerPanel />
        )}

        {/* TAB: NIGHT AUDIT & DAILY CLOSE */}
        {activeTab === 'night_audit' && (
          <NightAuditManager />
        )}

        {/* TAB: ADMIN CREDENTIALS & BALANCER */}
        {activeTab === 'admin_users' && (
          <AdminUserManager />
        )}

        {/* TAB: ROOMS & FLOORS MANAGER */}
        {activeTab === 'room_floors' && (
          <RoomFloorManager />
        )}

        {/* TAB: OPERATIONAL QA TEST BENCH */}
        {activeTab === 'qa_test_suite' && (
          <OperationalQaTestBench />
        )}

        {/* TAB: RESTAURANT & ROOFTOP DINING */}
        {activeTab === 'restaurant' && (
          <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm space-y-6">
            <RestaurantBillingManager />
          </div>
        )}

        {/* TAB: BILLING, TAX, DISCOUNT, SERVICE CHARGE & TEMPLATES */}
        {activeTab === 'billing' && (
          <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm space-y-6">
            <MasterBillingManager />
          </div>
        )}

        {/* TAB: DYNAMIC INVOICING STUDIO */}
        {activeTab === 'dynamic_invoicing' && (
          <DynamicInvoicingStudio />
        )}

        {/* TAB: STOCK & INVENTORY (LOW STOCK / OUT OF STOCK) */}
        {activeTab === 'inventory' && (
          <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm space-y-6">
            <InventoryStockManager />
          </div>
        )}

        {/* TAB: GUEST ROOM PASSCODES (KEYLESS ACCESS & RESET ON CHECKOUT) */}
        {activeTab === 'passcodes' && (
          <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm space-y-6">
            <GuestPasscodeSessionManager />
          </div>
        )}

        {/* TAB: TIME-BOUND DIGITAL KEYCARD GENERATOR */}
        {activeTab === 'digital_keycards' && (
          <DigitalKeycardGenerator />
        )}

        {/* TAB: COUPONS, VOUCHERS & PROMO CODES */}
        {activeTab === 'coupons' && (
          <CouponManager />
        )}

        {/* TAB: GUEST & STAFF INTERCOM LIVE CHAT */}
        {activeTab === 'intercom' && (
          <StaffGuestIntercom />
        )}

        {/* TAB: HERO, ROOFTOP & ROOM PHOTOS MEDIA CMS */}
        {activeTab === 'media' && (
          <MediaGalleryManager />
        )}

        {/* TAB: ACCOUNTING & P&L (DAILY, WEEKLY, MONTHLY, QUARTERLY, YEARLY) */}
        {activeTab === 'accounting' && (
          <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm space-y-6">
            <AccountingFinancialReports />
          </div>
        )}

        {/* TAB 2: RESERVATIONS */}
        {activeTab === 'bookings' && (
          <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-serif font-bold text-stone-900 dark:text-stone-50">
                  Guest Reservations & Front Desk Desk
                </h3>
                <p className="text-xs text-stone-500">
                  Search, verify guest arrivals in Kamalpokhari, trigger express check-in / check-out.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={bookingSearch}
                    onChange={(e) => setBookingSearch(e.target.value)}
                    placeholder="Search by name, ref, room..."
                    className="pl-8 pr-3 py-1.5 text-xs rounded border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  />
                </div>

                <select
                  value={bookingStatusFilter}
                  onChange={(e) => setBookingStatusFilter(e.target.value)}
                  className="py-1.5 px-3 text-xs rounded border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                >
                  <option value="all">All Statuses</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="checked-in">Checked-In</option>
                  <option value="checked-out">Checked-Out</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-600 dark:text-stone-300">
                <thead className="bg-stone-50 dark:bg-stone-800/80 text-[11px] uppercase tracking-wider text-stone-500 font-mono border-y border-stone-200 dark:border-stone-700">
                  <tr>
                    <th className="py-3 px-4">Booking Code</th>
                    <th className="py-3 px-4">Guest</th>
                    <th className="py-3 px-4">Room & Dates</th>
                    <th className="py-3 px-4">Physical Room #</th>
                    <th className="py-3 px-4">Settlement</th>
                    <th className="py-3 px-4">Payment</th>
                    <th className="py-3 px-4">Kamal Rewards</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                  {filteredBookings.map((b) => {
                    const loyaltyAccount = getGuestLoyaltyAccount(b.guestEmail, b.guestName, b.bookingCode);
                    const matchedVip = findVipProfile(b.guestEmail, b.guestName, b.guestPhone);
                    return (
                    <tr key={b.id} className="hover:bg-stone-50/60 dark:hover:bg-stone-800/40">
                      <td className="py-3 px-4 font-mono font-semibold text-amber-700 dark:text-amber-400">
                        {b.bookingCode}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-semibold text-stone-900 dark:text-stone-100">{b.guestName}</span>
                          {matchedVip && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                              · <Crown className="w-3 h-3" /> VIP
                            </span>
                          )}
                          {b.emailVerified && (
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-mono font-semibold"
                              title={b.verifiedAt ? `Verified at ${b.verifiedAt}` : 'Email verified via 6-digit OTP'}
                            >
                              <ShieldCheck className="w-3 h-3" />
                              Verified
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-stone-400">{b.guestEmail} · {b.guestPhone}</div>
                        {!matchedVip && (
                          <button
                            type="button"
                            onClick={() =>
                              flagVipGuest({
                                guestName: b.guestName,
                                guestEmail: b.guestEmail,
                                guestPhone: b.guestPhone,
                                tier: b.totalAmount >= 300 ? 'high_value' : 'returning_vip',
                                staysCount: 2,
                                lifetimeSpendUSD: Math.round(b.totalAmount),
                                preferences: b.specialRequests || 'Priority check-in & welcome amenities.',
                                alertMessage: `VIP Arrival Alert for ${b.guestName} (${b.bookingCode}) — Notify reception & housekeeping.`,
                              })
                            }
                            className="mt-1 text-[10px] font-semibold text-amber-700 dark:text-amber-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Crown className="w-3 h-3" />
                            Flag VIP
                          </button>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-stone-800 dark:text-stone-200 font-medium">{b.roomName}</div>
                        <div className="text-[11px] text-stone-400">
                          {b.checkInDate} to {b.checkOutDate} ({b.nights}n)
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {b.assignedRoomNumber ? (
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-xs bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-800">
                                Room {b.assignedRoomNumber}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setAssigningBooking(b);
                                  setSelectedRoomNumber(b.assignedRoomNumber || '');
                                }}
                                className="text-[10px] text-stone-500 hover:text-amber-700 dark:hover:text-amber-400 underline font-medium"
                              >
                                Change
                              </button>
                            </div>
                            <div className="text-[10px] text-stone-400 mt-0.5">
                              {b.assignedFloor || 'Main Building'}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <button
                              type="button"
                              onClick={() => {
                                setAssigningBooking(b);
                                setSelectedRoomNumber('');
                              }}
                              className="px-2.5 py-1 text-[11px] font-bold bg-amber-600 hover:bg-amber-700 text-white rounded shadow-sm flex items-center gap-1"
                            >
                              <Key className="w-3 h-3" />
                              <span>Assign Room #</span>
                            </button>
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 block mt-0.5 font-medium">
                              Required for Check-In
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-sans font-semibold tracking-tight text-stone-900 dark:text-stone-100 tabular-nums">
                        {formatCurrency(b.totalAmount, b.currency)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] uppercase font-mono font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                          {b.paymentStatus} ({b.paymentMethod})
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            <Award className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                            <span className="font-mono font-bold text-stone-900 dark:text-stone-100 tabular-nums">
                              {(loyaltyAccount?.pointsBalance ?? 0).toLocaleString()} pts
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-stone-500 dark:text-stone-400 whitespace-nowrap">
                              {loyaltyAccount?.tier ?? 'Not Enrolled'}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setAdjustingLoyaltyBooking(b);
                                setLoyaltyAdjMode('credit');
                                setLoyaltyPointsAmount('250');
                                setLoyaltyReason('Front Desk Courtesy Bonus');
                              }}
                              className="px-2 py-0.5 rounded border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 text-[10px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              Adjust Pts
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            b.bookingStatus === 'checked-in'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : b.bookingStatus === 'confirmed'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-stone-200 text-stone-700'
                          }`}
                        >
                          {b.bookingStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          {b.bookingStatus === 'confirmed' && (
                            <button
                              type="button"
                              onClick={() => {
                                if (!b.assignedRoomNumber) {
                                  showToast('Assign Room First', `Please assign a physical room number for ${b.guestName} before check-in.`, 'warning');
                                  setAssigningBooking(b);
                                  setSelectedRoomNumber('');
                                  return;
                                }
                                updateBookingStatus(b.id, 'checked-in');
                              }}
                              className="px-2.5 py-1 text-[11px] font-medium bg-emerald-600 text-white hover:bg-emerald-700 rounded transition-colors cursor-pointer"
                            >
                              Check-In
                            </button>
                          )}
                          {b.bookingStatus === 'checked-in' && (
                            <button
                              type="button"
                              onClick={() => updateBookingStatus(b.id, 'checked-out')}
                              className="px-2.5 py-1 text-[11px] font-medium bg-stone-700 text-white hover:bg-stone-800 rounded transition-colors cursor-pointer"
                            >
                              Check-Out
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={resendingBookingId === b.id}
                            onClick={async () => {
                              setResendingBookingId(b.id);
                              await resendBookingConfirmationEmail(b);
                              setResendingBookingId(null);
                            }}
                            className="p-1.5 rounded border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer disabled:opacity-50"
                            title={b.emailSent ? 'Resend Confirmation Email' : 'Send Confirmation Email'}
                          >
                            <Mail className="w-3.5 h-3.5 text-amber-600" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const scAmount = Math.round(b.subtotal * 0.1 * 100) / 100;
                              downloadBookingVoucherPdf({
                                bookingCode: b.bookingCode,
                                guestName: b.guestName,
                                guestEmail: b.guestEmail,
                                guestPhone: b.guestPhone,
                                guestCountry: b.guestCountry,
                                roomName: b.roomName,
                                assignedRoomNumber: b.assignedRoomNumber,
                                checkInDate: b.checkInDate,
                                checkOutDate: b.checkOutDate,
                                checkInTime: themeConfig.checkInTime,
                                checkOutTime: themeConfig.checkOutTime,
                                nights: b.nights,
                                adults: b.adults,
                                children: b.children,
                                paymentMethod: b.paymentMethod,
                                paymentStatus: b.paymentStatus,
                                currency: b.currency,
                                roomSubtotalFormatted: formatCurrency(b.subtotal, b.currency),
                                addons: (b.addons || []).map((a) => ({
                                  name: a.name,
                                  priceFormatted: formatCurrency(
                                    convertPrice(a.priceUSD, b.currency, themeConfig.exchangeRates),
                                    b.currency
                                  ),
                                })),
                                serviceChargeFormatted: formatCurrency(scAmount, b.currency),
                                taxFormatted: formatCurrency(b.taxAmount, b.currency),
                                totalAmountFormatted: formatCurrency(b.totalAmount, b.currency),
                                specialRequests: b.specialRequests,
                                hotelName: themeConfig.hotelName,
                                hotelAddress: themeConfig.address,
                                hotelPhone: themeConfig.contactPhone,
                                hotelEmail: themeConfig.contactEmail,
                                panVatNumber: billSettings.panVatNumber,
                              });
                            }}
                            className="p-1.5 rounded border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                            title="Download PDF Booking Voucher"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const inv =
                                invoices.find((i) => i.bookingCode === b.bookingCode) ||
                                generateInvoiceForBooking(b.id);
                              if (inv) setSelectedBookingInvoice(inv);
                            }}
                            className="p-1.5 rounded border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                            title="Print / Download Tax Invoice"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          {b.bookingStatus !== 'cancelled' && (
                            <button
                              type="button"
                              onClick={() => updateBookingStatus(b.id, 'cancelled')}
                              className="p-1 text-stone-400 hover:text-rose-600 rounded cursor-pointer"
                              title="Cancel Booking"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: INVENTORY & ROOM CRUD */}
        {activeTab === 'rooms' && (
          <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-serif font-bold text-stone-900 dark:text-stone-50">
                  Room Inventory & Rate Manager
                </h3>
                <p className="text-xs text-stone-500">
                  Dynamically add new rooms, modify base USD prices, picture URLs, available units, or update specifications.
                </p>
              </div>

              {hasPermission('manage_rooms') && (
                <button
                  onClick={() => {
                    setEditingRoom(null);
                    setIsAddRoomOpen(true);
                  }}
                  className={`px-4 py-2 text-xs font-semibold rounded flex items-center gap-1.5 ${themeClasses.primary}`}
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Room Type</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {rooms.map((room) => {
                const priceInNPR = convertPrice(room.pricePerNightUSD, 'NPR', themeConfig.exchangeRates);
                const priceInINR = convertPrice(room.pricePerNightUSD, 'INR', themeConfig.exchangeRates);

                return (
                  <div
                    key={room.id}
                    className="border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden flex flex-col justify-between"
                  >
                    <div className="flex gap-4 p-4">
                      <img
                        src={room.images[0]}
                        alt={room.name}
                        className="w-24 h-24 rounded-lg object-cover shrink-0"
                      />
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-semibold uppercase text-amber-700 dark:text-amber-400">
                            {room.type}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setEditingRoom(room);
                                setIsAddRoomOpen(true);
                              }}
                              className="p-1 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100"
                              title="Edit Room"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deleteRoom(room.id)}
                              className="p-1 text-stone-400 hover:text-rose-600"
                              title="Delete Room"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <h4 className="font-serif font-bold text-stone-900 dark:text-stone-100 text-sm">
                          {room.name}
                        </h4>
                        <div className="text-xs text-stone-500">
                          {room.bedType} · {room.sizeSqFt} sq.ft · {room.view}
                        </div>

                        <div className="pt-2 flex items-center justify-between">
                          <div className="text-xs font-bold text-stone-900 dark:text-stone-100 font-mono">
                            ${room.pricePerNightUSD} USD · रू {priceInNPR.toLocaleString()} NPR · ₹ {priceInINR.toLocaleString()} INR
                          </div>
                          <div className="text-xs font-mono text-stone-500">
                            Units: {room.availableUnits} / {room.totalUnits}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-stone-50 dark:bg-stone-800/50 px-4 py-2 text-[11px] text-stone-500 flex justify-between border-t border-stone-100 dark:border-stone-800">
                      <span>Floor: {room.floor}</span>
                      <span>Amenities: {room.amenities.length} items</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add / Edit Room Modal */}
            {isAddRoomOpen && (
              <div 
                className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-sm flex items-center justify-center p-4"
                onClick={() => { setIsAddRoomOpen(false); setEditingRoom(null); }}
              >
                <div 
                  className="bg-white dark:bg-stone-900 rounded-xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden border border-stone-200 dark:border-stone-800 shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-between items-center gap-2 px-5 py-3.5 border-b border-stone-200 dark:border-stone-800 shrink-0">
                    <h4 className="font-serif font-bold text-base text-stone-900 dark:text-stone-50">
                      {editingRoom ? 'Edit Room Specifications' : 'Add New Room Specification'}
                    </h4>
                    <ModalDismissButton onClose={() => { setIsAddRoomOpen(false); setEditingRoom(null); }} ariaLabel="Close Room Specifications" />
                  </div>

                  <form onSubmit={handleSaveRoom} className="p-5 space-y-3.5 text-xs overflow-y-auto flex-1">
                    <div>
                      <label className="block font-semibold mb-1">Room Name</label>
                      <input
                        name="name"
                        defaultValue={editingRoom?.name || ''}
                        required
                        className="w-full bg-stone-50 dark:bg-stone-800 border rounded p-2 text-stone-900 dark:text-stone-100"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold mb-1">Category Type</label>
                        <select
                          name="type"
                          defaultValue={editingRoom?.type || 'deluxe'}
                          className="w-full bg-stone-50 dark:bg-stone-800 border rounded p-2 text-stone-900 dark:text-stone-100"
                        >
                          <option value="deluxe">Deluxe</option>
                          <option value="super-deluxe">Super Deluxe</option>
                          <option value="executive-suite">Executive Suite</option>
                          <option value="standard-cozy">Standard Cozy</option>
                        </select>
                      </div>
                      <div>
                        <label className="block font-semibold mb-1">Base Price in USD ($)</label>
                        <input
                          type="number"
                          name="pricePerNightUSD"
                          defaultValue={editingRoom?.pricePerNightUSD || 60}
                          required
                          className="w-full bg-stone-50 dark:bg-stone-800 border rounded p-2 text-stone-900 dark:text-stone-100"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block font-semibold mb-1">Max Guests</label>
                        <input
                          type="number"
                          name="maxGuests"
                          defaultValue={editingRoom?.maxGuests || 2}
                          className="w-full bg-stone-50 dark:bg-stone-800 border rounded p-2 text-stone-900 dark:text-stone-100"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold mb-1">Total Units</label>
                        <input
                          type="number"
                          name="totalUnits"
                          defaultValue={editingRoom?.totalUnits || 8}
                          className="w-full bg-stone-50 dark:bg-stone-800 border rounded p-2 text-stone-900 dark:text-stone-100"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold mb-1">Available Units</label>
                        <input
                          type="number"
                          name="availableUnits"
                          defaultValue={editingRoom?.availableUnits || 6}
                          className="w-full bg-stone-50 dark:bg-stone-800 border rounded p-2 text-stone-900 dark:text-stone-100"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold mb-1">Bed Configuration</label>
                        <input
                          name="bedType"
                          defaultValue={editingRoom?.bedType || '1 King Bed'}
                          className="w-full bg-stone-50 dark:bg-stone-800 border rounded p-2 text-stone-900 dark:text-stone-100"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold mb-1">Area (sq.ft)</label>
                        <input
                          type="number"
                          name="sizeSqFt"
                          defaultValue={editingRoom?.sizeSqFt || 320}
                          className="w-full bg-stone-50 dark:bg-stone-800 border rounded p-2 text-stone-900 dark:text-stone-100"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">Main Picture URL</label>
                      <input
                        name="image"
                        defaultValue={editingRoom?.images[0] || './assets/images/room_deluxe_suite_1793848735141.jpg'}
                        className="w-full bg-stone-50 dark:bg-stone-800 border rounded p-2 text-stone-900 dark:text-stone-100"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">Description</label>
                      <textarea
                        name="description"
                        rows={2}
                        defaultValue={editingRoom?.description || 'Authentic boutique hotel comfort in Kamalpokhari with hand-carved Nepali wood accents.'}
                        className="w-full bg-stone-50 dark:bg-stone-800 border rounded p-2 text-stone-900 dark:text-stone-100"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">Key Amenities (comma separated)</label>
                      <input
                        name="amenities"
                        defaultValue={editingRoom?.amenities.join(', ') || 'High-Speed Wi-Fi, Hot Shower, City Map, Solar Hot Water'}
                        className="w-full bg-stone-50 dark:bg-stone-800 border rounded p-2 text-stone-900 dark:text-stone-100"
                      />
                    </div>

                    <div className="flex justify-end gap-2.5 pt-3 border-t border-stone-200 dark:border-stone-800">
                      <button
                        type="button"
                        onClick={() => { setIsAddRoomOpen(false); setEditingRoom(null); }}
                        className="px-4 py-2 rounded border text-stone-600 dark:text-stone-300 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className={`px-5 py-2 rounded font-semibold cursor-pointer ${themeClasses.primary}`}
                      >
                        {editingRoom ? 'Update Room' : 'Save Room'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: END-TO-END CMS PAGE, HERO CTA STUDIO, LOCATION, DINING & RATES EDITOR */}
        {activeTab === 'cms' && (
          <div className="space-y-6">
            <CmsManagerPanel
              onNavigateTab={(tab) => setActiveTab(tab)}
              onPreviewGuestSite={onPreviewGuestSite}
              onAddAmenity={() => {
                setEditingAmenity(null);
                setIsAddAmenityOpen(true);
              }}
              onEditAmenity={(amenity) => {
                setEditingAmenity(amenity);
                setIsAddAmenityOpen(true);
              }}
              onAddReview={() => {
                setEditingReview(null);
                setIsAddReviewOpen(true);
              }}
              onEditReview={(rev) => {
                setEditingReview(rev);
                setIsAddReviewOpen(true);
              }}
              onAddFaq={() => {
                setEditingFaq(null);
                setIsAddFaqOpen(true);
              }}
              onEditFaq={(faq) => {
                setEditingFaq(faq);
                setIsAddFaqOpen(true);
              }}
            />

            {/* Modal to Add / Edit Amenity */}
            {isAddAmenityOpen && (
              <div
                className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-sm flex items-center justify-center p-4"
                onClick={() => { setIsAddAmenityOpen(false); setEditingAmenity(null); }}
              >
                <div
                  className="bg-white dark:bg-stone-900 rounded-xl max-w-md w-full max-h-[85vh] flex flex-col overflow-hidden border border-stone-200 dark:border-stone-700 text-xs shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between gap-2 px-5 py-3.5 border-b border-stone-200 dark:border-stone-800 shrink-0">
                    <h4 className="text-base font-bold font-serif text-stone-900 dark:text-stone-50">
                      {editingAmenity ? 'Edit Hotel Amenity' : 'Add Hotel Amenity'}
                    </h4>
                    <ModalDismissButton onClose={() => { setIsAddAmenityOpen(false); setEditingAmenity(null); }} ariaLabel="Close Amenity Modal" />
                  </div>
                  <form
                    key={editingAmenity?.id || 'new-amenity'}
                    onSubmit={(e) => {
                      e.preventDefault();
                      const fd = new FormData(e.currentTarget);
                      const payload = {
                        name: fd.get('name') as string,
                        category: fd.get('category') as AmenityItem['category'],
                        description: fd.get('description') as string,
                        iconName: (fd.get('iconName') as string) || 'Sparkles',
                        isHighlight: fd.get('isHighlight') === 'on',
                      };
                      if (editingAmenity) {
                        updateAmenity(editingAmenity.id, payload);
                      } else {
                        addAmenity(payload);
                      }
                      setEditingAmenity(null);
                      setIsAddAmenityOpen(false);
                    }}
                    className="p-5 space-y-3 overflow-y-auto flex-1"
                  >
                    <div>
                      <label className="block font-semibold mb-1">Amenity Title</label>
                      <input name="name" defaultValue={editingAmenity?.name || ''} required className="w-full bg-stone-50 dark:bg-stone-800 border rounded p-2" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold mb-1">Category</label>
                        <select name="category" defaultValue={editingAmenity?.category || 'Services'} className="w-full bg-stone-50 dark:bg-stone-800 border rounded p-2">
                          <option value="Dining">Dining</option>
                          <option value="Wellness">Wellness</option>
                          <option value="Connectivity">Connectivity</option>
                          <option value="Services">Services</option>
                          <option value="Convenience">Convenience</option>
                        </select>
                      </div>
                      <div>
                        <label className="block font-semibold mb-1">Icon Key</label>
                        <select name="iconName" defaultValue={editingAmenity?.iconName || 'Sparkles'} className="w-full bg-stone-50 dark:bg-stone-800 border rounded p-2">
                          <option value="Utensils">Dining (Utensils)</option>
                          <option value="Wifi">Wi-Fi</option>
                          <option value="Plane">Airport Transfer</option>
                          <option value="Car">Parking</option>
                          <option value="Sun">Solar / Mountain</option>
                          <option value="Sparkles">Boutique Service</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Description</label>
                      <textarea name="description" rows={3} defaultValue={editingAmenity?.description || ''} required className="w-full bg-stone-50 dark:bg-stone-800 border rounded p-2" />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer font-semibold">
                      <input type="checkbox" name="isHighlight" defaultChecked={editingAmenity?.isHighlight ?? true} className="w-4 h-4 accent-amber-600" />
                      <span>Feature as Highlight Amenity</span>
                    </label>
                    <div className="flex justify-end gap-2 pt-2 border-t border-stone-200 dark:border-stone-800">
                      <button type="button" onClick={() => { setIsAddAmenityOpen(false); setEditingAmenity(null); }} className="px-3 py-1.5 border rounded cursor-pointer">
                        Cancel
                      </button>
                      <button type="submit" className={`px-4 py-1.5 rounded font-semibold cursor-pointer ${themeClasses.primary}`}>
                        {editingAmenity ? 'Update Amenity' : 'Save Amenity'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Modal to Add / Edit Review */}
            {isAddReviewOpen && (
              <div 
                className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-sm flex items-center justify-center p-4"
                onClick={() => { setIsAddReviewOpen(false); setEditingReview(null); }}
              >
                <div 
                  className="bg-white dark:bg-stone-900 rounded-xl max-w-md w-full max-h-[85vh] flex flex-col overflow-hidden border border-stone-200 dark:border-stone-700 text-xs shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between gap-2 px-5 py-3.5 border-b border-stone-200 dark:border-stone-800 shrink-0">
                    <h4 className="text-base font-bold font-serif text-stone-900 dark:text-stone-50">
                      {editingReview ? 'Edit Guest Review' : 'Add Guest Review'}
                    </h4>
                    <ModalDismissButton onClose={() => { setIsAddReviewOpen(false); setEditingReview(null); }} ariaLabel="Close Review Modal" />
                  </div>
                  <form
                    key={editingReview?.id || 'new-review'}
                    onSubmit={(e) => {
                      e.preventDefault();
                      const fd = new FormData(e.currentTarget);
                      const payload = {
                        author: fd.get('author') as string,
                        role: (fd.get('role') as string) || 'Verified Guest',
                        location: fd.get('location') as string,
                        quote: fd.get('quote') as string,
                        rating: Number(fd.get('rating')),
                        isApproved: true,
                      };
                      if (editingReview) {
                        updateReview(editingReview.id, payload);
                      } else {
                        addReview(payload);
                      }
                      setEditingReview(null);
                      setIsAddReviewOpen(false);
                    }}
                    className="p-5 space-y-3 overflow-y-auto flex-1"
                  >
                    <div>
                      <label className="block font-semibold mb-1">Guest Name</label>
                      <input name="author" defaultValue={editingReview?.author || ''} required className="w-full bg-stone-50 dark:bg-stone-800 border rounded p-2" />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Traveler Type / Role</label>
                      <input name="role" defaultValue={editingReview?.role || 'Verified Guest'} className="w-full bg-stone-50 dark:bg-stone-800 border rounded p-2" />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">City / Country</label>
                      <input name="location" defaultValue={editingReview?.location || 'Kathmandu, Nepal'} className="w-full bg-stone-50 dark:bg-stone-800 border rounded p-2" />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Review Quote</label>
                      <textarea name="quote" rows={3} defaultValue={editingReview?.quote || ''} required className="w-full bg-stone-50 dark:bg-stone-800 border rounded p-2" />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Rating (1 to 5)</label>
                      <select name="rating" defaultValue={editingReview?.rating ?? 5} className="w-full bg-stone-50 dark:bg-stone-800 border rounded p-2">
                        <option value={5}>5 Stars</option>
                        <option value={4}>4 Stars</option>
                        <option value={3}>3 Stars</option>
                      </select>
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t border-stone-200 dark:border-stone-800">
                      <button type="button" onClick={() => { setIsAddReviewOpen(false); setEditingReview(null); }} className="px-3 py-1.5 border rounded cursor-pointer">
                        Cancel
                      </button>
                      <button type="submit" className={`px-4 py-1.5 rounded font-semibold cursor-pointer ${themeClasses.primary}`}>
                        {editingReview ? 'Update Review' : 'Save Review'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Modal to Add / Edit FAQ */}
            {isAddFaqOpen && (
              <div 
                className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-sm flex items-center justify-center p-4"
                onClick={() => { setIsAddFaqOpen(false); setEditingFaq(null); }}
              >
                <div 
                  className="bg-white dark:bg-stone-900 rounded-xl max-w-md w-full max-h-[85vh] flex flex-col overflow-hidden border border-stone-200 dark:border-stone-700 text-xs shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between gap-2 px-5 py-3.5 border-b border-stone-200 dark:border-stone-800 shrink-0">
                    <h4 className="text-base font-bold font-serif text-stone-900 dark:text-stone-50">
                      {editingFaq ? 'Edit FAQ' : 'Add FAQ'}
                    </h4>
                    <ModalDismissButton onClose={() => { setIsAddFaqOpen(false); setEditingFaq(null); }} ariaLabel="Close FAQ Modal" />
                  </div>
                  <form
                    key={editingFaq?.id || 'new-faq'}
                    onSubmit={(e) => {
                      e.preventDefault();
                      const fd = new FormData(e.currentTarget);
                      const payload = {
                        question: fd.get('question') as string,
                        answer: fd.get('answer') as string,
                        category: (fd.get('category') as string) || 'General',
                      };
                      if (editingFaq) {
                        updateFaq(editingFaq.id, payload);
                      } else {
                        addFaq(payload);
                      }
                      setEditingFaq(null);
                      setIsAddFaqOpen(false);
                    }}
                    className="p-5 space-y-3 overflow-y-auto flex-1"
                  >
                    <div>
                      <label className="block font-semibold mb-1">Question</label>
                      <input name="question" defaultValue={editingFaq?.question || ''} placeholder="e.g. Can we arrange early airport pickup?" required className="w-full bg-stone-50 dark:bg-stone-800 border rounded p-2" />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Answer</label>
                      <textarea name="answer" rows={3} defaultValue={editingFaq?.answer || ''} placeholder="e.g. Yes! Contact our front desk 24 hours prior..." required className="w-full bg-stone-50 dark:bg-stone-800 border rounded p-2" />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Category</label>
                      <select name="category" defaultValue={editingFaq?.category || 'Services'} className="w-full bg-stone-50 dark:bg-stone-800 border rounded p-2">
                        <option value="Services">Services</option>
                        <option value="Booking">Booking</option>
                        <option value="Location">Location</option>
                        <option value="Dining">Dining</option>
                      </select>
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t border-stone-200 dark:border-stone-800">
                      <button type="button" onClick={() => { setIsAddFaqOpen(false); setEditingFaq(null); }} className="px-3 py-1.5 border rounded cursor-pointer">
                        Cancel
                      </button>
                      <button type="submit" className={`px-4 py-1.5 rounded font-semibold cursor-pointer ${themeClasses.primary}`}>
                        {editingFaq ? 'Update FAQ' : 'Save FAQ'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: SUPABASE BACKEND & DATABASE INTEGRATION */}
        {activeTab === 'supabase' && (
          <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-mono font-bold uppercase text-emerald-700 dark:text-emerald-400">
                  Cloud Backend & Real-Time Sync
                </span>
                <h3 className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-50">
                  Supabase PostgreSQL & Auth Integration
                </h3>
                <p className="text-xs text-stone-500 mt-1">
                  Connect your Supabase project to enable cloud database storage, real-time sync, and user auth.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-mono font-semibold flex items-center gap-1.5 ${
                    themeConfig.supabaseConnected
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${themeConfig.supabaseConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  {themeConfig.supabaseConnected ? 'Supabase Connected' : 'Local Fallback Storage'}
                </span>
              </div>
            </div>

            {/* What you need from Supabase Guide */}
            <div className="p-5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 space-y-4 text-xs">
              <h4 className="font-serif font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-600" />
                <span>What We Need From Your Supabase Project</span>
              </h4>
              <p className="text-stone-600 dark:text-stone-300 leading-relaxed">
                To connect real database persistence and authentication, you only need 2 values from your free Supabase project at <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-amber-700 dark:text-amber-400 underline">supabase.com</a>:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-white dark:bg-stone-900 rounded-lg border border-stone-200 dark:border-stone-700">
                  <div className="font-semibold text-stone-900 dark:text-stone-100">1. Project URL (`SUPABASE_URL`)</div>
                  <div className="text-[11px] text-stone-500 mt-1 font-mono">
                    Found in: Project Settings &rarr; API &rarr; Project URL
                  </div>
                  <div className="text-[11px] text-stone-400 mt-0.5">Example: `https://xyzabcdefg.supabase.co`</div>
                </div>

                <div className="p-3 bg-white dark:bg-stone-900 rounded-lg border border-stone-200 dark:border-stone-700">
                  <div className="font-semibold text-stone-900 dark:text-stone-100">2. Anon Public API Key (`SUPABASE_ANON_KEY`)</div>
                  <div className="text-[11px] text-stone-500 mt-1 font-mono">
                    Found in: Project Settings &rarr; API &rarr; Project API keys (`anon` / `public`)
                  </div>
                  <div className="text-[11px] text-stone-400 mt-0.5">Example: `eyJhbGciOiJIUzI1NiIsInR5cCI6...`</div>
                </div>
              </div>
            </div>

            {/* Connection Credentials Form */}
            <form onSubmit={handleConnectSupabase} className="p-5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 space-y-4 text-xs">
              <h4 className="font-serif font-bold text-sm text-stone-900 dark:text-stone-100">
                Connect Your Supabase Project
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1">Supabase Project URL</label>
                  <input
                    type="url"
                    placeholder="https://your-project.supabase.co"
                    value={inputSupabaseUrl}
                    onChange={(e) => setInputSupabaseUrl(e.target.value)}
                    required
                    className="w-full bg-stone-50 dark:bg-stone-800 border rounded p-2 font-mono text-stone-900 dark:text-stone-100"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Supabase Anon Public API Key</label>
                  <input
                    type="text"
                    placeholder="eyJhbGciOiJIUzI1Ni..."
                    value={inputSupabaseKey}
                    onChange={(e) => setInputSupabaseKey(e.target.value)}
                    required
                    className="w-full bg-stone-50 dark:bg-stone-800 border rounded p-2 font-mono text-stone-900 dark:text-stone-100"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-stone-500">
                  Stored securely in client configuration with automatic reconnect.
                </span>

                <div className="flex items-center gap-2">
                  {themeConfig.supabaseConnected && (
                    <button
                      type="button"
                      onClick={() => syncWithSupabase()}
                      className="px-4 py-2 text-xs font-semibold rounded bg-stone-800 text-white hover:bg-stone-700 transition-colors"
                    >
                      Sync All Data to Supabase
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={isConnectingSupabase}
                    className={`px-5 py-2 text-xs font-semibold rounded ${themeClasses.primary}`}
                  >
                    {isConnectingSupabase ? 'Verifying...' : 'Test & Connect Supabase'}
                  </button>
                </div>
              </div>
            </form>

            {/* 1-Click Copy PostgreSQL Schema */}
            <div className="p-5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-serif font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-600" />
                    <span>Complete Supabase SQL Migration Schema</span>
                  </h4>
                  <p className="text-stone-500 text-[11px] mt-0.5">
                    Click copy and paste this into your Supabase Dashboard &rarr; SQL Editor to generate all tables with RLS policies.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCopySchema}
                  className="px-3.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 font-semibold text-xs flex items-center gap-1.5 transition-colors"
                >
                  {copiedSchema ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSchema ? 'Copied to Clipboard!' : 'Copy SQL Schema'}</span>
                </button>
              </div>

              <div className="max-h-56 overflow-y-auto bg-stone-900 text-stone-200 p-4 rounded-lg font-mono text-[11px] leading-relaxed border border-stone-800">
                <pre>{SUPABASE_SQL_SCHEMA}</pre>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: STAFF & RBAC */}
        {activeTab === 'staff' && (
          <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-mono font-bold uppercase text-amber-700 dark:text-amber-400">
                  Access Management & Security
                </span>
                <h3 className="text-xl font-serif font-bold text-stone-900 dark:text-stone-50">
                  Staff Roster & Role-Based Permissions (RBAC)
                </h3>
                <p className="text-xs text-stone-500">
                  Super admin can assign, edit, and manage all 8 operational roles across hotel and restaurant teams.
                </p>
              </div>

              {hasPermission('manage_staff') && (
                <button
                  onClick={() => setIsAddStaffOpen(true)}
                  className={`px-4 py-2 text-xs font-semibold rounded flex items-center gap-1.5 ${themeClasses.primary}`}
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Staff Member</span>
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-600 dark:text-stone-300">
                <thead className="bg-stone-50 dark:bg-stone-800/80 text-[11px] uppercase tracking-wider text-stone-500 font-mono border-y border-stone-200 dark:border-stone-700">
                  <tr>
                    <th className="py-3 px-4">Member & Username</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Granular Permissions</th>
                    <th className="py-3 px-4">Credentials</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                  {staff.map((member) => (
                    <tr key={member.id} className="hover:bg-stone-50/60 dark:hover:bg-stone-800/40">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-stone-900 dark:text-stone-100">{member.name}</div>
                        <div className="text-[11px] font-mono text-amber-700 dark:text-amber-400">
                          Username: <span className="font-bold">@{member.username}</span>
                        </div>
                        <div className="text-[11px] text-stone-400">{member.email} · {member.phone}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase ${
                            member.role === 'super_admin'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : member.role === 'admin'
                              ? 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300'
                              : member.role === 'hotel_manager'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : member.role === 'restaurant_owner'
                              ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                              : member.role === 'chef'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : member.role === 'waiter'
                              ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                              : member.role === 'receptionist'
                              ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                              : 'bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-300'
                          }`}
                        >
                          {member.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-stone-700 dark:text-stone-300">{member.department}</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {member.permissions.map((p, i) => (
                            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 font-mono text-stone-600 dark:text-stone-400">
                              {p}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-stone-500">
                          <span>••••••••</span>
                          {hasPermission('manage_staff') && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedStaffForPassword(member);
                                setNewPasswordInput('');
                              }}
                              className="px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-[10px] font-sans hover:bg-amber-100 dark:hover:bg-amber-950 text-amber-700 dark:text-amber-400 transition-colors cursor-pointer"
                              title="Change Password"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          ● {member.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {hasPermission('manage_staff') && (
                            <button
                              type="button"
                              onClick={() => setEditingStaffMember(member)}
                              className="p-1 text-stone-400 hover:text-amber-600 rounded cursor-pointer"
                              title="Edit Staff Details & Role"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {member.role !== 'super_admin' && hasPermission('manage_staff') && (
                            <button
                              type="button"
                              onClick={() => deleteStaff(member.id)}
                              className="p-1 text-stone-400 hover:text-rose-600 rounded cursor-pointer"
                              title="Remove Member"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Edit Staff Member Modal */}
            {editingStaffMember && (
              <div
                className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-sm flex items-center justify-center p-4"
                onClick={() => setEditingStaffMember(null)}
              >
                <div
                  className="bg-white dark:bg-stone-900 rounded-xl max-w-md w-full max-h-[85vh] flex flex-col overflow-hidden border border-stone-200 dark:border-stone-800 shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-between items-center gap-2 px-5 py-3.5 border-b border-stone-200 dark:border-stone-800 shrink-0">
                    <div>
                      <h4 className="font-serif font-bold text-base text-stone-900 dark:text-stone-50">
                        Edit Staff Member (@{editingStaffMember.username})
                      </h4>
                      <p className="text-[11px] text-stone-500">Update identity, operational role &amp; permissions.</p>
                    </div>
                    <ModalDismissButton onClose={() => setEditingStaffMember(null)} ariaLabel="Close Edit Staff Modal" />
                  </div>

                  <form
                    key={editingStaffMember.id}
                    onSubmit={(e) => {
                      e.preventDefault();
                      const fd = new FormData(e.currentTarget);
                      const nextRole = fd.get('role') as StaffRole;
                      const nextName = (fd.get('name') as string).trim();
                      const nextUsername = (fd.get('username') as string).trim().toLowerCase();
                      const nextDepartment = (fd.get('department') as string).trim();
                      const nextStatus = fd.get('status') as 'active' | 'on-leave' | 'inactive';
                      updateStaffCredentials(editingStaffMember.id, {
                        name: nextName,
                        username: nextUsername,
                        role: nextRole,
                        department: nextDepartment,
                        status: nextStatus,
                      });
                      updateStaffRoleAndPermissions(
                        editingStaffMember.id,
                        nextRole,
                        getDefaultPermissionsForRole(nextRole)
                      );
                      setEditingStaffMember(null);
                    }}
                    className="p-5 space-y-3.5 text-xs overflow-y-auto flex-1"
                  >
                    <div>
                      <label className="block font-semibold mb-1">Full Name</label>
                      <input name="name" defaultValue={editingStaffMember.name} required className="w-full bg-stone-50 dark:bg-stone-800 border rounded p-2" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold mb-1">Username</label>
                        <input name="username" defaultValue={editingStaffMember.username} required className="w-full bg-stone-50 dark:bg-stone-800 border rounded p-2 font-mono" />
                      </div>
                      <div>
                        <label className="block font-semibold mb-1">Status</label>
                        <select name="status" defaultValue={editingStaffMember.status} className="w-full bg-stone-50 dark:bg-stone-800 border rounded p-2">
                          <option value="active">Active</option>
                          <option value="on-leave">On Leave</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Operational Role</label>
                      <select name="role" defaultValue={editingStaffMember.role} className="w-full bg-stone-50 dark:bg-stone-800 border rounded p-2">
                        <option value="super_admin">Super Admin (Full Ownership &amp; CMS)</option>
                        <option value="admin">Hotel Admin (Operations &amp; CMS)</option>
                        <option value="hotel_manager">Hotel Manager (Operations &amp; Rates)</option>
                        <option value="restaurant_owner">Restaurant Owner (F&amp;B &amp; POS)</option>
                        <option value="receptionist">Receptionist / Front Desk Clerk</option>
                        <option value="chef">Head Chef (Kitchen &amp; Dining)</option>
                        <option value="waiter">Waiter / Restaurant Service Lead</option>
                        <option value="housekeeping">Housekeeping &amp; Room Inspector</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Department</label>
                      <input name="department" defaultValue={editingStaffMember.department} required className="w-full bg-stone-50 dark:bg-stone-800 border rounded p-2" />
                    </div>
                    <div className="flex justify-end gap-2 pt-3 border-t border-stone-200 dark:border-stone-800">
                      <button type="button" onClick={() => setEditingStaffMember(null)} className="px-3.5 py-1.5 rounded border cursor-pointer">
                        Cancel
                      </button>
                      <button type="submit" className={`px-4 py-1.5 rounded font-semibold cursor-pointer ${themeClasses.primary}`}>
                        Save Staff Changes
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Change Password Modal */}
            {selectedStaffForPassword && (
              <div 
                className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-sm flex items-center justify-center p-4"
                onClick={() => setSelectedStaffForPassword(null)}
              >
                <div 
                  className="bg-white dark:bg-stone-900 rounded-xl max-w-md w-full max-h-[85vh] flex flex-col overflow-hidden border border-stone-200 dark:border-stone-800 shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-between items-center gap-2 px-5 py-3.5 border-b border-stone-200 dark:border-stone-800 shrink-0">
                    <div>
                      <h4 className="font-serif font-bold text-base text-stone-900 dark:text-stone-50">
                        Update Password for @{selectedStaffForPassword.username}
                      </h4>
                      <p className="text-[11px] text-stone-500">
                        Member: {selectedStaffForPassword.name} ({selectedStaffForPassword.role.replace('_', ' ')})
                      </p>
                    </div>
                    <ModalDismissButton onClose={() => setSelectedStaffForPassword(null)} ariaLabel="Close Password Modal" />
                  </div>

                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (newPasswordInput.trim().length < 8) {
                        showToast('Password Error', 'Password must be at least 8 characters.', 'error');
                        return;
                      }
                      await changeUserPassword(selectedStaffForPassword.id, newPasswordInput.trim());
                      setSelectedStaffForPassword(null);
                    }}
                    className="p-5 space-y-4 text-xs overflow-y-auto flex-1"
                  >
                    <div>
                      <label className="block font-semibold mb-1">New Secure Password</label>
                      <input
                        type="password"
                        minLength={8}
                        value={newPasswordInput}
                        onChange={(e) => setNewPasswordInput(e.target.value)}
                        placeholder="Minimum 8 characters"
                        required
                        className="w-full bg-stone-50 dark:bg-stone-800 border rounded p-2 font-mono text-stone-900 dark:text-stone-100"
                      />
                      <span className="text-[10px] text-stone-400 mt-1 block">
                        Minimum 8 characters. The user will sign in using @{selectedStaffForPassword.username} and this password.
                      </span>
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-stone-200 dark:border-stone-800">
                      <button
                        type="button"
                        onClick={() => setSelectedStaffForPassword(null)}
                        className="px-3.5 py-1.5 rounded border cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className={`px-4 py-1.5 rounded font-semibold cursor-pointer ${themeClasses.primary}`}
                      >
                        Save New Password
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Add Staff Modal */}
            {isAddStaffOpen && (
              <div 
                className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-sm flex items-center justify-center p-4"
                onClick={() => setIsAddStaffOpen(false)}
              >
                <div 
                  className="bg-white dark:bg-stone-900 rounded-xl max-w-md w-full max-h-[85vh] flex flex-col overflow-hidden border border-stone-200 dark:border-stone-800 shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-between items-center gap-2 px-5 py-3.5 border-b border-stone-200 dark:border-stone-800 shrink-0">
                    <h4 className="font-serif font-bold text-base text-stone-900 dark:text-stone-50">
                      Add New Staff Member
                    </h4>
                    <ModalDismissButton onClose={() => setIsAddStaffOpen(false)} ariaLabel="Close Add Staff Modal" />
                  </div>

                  <form onSubmit={handleSaveStaff} className="p-5 space-y-3.5 text-xs overflow-y-auto flex-1">
                    <div>
                      <label className="block font-semibold mb-1">Full Legal Name</label>
                      <input name="name" placeholder="e.g. Rajesh Khadka" required className="w-full bg-stone-50 dark:bg-stone-800 border rounded p-2" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold mb-1">Login Username</label>
                        <input name="username" placeholder="e.g. rajesh" required className="w-full bg-stone-50 dark:bg-stone-800 border rounded p-2 font-mono" />
                      </div>
                      <div>
                        <label className="block font-semibold mb-1">Initial Password (min 8 chars)</label>
                        <input name="password" type="password" minLength={8} placeholder="Enter strong password" required className="w-full bg-stone-50 dark:bg-stone-800 border rounded p-2 font-mono" />
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">Official Email</label>
                      <input name="email" type="email" placeholder="e.g. rajesh@kamalhotel.np" required className="w-full bg-stone-50 dark:bg-stone-800 border rounded p-2" />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">Phone Number</label>
                      <input name="phone" defaultValue="+977 98" required className="w-full bg-stone-50 dark:bg-stone-800 border rounded p-2" />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">Role Assignment</label>
                      <select name="role" defaultValue="receptionist" className="w-full bg-stone-50 dark:bg-stone-800 border rounded p-2">
                        <option value="admin">Hotel Admin (Operations &amp; CMS)</option>
                        <option value="hotel_manager">Hotel Manager (Operations &amp; Rates)</option>
                        <option value="restaurant_owner">Restaurant Owner (F&amp;B &amp; POS)</option>
                        <option value="receptionist">Receptionist / Front Desk Clerk</option>
                        <option value="chef">Head Chef (Kitchen &amp; Dining)</option>
                        <option value="waiter">Waiter / Restaurant Service Lead</option>
                        <option value="housekeeping">Housekeeping &amp; Room Inspector</option>
                        <option value="super_admin">Super Admin (Full Ownership &amp; CMS)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">Department</label>
                      <input name="department" defaultValue="Front Office & Concierge" className="w-full bg-stone-50 dark:bg-stone-800 border rounded p-2" />
                    </div>

                    <div className="flex justify-end gap-2.5 pt-3 border-t border-stone-200 dark:border-stone-800">
                      <button
                        type="button"
                        onClick={() => setIsAddStaffOpen(false)}
                        className="px-4 py-2 rounded border cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button type="submit" className={`px-5 py-2 rounded font-semibold cursor-pointer ${themeClasses.primary}`}>
                        Add Member &amp; Create Account
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 7: NOTIFICATIONS */}
        {activeTab === 'notifications' && (
          <div className="space-y-6">
            {(activeRole === 'super_admin' ||
              activeRole === 'admin' ||
              activeRole === 'hotel_manager' ||
              activeRole === 'receptionist') && <WakeUpCallFrontDeskPanel />}

            <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm space-y-6">
              <div>
                <span className="text-xs font-mono font-bold uppercase text-amber-700 dark:text-amber-400">
                  Automated Messaging Gateway
                </span>
                <h3 className="text-xl font-serif font-bold text-stone-900 dark:text-stone-50">
                  Dispatched Email, SMS & WhatsApp Records
                </h3>
                <p className="text-xs text-stone-500">
                  Live automated transmission logs for reservations at Kamal Hotel Kathmandu.
                </p>
              </div>

            <div className="space-y-3">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-stone-400 text-xs">
                  No automated notifications dispatched yet. Make a test reservation to observe live dispatch.
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/40 flex flex-col sm:flex-row sm:items-start justify-between gap-4 text-xs"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 p-2 rounded-lg bg-stone-100 dark:bg-stone-700 text-amber-700 dark:text-amber-400">
                        {notif.channel === 'email' ? (
                          <Mail className="w-4 h-4" />
                        ) : notif.channel === 'sms' ? (
                          <Smartphone className="w-4 h-4" />
                        ) : (
                          <MessageSquare className="w-4 h-4" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono uppercase font-bold text-[10px] px-1.5 py-0.5 rounded bg-stone-200 dark:bg-stone-700">
                            {notif.channel}
                          </span>
                          <span className="font-semibold text-stone-900 dark:text-stone-100">{notif.subject}</span>
                        </div>
                        <p className="text-stone-600 dark:text-stone-300 text-xs leading-relaxed">
                          {notif.message}
                        </p>
                        <div className="text-[11px] text-stone-400 font-mono">
                          Recipient: {notif.recipient} {notif.bookingCode ? `· Ref: ${notif.bookingCode}` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        {notif.status.toUpperCase()}
                      </span>
                      <div className="text-[10px] text-stone-400 font-mono mt-1">{notif.timestamp}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
            </div>
          </div>
        )}

        {/* TAB 8: AUDIT LOGS */}
        {activeTab === 'audit' && (
          <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-mono font-bold uppercase text-amber-700 dark:text-amber-400">
                  Compliance & Traceability
                </span>
                <h3 className="text-xl font-serif font-bold text-stone-900 dark:text-stone-50">
                  Security & Operational Audit Trail
                </h3>
                <p className="text-xs text-stone-500">
                  Every reservation modification, price change, CMS update, and role grant is logged with IP and actor details.
                </p>
              </div>

              <select
                value={auditCategoryFilter}
                onChange={(e) => setAuditCategoryFilter(e.target.value)}
                className="py-1.5 px-3 text-xs rounded border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
              >
                <option value="all">All Categories</option>
                <option value="booking">Booking Operations</option>
                <option value="cms">CMS & Theme</option>
                <option value="rate">Rate Changes</option>
                <option value="staff">Staff RBAC</option>
                <option value="security">Security</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-600 dark:text-stone-300">
                <thead className="bg-stone-50 dark:bg-stone-800/80 text-[11px] uppercase tracking-wider text-stone-500 font-mono border-y border-stone-200 dark:border-stone-700">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Actor</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Details</th>
                    <th className="py-3 px-4 font-mono text-right">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800 font-mono text-[11px]">
                  {filteredAuditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-stone-50/60 dark:hover:bg-stone-800/40">
                      <td className="py-3 px-4 whitespace-nowrap text-stone-400">{log.timestamp}</td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-semibold text-stone-900 dark:text-stone-100 font-sans">
                          {log.actorName}
                        </span>
                        <span className="text-stone-400 ml-1">({log.actorRole})</span>
                      </td>
                      <td className="py-3 px-4 font-sans font-medium text-stone-800 dark:text-stone-200">
                        {log.action}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] uppercase font-semibold bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                          {log.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-sans text-stone-600 dark:text-stone-400 max-w-sm">
                        {log.details}
                      </td>
                      <td className="py-3 px-4 text-right text-stone-400">{log.ipAddress}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: PLATFORM PERFORMANCE & CACHE MONITOR */}
        {activeTab === 'perf_monitor' && (
          <PerformanceMonitoringDashboard />
        )}

        {/* TAB: POST-CHECKOUT GUEST SURVEYS & AGGREGATED FEEDBACK */}
        {activeTab === 'surveys' && (
          <GuestSurveyFeedbackPanel />
        )}

        {/* TAB: SHIFT SCHEDULING & ATTENDANCE */}
        {activeTab === 'shift_scheduling' && (
          <ShiftSchedulingPanel />
        )}

        {/* TAB: END-TO-END OPERATIONS GUIDE */}
        {activeTab === 'ops_guide' && (
          <OperationsGuidePanel onNavigateTab={(tab) => setActiveTab(tab as DashboardTab)} />
        )}
              </div>
            </div>
          );
        })()}

        {/* MODAL: PHYSICAL ROOM NUMBER ASSIGNMENT */}
        {assigningBooking && (
          <div
            className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setAssigningBooking(null)}
          >
            <div
              className="bg-white dark:bg-stone-900 rounded-2xl max-w-md w-full max-h-[85vh] flex flex-col overflow-hidden border border-stone-200 dark:border-stone-800 shadow-2xl animate-in fade-in"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start gap-2 px-5 py-3.5 border-b border-stone-200 dark:border-stone-800 shrink-0">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase text-amber-700 dark:text-amber-400">
                    Front Desk Room Allocation
                  </span>
                  <h4 className="font-serif font-bold text-base text-stone-900 dark:text-stone-50">
                    Assign Physical Room Number
                  </h4>
                </div>
                <ModalDismissButton onClose={() => setAssigningBooking(null)} ariaLabel="Close Room Assignment Modal" />
              </div>

              <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {/* Guest & Reservation Brief */}
              <div className="p-3.5 bg-stone-50 dark:bg-stone-800/60 rounded-xl border border-stone-200/80 dark:border-stone-700/80 text-xs space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-stone-900 dark:text-stone-100">{assigningBooking.guestName}</span>
                  <span className="font-mono text-amber-800 dark:text-amber-400 font-bold">{assigningBooking.bookingCode}</span>
                </div>
                <div className="text-stone-500 flex justify-between">
                  <span>Reserved Room Type:</span>
                  <span className="font-medium text-stone-800 dark:text-stone-200">{assigningBooking.roomName}</span>
                </div>
                <div className="text-stone-500 flex justify-between">
                  <span>Dates of Stay:</span>
                  <span className="font-mono text-stone-700 dark:text-stone-300">
                    {assigningBooking.checkInDate} &rarr; {assigningBooking.checkOutDate} ({assigningBooking.nights} nights)
                  </span>
                </div>
                {assigningBooking.assignedRoomNumber && (
                  <div className="text-stone-500 flex justify-between pt-1 border-t border-stone-200 dark:border-stone-700">
                    <span>Currently Assigned:</span>
                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      Room {assigningBooking.assignedRoomNumber} ({assigningBooking.assignedFloor || 'Main Building'})
                    </span>
                  </div>
                )}
              </div>

              {/* Auto-suggested Room Unit & Selection */}
              {(() => {
                const vacantMatchingRooms = roomUnits.filter(
                  (u) => u.roomType === assigningBooking.roomType && u.occupancyStatus === 'vacant'
                );
                const suggestedUnit = vacantMatchingRooms[0];

                return (
                  <div className="space-y-4">
                    {suggestedUnit && (
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between gap-2 text-xs">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-300 block">
                            Recommended Vacant Room (Auto-Suggest)
                          </span>
                          <span className="font-mono font-bold text-stone-900 dark:text-stone-100 text-sm">
                            Room {suggestedUnit.roomNumber}
                          </span>
                          <span className="text-stone-500 text-[11px] ml-2">
                            {suggestedUnit.floor} · {suggestedUnit.cleanStatus}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            assignRoomToBooking(assigningBooking.id, suggestedUnit.roomNumber);
                            setAssigningBooking(null);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shrink-0 whitespace-nowrap cursor-pointer"
                        >
                          Auto-Assign {suggestedUnit.roomNumber}
                        </button>
                      </div>
                    )}

                    {/* Manual Dropdown Selector */}
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                        Select Physical Room from Inventory:
                      </label>
                      <select
                        value={selectedRoomNumber}
                        onChange={(e) => setSelectedRoomNumber(e.target.value)}
                        className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg p-2.5 text-xs text-stone-900 dark:text-stone-100 font-mono"
                      >
                        <option value="">-- Choose a Room Unit --</option>
                        <optgroup label={`Matching Reserved Category (${assigningBooking.roomName})`}>
                          {roomUnits
                            .filter((u) => u.roomType === assigningBooking.roomType)
                            .map((u) => (
                              <option
                                key={u.id}
                                value={u.roomNumber}
                                disabled={u.occupancyStatus === 'occupied' && u.currentBookingCode !== assigningBooking.bookingCode}
                              >
                                Room {u.roomNumber} ({u.floor}) - {u.occupancyStatus.toUpperCase()} [{u.cleanStatus}] {u.occupancyStatus === 'occupied' ? `(Occupied: ${u.currentGuestName})` : ''}
                              </option>
                            ))}
                        </optgroup>
                        <optgroup label="Other Clean Rooms (Upgrade / Reassignment)">
                          {roomUnits
                            .filter((u) => u.roomType !== assigningBooking.roomType)
                            .map((u) => (
                              <option
                                key={u.id}
                                value={u.roomNumber}
                                disabled={u.occupancyStatus === 'occupied'}
                              >
                                Room {u.roomNumber} ({u.floor}) - {u.roomType} [{u.occupancyStatus.toUpperCase()}]
                              </option>
                            ))}
                        </optgroup>
                      </select>
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-stone-200 dark:border-stone-800">
                      <button
                        type="button"
                        onClick={() => setAssigningBooking(null)}
                        className="px-4 py-2 rounded-lg border border-stone-300 dark:border-stone-700 text-xs font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={!selectedRoomNumber}
                        onClick={() => {
                          if (!selectedRoomNumber) return;
                          assignRoomToBooking(assigningBooking.id, selectedRoomNumber);
                          setAssigningBooking(null);
                        }}
                        className={`px-5 py-2 rounded-lg text-xs font-bold text-white transition disabled:opacity-40 cursor-pointer ${themeClasses.primary}`}
                      >
                        Confirm Room Assignment
                      </button>
                    </div>
                  </div>
                );
              })()}
              </div>
            </div>
          </div>
        )}

        {/* MODAL: ADJUST KAMAL REWARDS POINTS */}
        {adjustingLoyaltyBooking && (
          <div
            className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setAdjustingLoyaltyBooking(null)}
          >
            <div
              className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 max-w-md w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-2 px-5 py-3.5 border-b border-stone-200 dark:border-stone-800 shrink-0">
                <div>
                  <h4 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-50 flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>Adjust Kamal Rewards Points</span>
                  </h4>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                    Guest: <strong className="text-stone-900 dark:text-stone-100">{adjustingLoyaltyBooking.guestName}</strong> ·{' '}
                    <span className="font-mono">{adjustingLoyaltyBooking.bookingCode}</span>
                  </p>
                </div>
                <ModalDismissButton onClose={() => setAdjustingLoyaltyBooking(null)} ariaLabel="Close Loyalty Points Modal" />
              </div>

              <div className="p-5 overflow-y-auto flex-1 space-y-4">

              {(() => {
                const currentMember = getGuestLoyaltyAccount(
                  adjustingLoyaltyBooking.guestEmail,
                  adjustingLoyaltyBooking.guestName,
                  adjustingLoyaltyBooking.bookingCode
                );
                const currentBalance = currentMember?.pointsBalance ?? 0;
                const parsedPoints = Math.max(0, Math.round(Number(loyaltyPointsAmount) || 0));
                const signedDelta = loyaltyAdjMode === 'credit' ? parsedPoints : -parsedPoints;
                const projectedBalance = Math.max(0, currentBalance + signedDelta);

                return (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (parsedPoints <= 0) {
                        showToast('Invalid Points Amount', 'Please enter a point amount greater than 0.', 'warning');
                        return;
                      }
                      adjustLoyaltyPoints({
                        guestName: adjustingLoyaltyBooking.guestName,
                        guestEmail: adjustingLoyaltyBooking.guestEmail,
                        guestPhone: adjustingLoyaltyBooking.guestPhone,
                        bookingCode: adjustingLoyaltyBooking.bookingCode,
                        pointsDelta: signedDelta,
                        reason: loyaltyReason.trim() || (loyaltyAdjMode === 'credit' ? 'Manual staff bonus credit' : 'Manual staff point deduction'),
                        transactionType: loyaltyAdjMode === 'credit' ? 'manual_credit' : 'manual_debit',
                      });
                      setAdjustingLoyaltyBooking(null);
                    }}
                    className="space-y-4 text-xs"
                  >
                    {/* Current Member Balance Card */}
                    <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-700 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[11px] font-mono uppercase tracking-wider text-stone-500 dark:text-stone-400">
                          {currentMember ? `${currentMember.memberNumber} · ${currentMember.tier}` : 'New Loyalty Enrollment'}
                        </div>
                        <div className="text-xs text-stone-600 dark:text-stone-300 mt-0.5">
                          {adjustingLoyaltyBooking.guestEmail}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-mono uppercase text-stone-500 dark:text-stone-400">Current Balance</div>
                        <div className="text-xl font-sans font-semibold tracking-tight text-amber-700 dark:text-amber-400 tabular-nums">
                          {currentBalance.toLocaleString()} pts
                        </div>
                      </div>
                    </div>

                    {/* Credit / Debit Mode Toggle */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setLoyaltyAdjMode('credit');
                          if (loyaltyReason === 'Manual Reward / Perk Deduction') {
                            setLoyaltyReason('Front Desk Courtesy Bonus');
                          }
                        }}
                        className={`py-2 px-3 rounded-lg border font-semibold transition-colors cursor-pointer ${
                          loyaltyAdjMode === 'credit'
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300'
                        }`}
                      >
                        + Add Points (Credit)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setLoyaltyAdjMode('debit');
                          if (loyaltyReason === 'Front Desk Courtesy Bonus') {
                            setLoyaltyReason('Manual Reward / Perk Deduction');
                          }
                        }}
                        className={`py-2 px-3 rounded-lg border font-semibold transition-colors cursor-pointer ${
                          loyaltyAdjMode === 'debit'
                            ? 'bg-rose-600 border-rose-600 text-white'
                            : 'bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300'
                        }`}
                      >
                        − Deduct Points (Debit)
                      </button>
                    </div>

                    {/* Points Amount & Quick Presets */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="font-semibold text-stone-700 dark:text-stone-300">
                          Points Amount
                        </label>
                        <div className="flex items-center gap-1.5">
                          {[100, 250, 500, 1000].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setLoyaltyPointsAmount(String(preset))}
                              className="px-2 py-0.5 rounded border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 font-mono text-[11px] text-stone-700 dark:text-stone-300 cursor-pointer tabular-nums"
                            >
                              {loyaltyAdjMode === 'credit' ? '+' : '−'}{preset}
                            </button>
                          ))}
                        </div>
                      </div>
                      <input
                        type="number"
                        min={1}
                        max={100000}
                        required
                        value={loyaltyPointsAmount}
                        onChange={(e) => setLoyaltyPointsAmount(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-mono font-bold tabular-nums"
                      />
                    </div>

                    {/* Reason */}
                    <div className="space-y-1.5">
                      <label className="block font-semibold text-stone-700 dark:text-stone-300">
                        Adjustment Reason / Audit Note
                      </label>
                      <input
                        type="text"
                        required
                        value={loyaltyReason}
                        onChange={(e) => setLoyaltyReason(e.target.value)}
                        placeholder="e.g., VIP welcome bonus, service recovery credit, spa redemption..."
                        className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                      />
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {[
                          'VIP Welcome Bonus',
                          'Service Recovery Credit',
                          'Dining / Spa Complimentary Adjustment',
                          'Points Audit Correction',
                        ].map((presetReason) => (
                          <button
                            key={presetReason}
                            type="button"
                            onClick={() => setLoyaltyReason(presetReason)}
                            className="px-2 py-0.5 rounded border border-stone-200 dark:border-stone-700 text-[10px] text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                          >
                            {presetReason}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Projected Balance Preview */}
                    <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-between font-mono">
                      <span className="text-amber-900 dark:text-amber-200 font-semibold">
                        Projected New Balance:
                      </span>
                      <span className="font-bold text-sm text-amber-900 dark:text-amber-100 tabular-nums">
                        {currentBalance.toLocaleString()} pts → {projectedBalance.toLocaleString()} pts
                      </span>
                    </div>

                    {/* Recent Ledger Preview */}
                    {currentMember && currentMember.transactions.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="text-[11px] font-mono uppercase tracking-wider text-stone-500 dark:text-stone-400">
                          Recent Point Activity
                        </div>
                        <div className="max-h-28 overflow-y-auto divide-y divide-stone-100 dark:divide-stone-800 rounded-lg border border-stone-200 dark:border-stone-800">
                          {currentMember.transactions.slice(0, 3).map((tx) => (
                            <div key={tx.id} className="px-3 py-1.5 flex items-center justify-between gap-2 text-[11px]">
                              <div className="truncate text-stone-700 dark:text-stone-300">
                                {tx.reason}
                                <span className="text-stone-400 ml-1.5 font-mono text-[10px]">({tx.timestamp})</span>
                              </div>
                              <span
                                className={`font-mono font-bold tabular-nums shrink-0 ${
                                  tx.pointsDelta >= 0
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-rose-600 dark:text-rose-400'
                                }`}
                              >
                                {tx.pointsDelta >= 0 ? '+' : ''}
                                {tx.pointsDelta.toLocaleString()} pts
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end gap-2 pt-3 border-t border-stone-200 dark:border-stone-800">
                      <button
                        type="button"
                        onClick={() => setAdjustingLoyaltyBooking(null)}
                        className="px-4 py-2 rounded-lg border border-stone-300 dark:border-stone-700 text-xs font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className={`px-5 py-2 rounded-lg text-xs font-bold text-white transition cursor-pointer ${themeClasses.primary}`}
                      >
                        Confirm Points Adjustment
                      </button>
                    </div>
                  </form>
                );
              })()}
              </div>
            </div>
          </div>
        )}

        {selectedBookingInvoice && (
          <InvoicePrintModal
            invoice={selectedBookingInvoice}
            billSettings={billSettings}
            currency={currentCurrency}
            onClose={() => setSelectedBookingInvoice(null)}
            onUpdateInvoice={(updated) => {
              updateInvoice(updated.id, updated);
              setSelectedBookingInvoice(updated);
            }}
          />
        )}

      </div>
    </div>
  );
};

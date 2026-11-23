import React, { useState, useRef } from 'react';
import { useHotel } from '../../context/HotelContext';
import { 
  MenuItem, 
  MenuItemCategory, 
  Room, 
  RoomType, 
  StaffRole, 
  ThemePalette,
  ParsedMenuItemRow,
  RestaurantTable,
  TableZone
} from '../../types/hotel';
import { formatCurrency, convertPrice } from '../../utils/theme';
import { 
  Building2, 
  Trash2, 
  RefreshCw, 
  Mail, 
  Sliders, 
  UtensilsCrossed, 
  Layers, 
  Upload, 
  FileSpreadsheet, 
  Download, 
  CheckCircle, 
  AlertTriangle, 
  Plus, 
  Eye, 
  ShieldCheck, 
  MapPin, 
  Phone, 
  Globe, 
  DollarSign, 
  Users, 
  BedDouble, 
  Sparkles,
  Info,
  Calendar,
  Clock,
  Flame,
  Leaf,
  Star
} from 'lucide-react';
import { ModalDismissButton, useModalDismiss } from '../Common/ModalDismissHandler';
import { HorizontalTabSlider } from '../Common/HorizontalTabSlider';
import { EmailSmtpSettingsCard } from '../CMS/EmailSmtpSettingsCard';

export const HotelTenantOnboardingWizard: React.FC = () => {
  const { 
    themeConfig, 
    smtpConfig,
    updateThemeConfig, 
    purgeAllDemoData, 
    batchImportMenuItems,
    menuItems,
    rooms,
    roomUnits,
    floors,
    addFloor,
    deleteFloor,
    deleteRoomUnit,
    massGenerateRoomUnits,
    addRoomTypeCatalog,
    restaurantTables,
    addRestaurantTable,
    clearTable,
    staff,
    addStaff,
    deleteStaff,
    bookings,
    invoices,
    restaurantOrders,
    currentCurrency,
    showToast,
    addAuditLog
  } = useHotel();

  // Wizard active sub-tab
  const [activeTab, setActiveTab] = useState<
    'purge_reset' | 'branding_cms' | 'smtp_gateway' | 'floors_rooms' | 'restaurant_tables' | 'menu_upload' | 'staff_roles'
  >('purge_reset');

  // Purge Modal & Form State
  const [isConfirmPurgeOpen, setIsConfirmPurgeOpen] = useState(false);
  useModalDismiss(isConfirmPurgeOpen, () => setIsConfirmPurgeOpen(false));
  const [newHotelNameInput, setNewHotelNameInput] = useState('');
  const [newCityInput, setNewCityInput] = useState('Kathmandu, Nepal');
  const [newLegalNameInput, setNewLegalNameInput] = useState('');
  const [newPanVatInput, setNewPanVatInput] = useState('');
  const [newEmailInput, setNewEmailInput] = useState('');
  const [newPhoneInput, setNewPhoneInput] = useState('');
  const [purgeResetLandingPage, setPurgeResetLandingPage] = useState(true);
  const [purgeResetRooms, setPurgeResetRooms] = useState(false);
  const [purgeResetMenu, setPurgeResetMenu] = useState(false);
  const [purgeResetTables, setPurgeResetTables] = useState(false);
  const [purgeResetStaff, setPurgeResetStaff] = useState(false);

  // Branding CMS Form State
  const [brandingForm, setBrandingForm] = useState({
    hotelName: themeConfig.hotelName,
    hotelLegalName: themeConfig.hotelLegalName || `${themeConfig.hotelName} Pvt. Ltd.`,
    panVatNumber: themeConfig.panVatNumber || '601928374',
    city: themeConfig.city,
    neighborhood: themeConfig.neighborhood,
    address: themeConfig.address,
    contactEmail: themeConfig.contactEmail,
    contactPhone: themeConfig.contactPhone,
    whatsappNumber: themeConfig.whatsappNumber,
    checkInTime: themeConfig.checkInTime || '02:00 PM',
    checkOutTime: themeConfig.checkOutTime || '12:00 PM',
    starRating: themeConfig.starRating || 3,
    heroKickerBadge: themeConfig.heroKickerBadge || 'Boutique Heritage Haven',
    heroHeadline: themeConfig.heroHeadline,
    heroSubheadline: themeConfig.heroSubheadline,
    palette: themeConfig.palette,
    fontFamily: themeConfig.fontFamily,
    latitude: themeConfig.latitude || 27.7089,
    longitude: themeConfig.longitude || 85.3261,
  });

  // Room Type Form
  const [newRoomType, setNewRoomType] = useState({
    name: 'Presidential Royal Balcony Suite',
    type: 'executive-suite' as RoomType,
    pricePerNightUSD: 110,
    maxGuests: 3,
    bedType: '1 King Bed + Lounge Daybed',
    sizeSqFt: 580,
    view: 'Panoramic Himalayan & Valley View',
    floor: '4th Floor & Penthouse',
    description: 'Ultra-luxurious suite featuring private sun deck, custom teak woodwork, and heritage brass fittings.',
    amenities: 'High-Speed Wi-Fi, Solar Rain Shower, Tea & Coffee Bar, Smart TV, Panoramic Balcony',
  });

  // Mass Room Unit Generator Form
  const [massFloor, setMassFloor] = useState('2nd Floor');
  const [massRoomType, setMassRoomType] = useState<RoomType>('deluxe');
  const [massStartNumber, setMassStartNumber] = useState(201);
  const [massCount, setMassCount] = useState(6);

  // Restaurant Table Form
  const [newTableNumber, setNewTableNumber] = useState('T-07');
  const [newTableZone, setNewTableZone] = useState<TableZone>('rooftop');
  const [newTableCapacity, setNewTableCapacity] = useState(4);

  // Excel / CSV Menu Upload State
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [parsedDishes, setParsedDishes] = useState<ParsedMenuItemRow[]>([]);
  const [uploadFileName, setUploadFileName] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [menuImportMode, setMenuImportMode] = useState<'append' | 'replace'>('append');

  // Staff Addition Form
  const [newStaffMember, setNewStaffMember] = useState({
    name: '',
    username: '',
    password: '',
    email: '',
    phone: '',
    role: 'receptionist' as StaffRole,
    department: 'Front Office',
  });

  // ----------------- HANDLERS -----------------

  const handleExecutePurge = () => {
    purgeAllDemoData({
      resetLandingPage: purgeResetLandingPage,
      resetRooms: purgeResetRooms,
      resetMenu: purgeResetMenu,
      resetTables: purgeResetTables,
      resetStaff: purgeResetStaff,
      newHotelName: newHotelNameInput.trim() || undefined,
      newCity: newCityInput.trim() || undefined,
      newLegalName: newLegalNameInput.trim() || undefined,
      newPanVat: newPanVatInput.trim() || undefined,
      newEmail: newEmailInput.trim() || undefined,
      newPhone: newPhoneInput.trim() || undefined,
    });
    setIsConfirmPurgeOpen(false);
  };

  const handleSaveBranding = (e: React.FormEvent) => {
    e.preventDefault();
    updateThemeConfig({
      hotelName: brandingForm.hotelName,
      hotelLegalName: brandingForm.hotelLegalName,
      panVatNumber: brandingForm.panVatNumber,
      city: brandingForm.city,
      neighborhood: brandingForm.neighborhood,
      address: brandingForm.address,
      contactEmail: brandingForm.contactEmail,
      officialEmail: brandingForm.contactEmail,
      contactPhone: brandingForm.contactPhone,
      receptionPhone: brandingForm.contactPhone,
      whatsappNumber: brandingForm.whatsappNumber,
      checkInTime: brandingForm.checkInTime,
      checkOutTime: brandingForm.checkOutTime,
      starRating: Number(brandingForm.starRating),
      heroKickerBadge: brandingForm.heroKickerBadge,
      heroHeadline: brandingForm.heroHeadline,
      heroSubheadline: brandingForm.heroSubheadline,
      palette: brandingForm.palette,
      fontFamily: brandingForm.fontFamily,
      latitude: Number(brandingForm.latitude),
      longitude: Number(brandingForm.longitude),
    });
    showToast('Branding Saved', 'Hotel identity and landing page settings updated successfully.', 'success');
  };

  const handleCreateRoomType = (e: React.FormEvent) => {
    e.preventDefault();
    const newRoom: Room = {
      id: `room-cat-${Date.now()}`,
      name: newRoomType.name,
      slug: newRoomType.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      type: newRoomType.type,
      pricePerNightUSD: Number(newRoomType.pricePerNightUSD),
      maxGuests: Number(newRoomType.maxGuests),
      bedType: newRoomType.bedType,
      sizeSqFt: Number(newRoomType.sizeSqFt),
      view: newRoomType.view,
      floor: newRoomType.floor,
      totalUnits: 6,
      availableUnits: 6,
      rating: 5.0,
      reviewsCount: 1,
      description: newRoomType.description,
      amenities: newRoomType.amenities.split(',').map((a) => a.trim()).filter(Boolean),
      images: rooms[0]?.images || [],
      isFeatured: true,
    };
    addRoomTypeCatalog(newRoom);
  };

  const handleMassGenRooms = (e: React.FormEvent) => {
    e.preventDefault();
    massGenerateRoomUnits(massFloor, massRoomType, Number(massStartNumber), Number(massCount));
  };

  const handleAddTable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableNumber.trim()) return;
    const exists = restaurantTables.some((t) => t.tableNumber.toLowerCase() === newTableNumber.trim().toLowerCase());
    if (exists) {
      showToast('Table Exists', `Table ${newTableNumber} is already registered.`, 'warning');
      return;
    }
    addRestaurantTable({
      tableNumber: newTableNumber.trim().toUpperCase(),
      zone: newTableZone,
      capacity: Number(newTableCapacity),
      status: 'vacant',
    });
    setNewTableNumber(`T-0${restaurantTables.length + 2}`);
  };

  // CSV & Excel Client-Side Parser
  const parseMenuFileContent = (content: string, fileName: string) => {
    const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      showToast('Invalid File', 'File must contain a header row and at least one item.', 'error');
      return;
    }

    // Header detection
    const headers = lines[0].split(/,|\t/).map((h) => h.trim().toLowerCase().replace(/[^a-z]/g, ''));
    
    // Fallback or mapped indexes
    const nameIdx = headers.findIndex((h) => h.includes('name') || h.includes('dish') || h.includes('item'));
    const catIdx = headers.findIndex((h) => h.includes('cat') || h.includes('type') || h.includes('section'));
    const descIdx = headers.findIndex((h) => h.includes('desc') || h.includes('detail') || h.includes('ingredient'));
    const priceIdx = headers.findIndex((h) => h.includes('price') || h.includes('cost') || h.includes('rate') || h.includes('usd'));
    const spicyIdx = headers.findIndex((h) => h.includes('spic') || h.includes('chili') || h.includes('hot'));
    const vegIdx = headers.findIndex((h) => h.includes('veg') || h.includes('vegetarian'));
    const chefIdx = headers.findIndex((h) => h.includes('chef') || h.includes('special') || h.includes('sign'));
    const prepIdx = headers.findIndex((h) => h.includes('prep') || h.includes('time') || h.includes('min'));

    const rows: ParsedMenuItemRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      // Split by comma preserving quotes if present
      const rawCols = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map((c) => c.replace(/^"|"$/g, '').trim());
      if (rawCols.length === 0 || !rawCols[0]) continue;

      const name = rawCols[nameIdx >= 0 ? nameIdx : 0] || `Dish #${i}`;
      let categoryRaw = rawCols[catIdx >= 0 ? catIdx : 1] || 'Nepali Heritage & Cuisine';
      const desc = rawCols[descIdx >= 0 ? descIdx : 2] || 'Prepared fresh with Himalayan spices.';
      const priceRaw = parseFloat(rawCols[priceIdx >= 0 ? priceIdx : 3]);
      const priceUSD = isNaN(priceRaw) || priceRaw <= 0 ? 9.5 : priceRaw;

      // Normalize category
      let category: MenuItemCategory = 'Main Course';
      const catLower = categoryRaw.toLowerCase();
      if (catLower.includes('starter') || catLower.includes('appetizer')) category = 'Starters';
      else if (catLower.includes('newar') || catLower.includes('heritage') || catLower.includes('cuisine') || catLower.includes('dal')) category = 'Nepali Heritage & Cuisine';
      else if (catLower.includes('special') || catLower.includes('himalaya') || catLower.includes('chef')) category = 'Himalayan Specials';
      else if (catLower.includes('rooftop') || catLower.includes('ground-floor') || catLower.includes('bar') || catLower.includes('drink') || catLower.includes('beverage') || catLower.includes('wine')) category = 'Ground-Floor Bar & Beverages';
      else if (catLower.includes('dessert') || catLower.includes('sweet') || catLower.includes('cake')) category = 'Desserts';

      const isSpicy = spicyIdx >= 0 ? /true|1|yes|hot|medium/i.test(rawCols[spicyIdx]) : false;
      const isVegetarian = vegIdx >= 0 ? /true|1|yes|veg/i.test(rawCols[vegIdx]) : true;
      const isChefSpecial = chefIdx >= 0 ? /true|1|yes/i.test(rawCols[chefIdx]) : false;
      const prepMinutes = prepIdx >= 0 ? parseInt(rawCols[prepIdx], 10) || 20 : 20;

      rows.push({
        name,
        category,
        description: desc,
        priceUSD,
        isVegetarian,
        isSpicy,
        isChefSpecial,
        preparationTimeMinutes: prepMinutes,
        status: 'valid',
      });
    }

    setParsedDishes(rows);
    setUploadFileName(fileName);
    showToast('File Processed', `Parsed ${rows.length} dishes from ${fileName}. Review below to import.`, 'success');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseMenuFileContent(text, file.name);
    };
    reader.readAsText(file);
  };

  const handleDropFile = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseMenuFileContent(text, file.name);
    };
    reader.readAsText(file);
  };

  const handleDownloadSampleMenuCsv = () => {
    const csvContent = 
`DishName,Category,Description,PriceUSD,SpicyLevel,IsVegetarian,IsChefSpecial,PrepTimeMinutes
Himalayan Herb Roasted Chicken,Main Course,Organic local chicken marinated in Jimbu herbs and cold-pressed mustard oil,14.50,Medium,false,true,25
Traditional Nepali Khaja Set,Nepali Heritage & Cuisine,Baji beaten rice with spiced choila roasted soybean and spicy aloo tama,12.00,Hot,false,true,20
Kathmandu Valley Vegetable Momo (10 pcs),Starters,Steamed handmade dumplings filled with fresh valley cabbage paneer and coriander,7.50,Medium,true,false,15
Mustang Thakali Dal Bhat Platter,Nepali Heritage & Cuisine,Traditional black lentil soup steamed basmati gundruk and seasonal sag,13.00,Mild,true,true,20
Ground-Floor Everest Glacier Mule,Ground-Floor Bar & Beverages,Nepalese craft vodka fresh ginger brew Himalayan lime and fresh mint,9.00,Mild,true,true,5
Himalayan Yak Cheese Platter,Starters,Aged high-altitude yak artisan cheese with organic wildflower honey and crackers,11.50,Mild,true,false,10
Warm Apple Pie with Organic Honey,Desserts,Baked Helambu mountain apples infused with cinnamon and sweet vanilla cream,6.50,Mild,true,false,15`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Kamal_Hotel_Sample_Restaurant_Menu.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Sample Template Downloaded', 'Open and edit in Excel or Google Sheets, then upload.', 'info');
  };

  const handleConfirmBatchImport = () => {
    if (parsedDishes.length === 0) return;
    batchImportMenuItems(
      parsedDishes.map((d) => ({
        name: d.name,
        category: d.category,
        description: d.description,
        priceUSD: d.priceUSD,
        isVegetarian: d.isVegetarian,
        isSpicy: d.isSpicy,
        isChefSpecial: d.isChefSpecial,
        available: true,
        preparationTimeMinutes: d.preparationTimeMinutes,
      })),
      menuImportMode === 'replace'
    );
    setParsedDishes([]);
    setUploadFileName('');
  };

  const handleAddStaffMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffMember.name || !newStaffMember.username || !newStaffMember.email) {
      showToast('Missing Fields', 'Please complete the name, username, and email.', 'warning');
      return;
    }
    if (!newStaffMember.password || newStaffMember.password.trim().length < 8) {
      showToast('Strong Password Required', 'Please enter a password of at least 8 characters.', 'warning');
      return;
    }
    await addStaff({
      name: newStaffMember.name,
      username: newStaffMember.username.toLowerCase().trim(),
      password: newStaffMember.password.trim(),
      email: newStaffMember.email.trim(),
      phone: newStaffMember.phone || '+977-9800000000',
      role: newStaffMember.role,
      department: newStaffMember.department,
      status: 'active',
      lastActive: 'Just now',
      permissions: ['view_dashboard', 'manage_guest'],
    });
    setNewStaffMember({
      name: '',
      username: '',
      password: '',
      email: '',
      phone: '',
      role: 'receptionist',
      department: 'Front Office',
    });
  };

  return (
    <div className="space-y-6">
      {/* Super Admin Hub Banner */}
      <div className="bg-stone-900 text-stone-100 rounded-2xl border border-stone-800 p-6 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">
              Super Admin SaaS Engine
            </span>
            <span className="text-xs text-stone-400 font-mono">Multi-Hotel White-Label Provisioning</span>
          </div>
          <h2 className="text-2xl font-serif font-bold text-white tracking-tight">
            Hotel Tenant Onboarding & 1-Click Fresh Setup
          </h2>
          <p className="text-xs text-stone-400 leading-relaxed">
            Configure this platform for any hotel client. Wipe demo guest additions in 1-click, configure customized landing page and legal branding, set up SMTP mail dispatch, configure floors and room types with live currency conversion, and bulk import restaurant menus via Excel or CSV.
          </p>
        </div>

        {/* Quick Tenant Health Stat Pills */}
        <div className="flex flex-wrap lg:flex-col gap-2 shrink-0 text-xs font-mono">
          <div className="bg-stone-800/80 px-3.5 py-2 rounded-xl border border-stone-700/60 flex items-center justify-between gap-4">
            <span className="text-stone-400">Current Tenant:</span>
            <span className="font-bold text-amber-400 truncate max-w-[140px]">{themeConfig.hotelName}</span>
          </div>
          <div className="bg-stone-800/80 px-3.5 py-2 rounded-xl border border-stone-700/60 flex items-center justify-between gap-4">
            <span className="text-stone-400">Inventory:</span>
            <span className="font-bold text-stone-200">{rooms.length} Suites · {roomUnits.length} Units</span>
          </div>
          <div className="bg-stone-800/80 px-3.5 py-2 rounded-xl border border-stone-700/60 flex items-center justify-between gap-4">
            <span className="text-stone-400">SMTP Gateway:</span>
            <span className={`font-bold flex items-center gap-1 ${smtpConfig.isConfigured ? 'text-emerald-400' : 'text-amber-400'}`}>
              <span className={`w-2 h-2 rounded-full ${smtpConfig.isConfigured ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
              {smtpConfig.isConfigured ? 'Connected' : 'Pending'}
            </span>
          </div>
        </div>
      </div>

      {/* Tab Navigation Strip */}
      <div className="pb-2 border-b border-stone-200 dark:border-stone-800">
        <HorizontalTabSlider scrollStep={260} ariaLabel="Onboarding Setup Sections">
          <div className="flex items-center gap-2 w-max">
            {[
              { id: 'purge_reset', label: '1-Click Clean Tenant Reset', icon: <Trash2 className="w-4 h-4 text-rose-500" /> },
              { id: 'branding_cms', label: 'Branding & Landing Page', icon: <Sliders className="w-4 h-4 text-amber-500" /> },
              { id: 'smtp_gateway', label: 'Mail SMTP Gateway', icon: <Mail className="w-4 h-4 text-sky-500" /> },
              { id: 'floors_rooms', label: 'Floors & Rooms Catalog', icon: <Layers className="w-4 h-4 text-emerald-500" /> },
              { id: 'restaurant_tables', label: 'Restaurant Tables Layout', icon: <UtensilsCrossed className="w-4 h-4 text-purple-500" /> },
              { id: 'menu_upload', label: 'Excel / CSV Menu Upload', icon: <FileSpreadsheet className="w-4 h-4 text-indigo-500" /> },
              { id: 'staff_roles', label: 'Staff Additions & RBAC', icon: <Users className="w-4 h-4 text-teal-500" /> },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-sm'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </HorizontalTabSlider>
      </div>

      {/* ===================== TAB 1: 1-CLICK CLEAN TENANT RESET ===================== */}
      {activeTab === 'purge_reset' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-serif font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-amber-600" />
                  <span>Onboard New Hotel: 1-Click Demo Data Purge</span>
                </h3>
                <p className="text-xs text-stone-500 mt-1">
                  Handing over the platform to a brand-new hotel client? Clear all test guest reservations, fake invoices, demo restaurant dining orders, and test chat messages in a single click without losing system integrity.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsConfirmPurgeOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow transition cursor-pointer flex items-center gap-2 shrink-0"
              >
                <Trash2 className="w-4 h-4" />
                <span>Initialize Clean Tenant</span>
              </button>
            </div>

            {/* Current Test Data Footprint */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-3 border-t border-stone-100 dark:border-stone-800">
              <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-center">
                <span className="text-[10px] text-stone-400 font-mono uppercase block">Test Bookings</span>
                <span className="text-xl font-bold font-mono text-stone-900 dark:text-stone-100">{bookings.length}</span>
              </div>
              <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-center">
                <span className="text-[10px] text-stone-400 font-mono uppercase block">Test Folios</span>
                <span className="text-xl font-bold font-mono text-stone-900 dark:text-stone-100">{invoices.length}</span>
              </div>
              <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-center">
                <span className="text-[10px] text-stone-400 font-mono uppercase block">Dining Orders</span>
                <span className="text-xl font-bold font-mono text-stone-900 dark:text-stone-100">{restaurantOrders.length}</span>
              </div>
              <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-center">
                <span className="text-[10px] text-stone-400 font-mono uppercase block">Room Catalog</span>
                <span className="text-xl font-bold font-mono text-stone-900 dark:text-stone-100">{rooms.length}</span>
              </div>
              <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-center">
                <span className="text-[10px] text-stone-400 font-mono uppercase block">Physical Units</span>
                <span className="text-xl font-bold font-mono text-stone-900 dark:text-stone-100">{roomUnits.length}</span>
              </div>
              <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-center">
                <span className="text-[10px] text-stone-400 font-mono uppercase block">Menu Dishes</span>
                <span className="text-xl font-bold font-mono text-stone-900 dark:text-stone-100">{menuItems.length}</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200 text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Info className="w-4 h-4 text-amber-600" />
                <span>What Happens During 1-Click Clean Tenant Initialization:</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
                1. <strong>All guest transactions wiped</strong>: reservations, room service charges, active invoices, and passcodes reset to zero.<br />
                2. <strong>Rooms & tables reset to pristine clean</strong>: all units set to 'vacant' and 'clean' with zero occupancy.<br />
                3. <strong>Custom branding applied</strong>: instantly rename to your new client hotel, update city coordinates, official email, and legal PAN/VAT.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Purge Modal */}
      {isConfirmPurgeOpen && (
        <div
          className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsConfirmPurgeOpen(false)}
        >
          <div
            className="bg-white dark:bg-stone-900 rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden border border-stone-200 dark:border-stone-800 text-xs shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5 text-rose-600 min-w-0">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <div className="min-w-0">
                  <h3 className="font-serif font-bold text-base text-stone-900 dark:text-stone-100 truncate">
                    Confirm Clean Tenant Initialization
                  </h3>
                  <p className="text-[11px] text-stone-500 truncate">
                    Ready to configure a clean platform for a new client hotel.
                  </p>
                </div>
              </div>
              <ModalDismissButton onClose={() => setIsConfirmPurgeOpen(false)} ariaLabel="Close Tenant Reset Modal" />
            </div>

            <div className="p-5 space-y-3 overflow-y-auto flex-1">
              <div>
                <label className="block font-semibold mb-1">New Hotel Name (Commercial)</label>
                <input
                  type="text"
                  placeholder="e.g. Annapurna Royal Suites & Spa"
                  value={newHotelNameInput}
                  onChange={(e) => setNewHotelNameInput(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">City / Location</label>
                  <input
                    type="text"
                    value={newCityInput}
                    onChange={(e) => setNewCityInput(e.target.value)}
                    className="w-full p-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">PAN / VAT Registration</label>
                  <input
                    type="text"
                    placeholder="e.g. 603918274"
                    value={newPanVatInput}
                    onChange={(e) => setNewPanVatInput(e.target.value)}
                    className="w-full p-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-mono text-stone-900 dark:text-stone-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Official Reception Email</label>
                  <input
                    type="email"
                    placeholder="reservations@hotel.com"
                    value={newEmailInput}
                    onChange={(e) => setNewEmailInput(e.target.value)}
                    className="w-full p-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Contact Phone</label>
                  <input
                    type="text"
                    placeholder="+977-1-4422990"
                    value={newPhoneInput}
                    onChange={(e) => setNewPhoneInput(e.target.value)}
                    className="w-full p-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100"
                  />
                </div>
              </div>

              {/* Reset Scope Checkboxes */}
              <div className="pt-2 space-y-1.5 font-semibold text-[11px]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={purgeResetLandingPage}
                    onChange={(e) => setPurgeResetLandingPage(e.target.checked)}
                  />
                  <span>Reset Landing Page branding & headers to fresh hotel name</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={purgeResetRooms}
                    onChange={(e) => setPurgeResetRooms(e.target.checked)}
                  />
                  <span>Wipe Demo Room Types & Units (Clear catalog to start fresh)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={purgeResetMenu}
                    onChange={(e) => setPurgeResetMenu(e.target.checked)}
                  />
                  <span>Wipe Demo Restaurant Menu (Clear ready for Excel import)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={purgeResetTables}
                    onChange={(e) => setPurgeResetTables(e.target.checked)}
                  />
                  <span>Wipe Demo Restaurant Tables (Clear table layout)</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 px-5 py-3.5 border-t border-stone-100 dark:border-stone-800 shrink-0">
              <button
                type="button"
                onClick={() => setIsConfirmPurgeOpen(false)}
                className="px-4 py-2 rounded-lg border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecutePurge}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer shadow-md"
              >
                Execute 1-Click Fresh Tenant Setup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB 2: BRANDING & LANDING PAGE CMS ===================== */}
      {activeTab === 'branding_cms' && (
        <form onSubmit={handleSaveBranding} className="space-y-6">
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-serif font-bold text-stone-900 dark:text-stone-100">
                  Landing Page Branding & Legal Registration
                </h3>
                <p className="text-xs text-stone-500">
                  Controls everything displayed to prospective guests on the public landing page and invoice printouts.
                </p>
              </div>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs shadow cursor-pointer"
              >
                Save Branding Settings
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block font-semibold mb-1 text-xs">Hotel Display Name</label>
                <input
                  type="text"
                  value={brandingForm.hotelName}
                  onChange={(e) => setBrandingForm({ ...brandingForm, hotelName: e.target.value })}
                  required
                  className="w-full p-2.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-xs">Hotel Legal Business Name</label>
                <input
                  type="text"
                  value={brandingForm.hotelLegalName}
                  onChange={(e) => setBrandingForm({ ...brandingForm, hotelLegalName: e.target.value })}
                  placeholder="e.g. Annapurna Luxury Hotel Pvt. Ltd."
                  className="w-full p-2.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-xs">PAN / VAT Number (IRD Nepal / Tax ID)</label>
                <input
                  type="text"
                  value={brandingForm.panVatNumber}
                  onChange={(e) => setBrandingForm({ ...brandingForm, panVatNumber: e.target.value })}
                  placeholder="602918274"
                  className="w-full p-2.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-xs">City & Country</label>
                <input
                  type="text"
                  value={brandingForm.city}
                  onChange={(e) => setBrandingForm({ ...brandingForm, city: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-xs">Neighborhood / Street</label>
                <input
                  type="text"
                  value={brandingForm.neighborhood}
                  onChange={(e) => setBrandingForm({ ...brandingForm, neighborhood: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-xs">Official Email Address</label>
                <input
                  type="email"
                  value={brandingForm.contactEmail}
                  onChange={(e) => setBrandingForm({ ...brandingForm, contactEmail: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-xs">Reception Phone Number</label>
                <input
                  type="text"
                  value={brandingForm.contactPhone}
                  onChange={(e) => setBrandingForm({ ...brandingForm, contactPhone: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-xs">WhatsApp Concierge Number</label>
                <input
                  type="text"
                  value={brandingForm.whatsappNumber}
                  onChange={(e) => setBrandingForm({ ...brandingForm, whatsappNumber: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-xs">Star Rating</label>
                <select
                  value={brandingForm.starRating}
                  onChange={(e) => setBrandingForm({ ...brandingForm, starRating: Number(e.target.value) })}
                  className="w-full p-2.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 text-xs"
                >
                  <option value={3}>3-Star Boutique</option>
                  <option value={4}>4-Star Premium Heritage</option>
                  <option value={5}>5-Star Luxury Resort</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-xs">Standard Check-In Time</label>
                <input
                  type="text"
                  value={brandingForm.checkInTime}
                  onChange={(e) => setBrandingForm({ ...brandingForm, checkInTime: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-xs">Standard Check-Out Time</label>
                <input
                  type="text"
                  value={brandingForm.checkOutTime}
                  onChange={(e) => setBrandingForm({ ...brandingForm, checkOutTime: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-xs">Theme Palette</label>
                <select
                  value={brandingForm.palette}
                  onChange={(e) => setBrandingForm({ ...brandingForm, palette: e.target.value as ThemePalette })}
                  className="w-full p-2.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 text-xs"
                >
                  <option value="bright-himalayan-gold">Bright Himalayan Gold (Warm Amber)</option>
                  <option value="luminous-emerald">Luminous Emerald</option>
                  <option value="mountain-emerald">Mountain Emerald</option>
                  <option value="radiant-terracotta">Radiant Terracotta</option>
                  <option value="midnight-navy">Midnight Navy</option>
                  <option value="heritage-bronze">Heritage Bronze</option>
                </select>
              </div>
            </div>

            {/* Hero Headlines */}
            <div className="pt-3 border-t border-stone-100 dark:border-stone-800 space-y-3">
              <div>
                <label className="block font-semibold mb-1 text-xs">Hero Kicker Badge (Small Top Badge)</label>
                <input
                  type="text"
                  value={brandingForm.heroKickerBadge}
                  onChange={(e) => setBrandingForm({ ...brandingForm, heroKickerBadge: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-xs">Hero Primary Headline</label>
                <input
                  type="text"
                  value={brandingForm.heroHeadline}
                  onChange={(e) => setBrandingForm({ ...brandingForm, heroHeadline: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-xs">Hero Subheadline & Description</label>
                <textarea
                  rows={2}
                  value={brandingForm.heroSubheadline}
                  onChange={(e) => setBrandingForm({ ...brandingForm, heroSubheadline: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 text-xs"
                />
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ===================== TAB 3: MAIL SMTP GATEWAY ===================== */}
      {activeTab === 'smtp_gateway' && <EmailSmtpSettingsCard />}

      {/* ===================== TAB 4: FLOORS & ROOMS CATALOG ===================== */}
      {activeTab === 'floors_rooms' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Add Room Type Catalog Form */}
          <form onSubmit={handleCreateRoomType} className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-stone-100 dark:border-stone-800">
              <h3 className="text-base font-serif font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <BedDouble className="w-5 h-5 text-emerald-600" />
                <span>Add Room Type Catalog Entry</span>
              </h3>
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow cursor-pointer"
              >
                + Add Room Type
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="sm:col-span-2">
                <label className="block font-semibold mb-1">Room Category Title</label>
                <input
                  type="text"
                  value={newRoomType.name}
                  onChange={(e) => setNewRoomType({ ...newRoomType, name: e.target.value })}
                  required
                  className="w-full p-2.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Room Type Code</label>
                <select
                  value={newRoomType.type}
                  onChange={(e) => setNewRoomType({ ...newRoomType, type: e.target.value as RoomType })}
                  className="w-full p-2.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950"
                >
                  <option value="deluxe">Deluxe Heritage Room</option>
                  <option value="super-deluxe">Super Deluxe Veranda</option>
                  <option value="executive-suite">Executive Himalayan Suite</option>
                  <option value="standard-cozy">Standard Cozy Retreat</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Price per Night (Base USD)</label>
                <input
                  type="number"
                  value={newRoomType.pricePerNightUSD}
                  onChange={(e) => setNewRoomType({ ...newRoomType, pricePerNightUSD: Number(e.target.value) })}
                  required
                  className="w-full p-2.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 font-mono"
                />
                <span className="text-[10px] text-stone-400 mt-0.5 block">
                  Converts dynamically: {formatCurrency(convertPrice(newRoomType.pricePerNightUSD, currentCurrency, themeConfig.exchangeRates), currentCurrency)}
                </span>
              </div>

              <div>
                <label className="block font-semibold mb-1">Max Guests</label>
                <input
                  type="number"
                  value={newRoomType.maxGuests}
                  onChange={(e) => setNewRoomType({ ...newRoomType, maxGuests: Number(e.target.value) })}
                  className="w-full p-2.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Size (Sq Ft)</label>
                <input
                  type="number"
                  value={newRoomType.sizeSqFt}
                  onChange={(e) => setNewRoomType({ ...newRoomType, sizeSqFt: Number(e.target.value) })}
                  className="w-full p-2.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold mb-1">Bed Configuration</label>
                <input
                  type="text"
                  value={newRoomType.bedType}
                  onChange={(e) => setNewRoomType({ ...newRoomType, bedType: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold mb-1">Amenities (Comma separated)</label>
                <input
                  type="text"
                  value={newRoomType.amenities}
                  onChange={(e) => setNewRoomType({ ...newRoomType, amenities: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950"
                />
              </div>
            </div>
          </form>

          {/* Mass Physical Room Units Generator */}
          <div className="space-y-4">
            <form onSubmit={handleMassGenRooms} className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b pb-3 border-stone-100 dark:border-stone-800">
                <h3 className="text-base font-serif font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-amber-600" />
                  <span>Mass Physical Room Generator</span>
                </h3>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs shadow cursor-pointer"
                >
                  Generate Units
                </button>
              </div>
              <p className="text-xs text-stone-500">
                Instantly populate a floor with sequential physical room units (e.g. 201 through 206).
              </p>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold mb-1">Target Floor</label>
                  <select
                    value={massFloor}
                    onChange={(e) => setMassFloor(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950"
                  >
                    {floors.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                    <option value="Ground Floor">Ground Floor</option>
                    <option value="1st Floor">1st Floor</option>
                    <option value="2nd Floor">2nd Floor</option>
                    <option value="3rd Floor">3rd Floor</option>
                    <option value="Penthouse Floor">Penthouse Floor</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Room Category</label>
                  <select
                    value={massRoomType}
                    onChange={(e) => setMassRoomType(e.target.value as RoomType)}
                    className="w-full p-2.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950"
                  >
                    <option value="deluxe">Deluxe Heritage</option>
                    <option value="super-deluxe">Super Deluxe Veranda</option>
                    <option value="executive-suite">Executive Suite</option>
                    <option value="standard-cozy">Standard Cozy</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Starting Room Number</label>
                  <input
                    type="number"
                    value={massStartNumber}
                    onChange={(e) => setMassStartNumber(Number(e.target.value))}
                    className="w-full p-2.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Number of Units</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={massCount}
                    onChange={(e) => setMassCount(Number(e.target.value))}
                    className="w-full p-2.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 font-mono"
                  />
                </div>
              </div>
            </form>

            {/* Existing Physical Units List */}
            <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-serif font-bold text-sm text-stone-900 dark:text-stone-100">
                  Current Room Inventory ({roomUnits.length} physical units)
                </span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-56 overflow-y-auto pr-1">
                {roomUnits.map((u) => (
                  <div
                    key={u.id}
                    className="p-2 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 text-center flex flex-col justify-between"
                  >
                    <div className="font-serif font-bold text-sm text-stone-900 dark:text-stone-100">
                      {u.roomNumber}
                    </div>
                    <div className="text-[10px] text-stone-400 truncate">{u.floor}</div>
                    <button
                      type="button"
                      onClick={() => deleteRoomUnit(u.id)}
                      className="mt-1 text-[10px] text-stone-400 hover:text-red-500 underline"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB 5: RESTAURANT TABLES LAYOUT ===================== */}
      {activeTab === 'restaurant_tables' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-stone-100 dark:border-stone-800">
              <div>
                <h3 className="text-base font-serif font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <UtensilsCrossed className="w-5 h-5 text-purple-600" />
                  <span>Restaurant Dining Floor Plan & Table Configuration</span>
                </h3>
                <p className="text-xs text-stone-500">
                  Set up dining tables for Waiters and KOT kitchen tickets across Ground-Floor, Courtyard, and Banquet zones.
                </p>
              </div>
            </div>

            <form onSubmit={handleAddTable} className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs items-end">
              <div>
                <label className="block font-semibold mb-1">Table Number</label>
                <input
                  type="text"
                  placeholder="e.g. T-07"
                  value={newTableNumber}
                  onChange={(e) => setNewTableNumber(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Dining Zone</label>
                <select
                  value={newTableZone}
                  onChange={(e) => setNewTableZone(e.target.value as TableZone)}
                  className="w-full p-2.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950"
                >
                  <option value="rooftop">Ground-Floor Garden & Terrace</option>
                  <option value="courtyard">Courtyard Lounge</option>
                  <option value="banquet">Indoor Heritage Banquet</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Seating Capacity (Pax)</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={newTableCapacity}
                  onChange={(e) => setNewTableCapacity(Number(e.target.value))}
                  className="w-full p-2.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 font-mono"
                />
              </div>

              <button
                type="submit"
                className="py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add Dining Table</span>
              </button>
            </form>

            {/* Active Tables Map */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-4 border-t border-stone-100 dark:border-stone-800">
              {restaurantTables.map((tbl) => (
                <div
                  key={tbl.id}
                  className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 text-center space-y-1 text-xs"
                >
                  <div className="font-serif font-bold text-base text-stone-900 dark:text-stone-100">
                    {tbl.tableNumber}
                  </div>
                  <div className="text-[10px] text-stone-400 capitalize font-mono">
                    {tbl.zone === 'rooftop' ? 'Ground-Floor Garden' : tbl.zone} · {tbl.capacity} Pax
                  </div>
                  <div className="text-[10px] text-emerald-600 font-semibold font-mono">
                    {tbl.status}
                  </div>
                  <button
                    type="button"
                    onClick={() => clearTable(tbl.id)}
                    className="text-[10px] text-stone-400 hover:text-red-500 underline block mx-auto mt-1"
                  >
                    Clear / Reset
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB 6: EXCEL / CSV MENU UPLOAD ===================== */}
      {activeTab === 'menu_upload' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4 border-stone-100 dark:border-stone-800">
              <div>
                <h3 className="text-base font-serif font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                  <span>Bulk Restaurant Menu Import via Excel or CSV</span>
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Import entire restaurant menus from Excel spreadsheets (.xlsx, .csv). Prices are stored in USD and dynamically converted to NPR or INR for guests and waiters.
                </p>
              </div>

              <button
                type="button"
                onClick={handleDownloadSampleMenuCsv}
                className="px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 font-semibold text-xs flex items-center gap-2 shrink-0 cursor-pointer shadow-xs"
              >
                <Download className="w-4 h-4 text-amber-600" />
                <span>Download Sample CSV Template</span>
              </button>
            </div>

            {/* Drag & Drop Box */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDropFile}
              onClick={() => fileInputRef.current?.click()}
              className={`p-8 border-2 border-dashed rounded-2xl text-center space-y-3 cursor-pointer transition ${
                isDragOver
                  ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20'
                  : 'border-stone-300 dark:border-stone-700 hover:border-indigo-500 bg-stone-50/50 dark:bg-stone-950/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, .tsv, .txt, .xlsx, .xls"
                onChange={handleFileChange}
                className="hidden"
              />
              <Upload className="w-10 h-10 mx-auto text-indigo-500" />
              <div>
                <div className="font-semibold text-stone-900 dark:text-stone-100 text-sm">
                  {uploadFileName ? `Loaded: ${uploadFileName}` : 'Drop your Excel (.xlsx) or CSV file here, or browse'}
                </div>
                <p className="text-xs text-stone-500 mt-1">
                  Supported formats: CSV, TSV, or spreadsheet exports with columns: Dish Name, Category, Description, Price, Spicy, Veg, Chef Special, Prep Time.
                </p>
              </div>
            </div>

            {/* Parsed Rows Preview Table */}
            {parsedDishes.length > 0 && (
              <div className="space-y-4 pt-2">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="font-serif font-bold text-sm text-stone-900 dark:text-stone-100">
                      Parsed Dishes Preview ({parsedDishes.length} rows ready)
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-mono font-bold">
                      Verified
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1.5">
                      <label className="font-semibold text-stone-600 dark:text-stone-400">Import Mode:</label>
                      <select
                        value={menuImportMode}
                        onChange={(e) => setMenuImportMode(e.target.value as any)}
                        className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950"
                      >
                        <option value="append">Append to Existing Menu</option>
                        <option value="replace">Replace Entire Menu</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={handleConfirmBatchImport}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow cursor-pointer flex items-center gap-1.5"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Commit {parsedDishes.length} Dishes to Catalog</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto border border-stone-200 dark:border-stone-800 rounded-xl max-h-64">
                  <table className="w-full text-left text-xs text-stone-600 dark:text-stone-300">
                    <thead className="bg-stone-50 dark:bg-stone-800 text-[11px] uppercase tracking-wider font-mono sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3">Dish Name</th>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3">Description</th>
                        <th className="py-2.5 px-3 font-mono">Price (USD)</th>
                        <th className="py-2.5 px-3 font-mono">Converted ({currentCurrency})</th>
                        <th className="py-2.5 px-3 text-center">Flags</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                      {parsedDishes.map((dish, idx) => (
                        <tr key={idx} className="hover:bg-stone-50/50">
                          <td className="py-2 px-3 font-semibold text-stone-900 dark:text-stone-100">{dish.name}</td>
                          <td className="py-2 px-3 font-mono text-[10px] text-amber-700 dark:text-amber-400">{dish.category}</td>
                          <td className="py-2 px-3 max-w-xs truncate text-[11px] text-stone-500">{dish.description}</td>
                          <td className="py-2 px-3 font-mono font-bold">${dish.priceUSD.toFixed(2)}</td>
                          <td className="py-2 px-3 font-mono font-bold text-amber-700 dark:text-amber-400">
                            {formatCurrency(convertPrice(dish.priceUSD, currentCurrency, themeConfig.exchangeRates), currentCurrency)}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <div className="flex items-center justify-center gap-1 text-[10px]">
                              {dish.isVegetarian && <Leaf className="w-3.5 h-3.5 text-emerald-600" />}
                              {dish.isSpicy && <Flame className="w-3.5 h-3.5 text-red-500" />}
                              {dish.isChefSpecial && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================== TAB 7: STAFF ADDITIONS & RBAC ===================== */}
      {activeTab === 'staff_roles' && (
        <div className="space-y-6">
          <form onSubmit={handleAddStaffMember} className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-stone-100 dark:border-stone-800">
              <h3 className="text-base font-serif font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Users className="w-5 h-5 text-teal-600" />
                <span>Add Initial Hotel Staff & Assign Role</span>
              </h3>
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow cursor-pointer"
              >
                + Register Staff
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Maya Gurung"
                  value={newStaffMember.name}
                  onChange={(e) => setNewStaffMember({ ...newStaffMember, name: e.target.value })}
                  required
                  className="w-full p-2.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Login Username</label>
                <input
                  type="text"
                  placeholder="maya.reception"
                  value={newStaffMember.username}
                  onChange={(e) => setNewStaffMember({ ...newStaffMember, username: e.target.value })}
                  required
                  className="w-full p-2.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Password (min 8 chars)</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="Minimum 8 characters"
                  value={newStaffMember.password}
                  onChange={(e) => setNewStaffMember({ ...newStaffMember, password: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Work Email</label>
                <input
                  type="email"
                  placeholder="maya@hotel.com"
                  value={newStaffMember.email}
                  onChange={(e) => setNewStaffMember({ ...newStaffMember, email: e.target.value })}
                  required
                  className="w-full p-2.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="+977-9812345678"
                  value={newStaffMember.phone}
                  onChange={(e) => setNewStaffMember({ ...newStaffMember, phone: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">RBAC System Role</label>
                <select
                  value={newStaffMember.role}
                  onChange={(e) => setNewStaffMember({ ...newStaffMember, role: e.target.value as StaffRole })}
                  className="w-full p-2.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950"
                >
                  <option value="receptionist">Receptionist (Front Desk & Room Assignment)</option>
                  <option value="hotel_manager">Hotel Operations Manager</option>
                  <option value="restaurant_owner">Restaurant Owner</option>
                  <option value="chef">Head Chef (Kitchen KDS)</option>
                  <option value="waiter">Waiter (POS & Dine-in Tables)</option>
                  <option value="housekeeping">Housekeeping & Inspector</option>
                  <option value="admin">Hotel Admin</option>
                  <option value="super_admin">Super Admin (Platform Owner)</option>
                </select>
              </div>
            </div>
          </form>

          {/* Existing Staff Table */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 shadow-sm space-y-3">
            <h4 className="font-serif font-bold text-sm text-stone-900 dark:text-stone-100">
              Active Registered Staff ({staff.length} accounts)
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-600 dark:text-stone-300">
                <thead className="bg-stone-50 dark:bg-stone-800 text-[11px] uppercase tracking-wider font-mono">
                  <tr>
                    <th className="py-2.5 px-3">Name</th>
                    <th className="py-2.5 px-3">Role</th>
                    <th className="py-2.5 px-3">Username</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                  {staff.map((member) => (
                    <tr key={member.id} className="hover:bg-stone-50/50">
                      <td className="py-2 px-3 font-semibold text-stone-900 dark:text-stone-100">{member.name}</td>
                      <td className="py-2 px-3">
                        <span className="px-2 py-0.5 rounded font-mono text-[10px] uppercase font-bold bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                          {member.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-mono text-stone-500">{member.username}</td>
                      <td className="py-2 px-3 text-stone-500">{member.department}</td>
                      <td className="py-2 px-3 text-right">
                        {member.role !== 'super_admin' && (
                          <button
                            type="button"
                            onClick={() => deleteStaff(member.id)}
                            className="text-stone-400 hover:text-red-500"
                          >
                            <Trash2 className="w-3.5 h-3.5 ml-auto" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

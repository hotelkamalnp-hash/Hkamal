import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  CalendarCheck,
  ConciergeBell,
  Sparkles,
  UtensilsCrossed,
  ChefHat,
  BarChart3,
  ShieldCheck,
  ArrowRight,
  Key,
  CheckCircle2,
} from 'lucide-react';
import { useHotel } from '../../context/HotelContext';

interface OperationsGuidePanelProps {
  onNavigateTab: (tab: string) => void;
}

interface RoleWorkflow {
  id: string;
  roleTitle: string;
  subtitle: string;
  targetTab?: string;
  targetTabLabel?: string;
  icon: React.ReactNode;
  steps: {
    step: string;
    title: string;
    detail: string;
  }[];
}

const WORKFLOW_GUIDES: RoleWorkflow[] = [
  {
    id: 'guest_journey',
    roleTitle: 'Guest Booking & Pre-Arrival',
    subtitle: 'Public Website -> Live Availability -> OTP Verification -> Confirmation & Voucher',
    icon: <CalendarCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
    steps: [
      {
        step: '01',
        title: 'Search Dates & Choose Suite',
        detail:
          'Guest selects Check-In, Check-Out, and Guest count in the Availability Bar, then picks any available suite from Cards or the 2D Floor Plan.',
      },
      {
        step: '02',
        title: 'Enter Contact Details & Verify Email OTP',
        detail:
          'In Step 1 of the booking modal, enter guest details, apply optional promo code (e.g. HIMALAYA10), click Send Verification Code, and confirm the 6-digit email OTP.',
      },
      {
        step: '03',
        title: 'Confirm Payment & Download Voucher',
        detail:
          'In Step 2, choose Pay at Check-In (Hotel Desk), eSewa, Khalti, or Card Checkout. Server locks inventory atomically, emails the branded confirmation, and unlocks Print & PDF Voucher download.',
      },
    ],
  },
  {
    id: 'reception',
    roleTitle: 'Receptionist / Front Desk',
    subtitle: 'Online Reservations -> Room Allocation -> Check-In Keycard -> Folio & Check-Out',
    targetTab: 'reception',
    targetTabLabel: 'Open Front Desk',
    icon: <ConciergeBell className="w-4 h-4 text-sky-600 dark:text-sky-400" />,
    steps: [
      {
        step: '01',
        title: 'Spot New Reservations Instantly',
        detail:
          'New bookings trigger an audible/header alert and appear at the top of Front Desk -> Reservations & Arrivals.',
      },
      {
        step: '02',
        title: 'Assign Physical Room & Check In Guest',
        detail:
          'Select a Vacant Clean unit from the Room dropdown (or click Check In & Issue Keycard). The system marks the unit occupied, creates the Guest Folio, and generates a 4-digit PIN + scannable QR keycard.',
      },
      {
        step: '03',
        title: 'Walk-Ins, Incidentals & Check-Out',
        detail:
          'Use Walk-In Registration (GRC) for direct arrivals, Post Incidentals for laundry/airport transfers, print or download the IRD-ready Tax Invoice, collect balance payment, and check out (auto-flags room Dirty for Housekeeping).',
      },
    ],
  },
  {
    id: 'in_house_guest',
    roleTitle: 'In-House Guest Room Portal',
    subtitle: 'Room PIN / QR Scan -> Room Service -> Digital Door Key -> Express Checkout',
    icon: <Key className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
    steps: [
      {
        step: '01',
        title: 'Sign In via Room + 4-Digit PIN or QR Code',
        detail:
          'Click In-Room in the top header (or scan the printed QR Keycard issued by Reception) to access the private room dashboard.',
      },
      {
        step: '02',
        title: 'Order Food, Amenities & Wake-Up Calls',
        detail:
          'Order Ground-Floor Dining straight to the room folio, request extra towels/housekeeping, schedule a wake-up alarm, or chat live with Front Desk.',
      },
      {
        step: '03',
        title: 'Review Live Folio & Unlock Door',
        detail:
          'View real-time room + dining charges before check-out and use the Digital Keycard tab with live unlock telemetry.',
      },
    ],
  },
  {
    id: 'dining_kitchen',
    roleTitle: 'Waiter, Chef & Restaurant Owner',
    subtitle: 'Table POS / In-Room Order -> Kitchen Display (KDS) -> Folio Posting',
    targetTab: 'waiter_pos',
    targetTabLabel: 'Open Waiter POS',
    icon: <UtensilsCrossed className="w-4 h-4 text-orange-600 dark:text-orange-400" />,
    steps: [
      {
        step: '01',
        title: 'Take Dine-In or Confirm Room Orders',
        detail:
          'Waiters seat tables or confirm incoming In-Room dining requests inside Waiter POS & Dine-in Tables, routing tickets straight to the Kitchen.',
      },
      {
        step: '02',
        title: 'Prepare Tickets in Kitchen Display (KDS)',
        detail:
          'Head Chef works live tickets in Kitchen Display (KDS): transition tickets from Placed -> Preparing -> Ready for Delivery -> Delivered.',
      },
      {
        step: '03',
        title: 'Settle Table or Post to Room Folio',
        detail:
          'Restaurant Owner & Waiter settle cash/QR bills with POS slip printing, or post charges directly onto the guest master folio for checkout settlement.',
      },
    ],
  },
  {
    id: 'housekeeping',
    roleTitle: 'Housekeeping & Maintenance',
    subtitle: 'Turnover Queue -> Dirty to Inspected -> Linen Stock & Maintenance',
    targetTab: 'housekeeping',
    targetTabLabel: 'Open Housekeeping',
    icon: <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />,
    steps: [
      {
        step: '01',
        title: 'Monitor Checkout Turnovers & Amenity Requests',
        detail:
          'View newly checked-out rooms flagged Dirty or Express Turnover priorities plus pending guest requests in Service Requests.',
      },
      {
        step: '02',
        title: 'Update Room Cleanliness State',
        detail:
          'Move each unit cleanly from Dirty -> In Progress -> Clean -> Inspected. Front Desk immediately sees Inspected rooms ready for new arrivals.',
      },
      {
        step: '03',
        title: 'Log Lost & Found, Minibar & Maintenance',
        detail:
          'Record guest forgotten items in Lost & Found, track floor linen supplies, and raise Maintenance tickets with priority tags.',
      },
    ],
  },
  {
    id: 'management_accounting',
    roleTitle: 'Hotel Manager, Accounting & Night Audit',
    subtitle: 'Daily KPIs -> Payment Reconciliation -> Night Audit -> IRD Tax Ledger',
    targetTab: 'night_audit',
    targetTabLabel: 'Open Night Audit',
    icon: <BarChart3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />,
    steps: [
      {
        step: '01',
        title: 'Review Revenue, ADR & Occupancy Trends',
        detail:
          'Monitor live Occupancy, ADR, RevPAR, and category performance under Overview & KPIs and Accounting & P&L.',
      },
      {
        step: '02',
        title: 'Track OPEX & Reconcile Gateways',
        detail:
          'Record vendor/utility expenses, audit paid eSewa/Khalti/Stripe transactions, and process partial or full refunds cleanly from Billing & Folios.',
      },
      {
        step: '03',
        title: 'Execute End-of-Day Night Audit Close',
        detail:
          'Open Night Audit & Day Close to verify unposted room charges, balance cash & digital tenders, generate daily ledger snapshots, and inspect IRD CBMS readiness.',
      },
    ],
  },
  {
    id: 'admin_superadmin',
    roleTitle: 'Admin & Super Admin Controls',
    subtitle: 'CMS & Rates -> Staff RBAC -> SMTP & R2 Media -> Supabase & Backups',
    targetTab: 'cms',
    targetTabLabel: 'Open CMS & Rates',
    icon: <ShieldCheck className="w-4 h-4 text-rose-600 dark:text-rose-400" />,
    steps: [
      {
        step: '01',
        title: 'Customize Website & Seasonal Pricing',
        detail:
          'Use CMS Page & Rates Editor and Hero & Photos CMS to update headlines, toggle sections, configure promo codes, and adjust NPR/INR/USD exchange rates or seasonal multipliers.',
      },
      {
        step: '02',
        title: 'Manage Staff Accounts & RBAC',
        detail:
          'In Staff & RBAC, create accounts, assign roles, rotate passwords, and review shift schedules cleanly with full audit logging.',
      },
      {
        step: '03',
        title: 'Configure SMTP, R2 Media & Backups',
        detail:
          'Configure server-side SMTP credentials for OTP/confirmation delivery, connect Cloudflare R2 presigned uploads, and inspect system health under Supabase Backend & DB.',
      },
    ],
  },
];

export const OperationsGuidePanel: React.FC<OperationsGuidePanelProps> = ({ onNavigateTab }) => {
  const { activeRole } = useHotel();
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');

  const visibleGuides = useMemo(() => {
    if (selectedRoleFilter === 'all') return WORKFLOW_GUIDES;
    return WORKFLOW_GUIDES.filter((g) => g.id === selectedRoleFilter);
  }, [selectedRoleFilter]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-stone-200 dark:border-stone-800">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-amber-800 dark:text-amber-400 uppercase tracking-wider">
              <BookOpen className="w-3.5 h-3.5" />
              <span>End-to-End Platform Handbook</span>
            </div>
            <h3 className="mt-1 text-xl font-serif font-semibold text-stone-900 dark:text-stone-50">
              Hotel Kamal Step-by-Step Operations Guide
            </h3>
            <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
              Clear operational workflow for every designate — signed in as{' '}
              <span className="font-semibold text-stone-800 dark:text-stone-200 capitalize">
                {activeRole.replace('_', ' ')}
              </span>.
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedRoleFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                selectedRoleFilter === 'all'
                  ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
              }`}
            >
              All Designates (7)
            </button>
            {WORKFLOW_GUIDES.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setSelectedRoleFilter(g.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  selectedRoleFilter === g.id
                    ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                }`}
              >
                {g.roleTitle.split('/')[0].trim()}
              </button>
            ))}
          </div>
        </div>

        {/* End-to-End Lifecycle Summary Strip */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-[11px]">
          {[
            '1. Guest Books Online',
            '2. OTP + Voucher Sent',
            '3. Reception Check-In',
            '4. Guest Room Portal',
            '5. Waiter POS & KDS',
            '6. Housekeeping Clean',
            '7. Folio & Night Audit',
          ].map((stage) => (
            <div
              key={stage}
              className="px-2.5 py-2 rounded-lg bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-800 text-stone-700 dark:text-stone-300 font-medium flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="truncate">{stage}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Role Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {visibleGuides.map((guide) => (
          <section
            key={guide.id}
            className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-6 flex flex-col justify-between space-y-5"
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3 pb-4 border-b border-stone-100 dark:border-stone-800">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-stone-100 dark:bg-stone-800 shrink-0 mt-0.5">
                    {guide.icon}
                  </div>
                  <div>
                    <h4 className="font-serif font-semibold text-base text-stone-900 dark:text-stone-50">
                      {guide.roleTitle}
                    </h4>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                      {guide.subtitle}
                    </p>
                  </div>
                </div>

                {guide.targetTab && guide.targetTabLabel && (
                  <button
                    type="button"
                    onClick={() => onNavigateTab(guide.targetTab!)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-900 text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span>{guide.targetTabLabel}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="space-y-3.5">
                {guide.steps.map((item) => (
                  <div key={item.step} className="flex items-start gap-3">
                    <span className="text-xs font-mono font-semibold text-amber-800 dark:text-amber-400 pt-0.5 shrink-0 tabular-nums">
                      {item.step}.
                    </span>
                    <div className="space-y-0.5">
                      <div className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                        {item.title}
                      </div>
                      <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                        {item.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};

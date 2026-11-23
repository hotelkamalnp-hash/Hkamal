import React, { useState, useEffect } from 'react';
import { useHotel } from '../context/HotelContext';
import { getThemeClasses } from '../utils/theme';
import { StaffRole } from '../types/hotel';
import { 
  Lock, 
  User, 
  X, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Sparkles,
  Database,
  Briefcase,
  Building2,
  Utensils,
  Coffee,
  Check
} from 'lucide-react';
import { useModalDismiss, ModalDismissButton } from './Common/ModalDismissHandler';
import kamalLogo from '../assets/images/kamal_hotel_logo_1794545954396.jpg';

interface StaffLoginModalProps {
  onSuccess?: () => void;
}

export const StaffLoginModal: React.FC<StaffLoginModalProps> = ({ onSuccess }) => {
  const { 
    isLoginModalOpen, 
    closeLoginModal, 
    loginStaff, 
    loginModalTargetRole,
    themeConfig,
    backendConnected,
    staff 
  } = useHotel();

  const hasSupabaseClientConfig = Boolean(
    (themeConfig.supabaseUrl || import.meta.env.VITE_SUPABASE_URL) &&
      (themeConfig.supabaseAnonKey || import.meta.env.VITE_SUPABASE_ANON_KEY)
  );

  const themeClasses = getThemeClasses(themeConfig.palette);

  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Dev-only username shortcuts (zero passwords stored in frontend code)
  const devRoleUsernames: { role: StaffRole; label: string; user: string; icon: React.ReactNode }[] = [
    { role: 'super_admin', label: 'Super Admin', user: 'superadmin', icon: <ShieldCheck className="w-3.5 h-3.5 text-[#96682E] dark:text-[#D4A76A]" /> },
    { role: 'admin', label: 'Hotel Admin', user: 'admin', icon: <ShieldCheck className="w-3.5 h-3.5 text-[#96682E] dark:text-[#D4A76A]" /> },
    { role: 'hotel_manager', label: 'Hotel Manager', user: 'manager', icon: <Briefcase className="w-3.5 h-3.5 text-[#96682E] dark:text-[#D4A76A]" /> },
    { role: 'restaurant_owner', label: 'Restaurant Owner', user: 'owner', icon: <Utensils className="w-3.5 h-3.5 text-[#96682E] dark:text-[#D4A76A]" /> },
    { role: 'receptionist', label: 'Receptionist', user: 'receptionist', icon: <Building2 className="w-3.5 h-3.5 text-[#96682E] dark:text-[#D4A76A]" /> },
    { role: 'chef', label: 'Head Chef', user: 'chef', icon: <Utensils className="w-3.5 h-3.5 text-[#96682E] dark:text-[#D4A76A]" /> },
    { role: 'waiter', label: 'Service / Waiter', user: 'waiter', icon: <Coffee className="w-3.5 h-3.5 text-[#96682E] dark:text-[#D4A76A]" /> },
    { role: 'housekeeping', label: 'Housekeeping', user: 'housekeeping', icon: <Check className="w-3.5 h-3.5 text-[#96682E] dark:text-[#D4A76A]" /> },
  ];

  // Clear stale password on modal open; in dev mode only prefill target username if requested
  useEffect(() => {
    setPassword('');
    if (import.meta.env.DEV && loginModalTargetRole) {
      const target = devRoleUsernames.find((a) => a.role === loginModalTargetRole);
      setUsernameOrEmail(target ? target.user : '');
    } else if (isLoginModalOpen) {
      setUsernameOrEmail('');
    }
    setErrorMessage('');
  }, [loginModalTargetRole, isLoginModalOpen]);

  useModalDismiss({
    isOpen: isLoginModalOpen,
    onClose: closeLoginModal,
  });

  if (!isLoginModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    const res = await loginStaff(usernameOrEmail, password);
    setIsSubmitting(false);

    if (res.success) {
      setPassword('');
      closeLoginModal();
      if (onSuccess) onSuccess();
    } else {
      setErrorMessage(res.message);
    }
  };

  const handleSelectDevUsername = (user: string) => {
    setUsernameOrEmail(user);
    setErrorMessage('');
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-[#14110E]/75 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeLoginModal();
      }}
    >
      <div className="bg-white dark:bg-[#171411] rounded-2xl max-w-md w-full max-h-[88vh] flex flex-col border border-[#E6DFD3] dark:border-[#2A241E] shadow-2xl overflow-hidden animate-fade-in">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#F5EFE6] dark:bg-[#1D1813] border-b border-[#E6DFD3] dark:border-[#2A241E] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl overflow-hidden bg-[#FAF7F2] border border-[#C69553]/40 shadow-xs shrink-0 flex items-center justify-center">
              <img
                src={kamalLogo}
                alt={`${themeConfig.hotelName} Himalayan emblem`}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-[#1A1714] dark:text-[#F4EFE6]">
                {themeConfig.hotelName} Staff Portal
              </h3>
              <div className="text-[11px] text-[#6B6258] dark:text-[#AFA699] font-mono flex items-center gap-1">
                <Lock className="w-3 h-3 text-[#96682E] dark:text-[#D4A76A] shrink-0" />
                <span>Kamalpokhari, Kathmandu · Role Access</span>
              </div>
            </div>
          </div>

          <ModalDismissButton onClose={closeLoginModal} ariaLabel="Close staff sign-in dialog" />
        </div>

        {/* Connection & Auth Mode status strip */}
        {backendConnected && themeConfig.supabaseConnected ? (
          <div className="px-5 py-2 bg-emerald-50 dark:bg-emerald-950/30 border-b border-emerald-100 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between shrink-0">
            <span className="flex items-center gap-1.5 font-medium">
              <Database className="w-3.5 h-3.5" />
              <span>Supabase Cloud Auth &amp; Server DB Active</span>
            </span>
            <span className="font-mono text-[10px]">Full-Stack Mode</span>
          </div>
        ) : !backendConnected && hasSupabaseClientConfig ? (
          <div className="px-5 py-2 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-300 text-[11px] flex items-center justify-between shrink-0">
            <span className="flex items-center gap-1.5 font-medium">
              <Database className="w-3.5 h-3.5 shrink-0" />
              <span>Static Host Mode — Sign in with Supabase Staff Email</span>
            </span>
            <span className="font-mono text-[10px]">Direct Auth</span>
          </div>
        ) : !backendConnected && !hasSupabaseClientConfig ? (
          <div className="px-5 py-2 bg-rose-50 dark:bg-rose-950/30 border-b border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-300 text-[11px] shrink-0">
            Static host detected with no Node.js backend or VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY in build. Configure GitHub Secrets &amp; redeploy, or deploy to cPanel Node.js.
          </div>
        ) : null}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
          {errorMessage && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 rounded-lg">
              {errorMessage}
            </div>
          )}

          <div>
            <label className="block font-semibold text-[#3C352E] dark:text-[#D7CFC3] mb-1">
              Username or Official Email
            </label>
            <div className="relative">
              <input
                type="text"
                autoComplete="username"
                value={usernameOrEmail}
                onChange={(e) => setUsernameOrEmail(e.target.value)}
                placeholder="Enter username or official staff email"
                required
                className="w-full bg-[#FAF7F2] dark:bg-[#211B16] border border-[#E6DFD3] dark:border-[#342C24] rounded-md pl-9 pr-3 py-2 text-xs font-medium text-[#1A1714] dark:text-[#F4EFE6] focus:outline-none focus:ring-1 focus:ring-[#96682E]"
              />
              <User className="w-4 h-4 text-[#8E8477] absolute left-3 top-2.5" />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#3C352E] dark:text-[#D7CFC3] mb-1">
              Staff Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your staff password"
                required
                className="w-full bg-[#FAF7F2] dark:bg-[#211B16] border border-[#E6DFD3] dark:border-[#342C24] rounded-md pl-9 pr-10 py-2 text-xs font-mono font-medium text-[#1A1714] dark:text-[#F4EFE6] focus:outline-none focus:ring-1 focus:ring-[#96682E]"
              />
              <Lock className="w-4 h-4 text-[#8E8477] absolute left-3 top-2.5" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-[#8E8477] hover:text-[#1A1714] dark:hover:text-[#F4EFE6]"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Dev-only username picker (zero passwords embedded; stripped in production builds) */}
          {import.meta.env.DEV && (
            <div className="pt-2">
              <span className="block text-[11px] font-semibold text-[#6B6258] dark:text-[#AFA699] mb-1.5 uppercase tracking-wider font-mono">
                Dev Role Usernames (Password Required):
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {devRoleUsernames.map((acc) => (
                  <button
                    key={acc.role}
                    type="button"
                    onClick={() => handleSelectDevUsername(acc.user)}
                    className={`p-2 rounded-lg border text-left transition-all flex items-center gap-2 ${
                      usernameOrEmail === acc.user
                        ? 'border-[#96682E] bg-[#FAF3E6] dark:bg-[#261E14] text-[#1A1714] dark:text-[#F4EFE6] font-semibold'
                        : 'border-[#E6DFD3] dark:border-[#2A241E] text-[#5C544B] dark:text-[#AFA699] hover:bg-[#FAF7F2] dark:hover:bg-[#211B16]'
                    }`}
                  >
                    <div className="shrink-0">{acc.icon}</div>
                    <div className="truncate">
                      <div className="text-[11px] font-medium leading-tight">{acc.label}</div>
                      <div className="text-[10px] text-[#8E8477] font-mono truncate">{acc.user}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="pt-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-2.5 px-4 rounded-lg font-semibold text-xs uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2 ${
                isSubmitting ? 'opacity-70 cursor-wait' : themeClasses.primary
              }`}
            >
              <span>{isSubmitting ? 'Verifying Credentials...' : 'Sign In to Operations Console'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Footer info */}
        <div className="px-6 py-3 bg-[#FAF7F2] dark:bg-[#1D1813] border-t border-[#E6DFD3] dark:border-[#2A241E] text-[11px] text-[#6B6258] dark:text-[#AFA699] flex items-center justify-between">
          <span>Kamal Hotel RBAC Security</span>
          <span className="font-mono text-[10px]">Session: Encrypted</span>
        </div>

      </div>
    </div>
  );
};

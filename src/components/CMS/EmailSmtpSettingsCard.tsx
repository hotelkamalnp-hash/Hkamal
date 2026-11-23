import React, { useEffect, useState } from 'react';
import { useHotel } from '../../context/HotelContext';
import { SmtpConfig } from '../../types/hotel';
import { getThemeClasses } from '../../utils/theme';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Mail,
  RefreshCw,
  Save,
  Send,
  ShieldCheck,
} from 'lucide-react';

type SmtpPreset = NonNullable<SmtpConfig['providerPreset']>;

const SMTP_PRESETS: {
  id: SmtpPreset;
  label: string;
  host: string;
  port: number;
  encryption: SmtpConfig['encryption'];
  defaultUser?: string;
  hint: string;
}[] = [
  {
    id: 'gmail',
    label: 'Gmail / Workspace',
    host: 'smtp.gmail.com',
    port: 587,
    encryption: 'tls',
    hint: 'Use your full Gmail address and a 16-character Google App Password (2-Step Verification required).',
  },
  {
    id: 'sendgrid',
    label: 'SendGrid',
    host: 'smtp.sendgrid.net',
    port: 587,
    encryption: 'tls',
    defaultUser: 'apikey',
    hint: 'Set Username to "apikey" and Password to your SendGrid API key (SG.xxx).',
  },
  {
    id: 'resend',
    label: 'Resend',
    host: 'smtp.resend.com',
    port: 465,
    encryption: 'ssl',
    defaultUser: 'resend',
    hint: 'Set Username to "resend" and Password to your Resend API key (re_xxx).',
  },
  {
    id: 'outlook',
    label: 'Outlook / Microsoft 365',
    host: 'smtp.office365.com',
    port: 587,
    encryption: 'tls',
    hint: 'Use your Microsoft 365 email address and an SMTP-enabled password or app password.',
  },
  {
    id: 'custom',
    label: 'Custom SMTP',
    host: '',
    port: 587,
    encryption: 'tls',
    hint: 'Connect any custom domain cPanel, Zoho, Postmark, Mailgun, or AWS SES SMTP relay.',
  },
];

export const EmailSmtpSettingsCard: React.FC = () => {
  const { smtpConfig, updateSmtpConfig, testSmtpConnection, themeConfig } = useHotel();
  const themeClasses = getThemeClasses(themeConfig.palette);

  const [draft, setDraft] = useState<SmtpConfig>(() => ({ ...smtpConfig }));
  const [showPassword, setShowPassword] = useState(false);
  const [testEmailTarget, setTestEmailTarget] = useState(
    smtpConfig.senderEmail || themeConfig.contactEmail || 'hotelkamal.np@gmail.com'
  );
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    setDraft((prev) => ({
      ...smtpConfig,
      ...prev,
      smtpPassword: '',
      hasStoredPassword: smtpConfig.hasStoredPassword,
      lastTestedAt: smtpConfig.lastTestedAt,
      lastTestStatus: smtpConfig.lastTestStatus,
      lastTestMessage: smtpConfig.lastTestMessage,
      isConfigured: smtpConfig.isConfigured,
    }));
  }, [smtpConfig]);

  const editableKeys: (keyof SmtpConfig)[] = [
    'providerPreset',
    'smtpHost',
    'smtpPort',
    'smtpUser',
    'smtpPassword',
    'senderEmail',
    'senderName',
    'replyToEmail',
    'notificationEmail',
    'encryption',
    'sendBookingConfirmationEmail',
    'requireRealEmailOtp',
    'otpExpiryMinutes',
    'emailSubjectPrefix',
  ];

  const isDirty = editableKeys.some((key) => {
    if (key === 'smtpPassword') return Boolean(draft.smtpPassword?.trim());
    return JSON.stringify(draft[key]) !== JSON.stringify(smtpConfig[key]);
  });

  const activePreset =
    SMTP_PRESETS.find((p) => p.id === (draft.providerPreset || 'gmail')) || SMTP_PRESETS[0];

  const handleSelectPreset = (presetId: SmtpPreset) => {
    const preset = SMTP_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setDraft((prev) => ({
      ...prev,
      providerPreset: presetId,
      smtpHost: preset.host || prev.smtpHost,
      smtpPort: preset.port,
      encryption: preset.encryption,
      smtpUser: preset.defaultUser ?? prev.smtpUser,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const hasCreds = Boolean(
      draft.smtpHost?.trim() &&
        draft.senderEmail?.trim() &&
        draft.smtpUser?.trim() &&
        (draft.smtpPassword?.trim() || draft.hasStoredPassword)
    );
    const { hasStoredPassword: _ignored, ...payload } = draft;
    await updateSmtpConfig({
      ...payload,
      smtpPassword: draft.smtpPassword?.trim() || undefined,
      smtpPort: Number(draft.smtpPort) || 587,
      otpExpiryMinutes: Number(draft.otpExpiryMinutes) || 10,
      isConfigured: hasCreds && smtpConfig.lastTestStatus === 'success',
    });
    setDraft((prev) => ({ ...prev, smtpPassword: '' }));
  };

  const handleSendTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    const savedPayload: Partial<SmtpConfig> = {
      ...draft,
      smtpPassword: draft.smtpPassword?.trim() || undefined,
      smtpPort: Number(draft.smtpPort) || 587,
      otpExpiryMinutes: Number(draft.otpExpiryMinutes) || 10,
    };
    const res = await testSmtpConnection(testEmailTarget.trim() || draft.senderEmail, savedPayload);
    setDraft((prev) => ({ ...prev, smtpPassword: '' }));
    setTestResult(res);
    setIsTesting(false);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main SMTP & Verification Configuration Form */}
        <form
          onSubmit={handleSave}
          className="lg:col-span-8 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm space-y-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-stone-200 dark:border-stone-800">
            <div>
              <h3 className="text-base sm:text-lg font-serif font-semibold text-stone-900 dark:text-stone-50 flex items-center gap-2">
                <Mail className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                <span>Real Email, SMTP &amp; Verification Settings</span>
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Send real 6-digit OTP verification emails and HTML booking vouchers directly via your mail server.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <span
                className={`text-[11px] font-medium px-2.5 py-1 rounded-md border ${
                  smtpConfig.isConfigured && smtpConfig.lastTestStatus === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                    : 'bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
                }`}
              >
                {smtpConfig.isConfigured && smtpConfig.lastTestStatus === 'success'
                  ? 'SMTP Verified Live'
                  : 'Credentials Pending Test'}
              </span>
              <button
                type="submit"
                className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition cursor-pointer whitespace-nowrap shrink-0 ${
                  isDirty
                    ? themeClasses.primary
                    : 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 hover:opacity-90'
                }`}
              >
                {isDirty ? <Save className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                <span>{isDirty ? 'Save Email Settings' : 'Saved'}</span>
              </button>
            </div>
          </div>

          {/* One-Click Provider Presets */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
              Mail Provider Preset
            </label>
            <div className="flex flex-wrap gap-2">
              {SMTP_PRESETS.map((preset) => {
                const selected = (draft.providerPreset || 'gmail') === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer whitespace-nowrap ${
                      selected
                        ? 'bg-stone-900 text-white border-stone-900 dark:bg-stone-100 dark:text-stone-900 dark:border-stone-100'
                        : 'bg-stone-50 dark:bg-stone-800/60 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-stone-500">{activePreset.hint}</p>
          </div>

          {/* Server Connection Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block font-semibold mb-1 text-stone-700 dark:text-stone-300">
                SMTP Host *
              </label>
              <input
                type="text"
                value={draft.smtpHost}
                onChange={(e) => setDraft({ ...draft, smtpHost: e.target.value })}
                placeholder="smtp.gmail.com"
                required
                className="w-full p-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-mono text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1 text-stone-700 dark:text-stone-300">
                SMTP Port *
              </label>
              <input
                type="number"
                value={draft.smtpPort}
                onChange={(e) => setDraft({ ...draft, smtpPort: Number(e.target.value) })}
                placeholder="587"
                required
                className="w-full p-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-mono text-xs tabular-nums"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1 text-stone-700 dark:text-stone-300">
                Encryption
              </label>
              <select
                value={draft.encryption}
                onChange={(e) =>
                  setDraft({ ...draft, encryption: e.target.value as SmtpConfig['encryption'] })
                }
                className="w-full p-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs"
              >
                <option value="tls">STARTTLS (Port 587)</option>
                <option value="ssl">SSL / TLS (Port 465)</option>
                <option value="none">None / Internal Relay</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1 text-stone-700 dark:text-stone-300">
                SMTP Username / Email *
              </label>
              <input
                type="text"
                value={draft.smtpUser}
                onChange={(e) => setDraft({ ...draft, smtpUser: e.target.value })}
                placeholder="hotelkamal.np@gmail.com"
                className="w-full p-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="block font-semibold text-stone-700 dark:text-stone-300">
                  SMTP Password / App Password *
                </label>
                {smtpConfig.hasStoredPassword && (
                  <span className="text-[10px] font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                    Encrypted Secret Stored on Server
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={draft.smtpPassword || ''}
                  onChange={(e) => setDraft({ ...draft, smtpPassword: e.target.value })}
                  placeholder={
                    smtpConfig.hasStoredPassword
                      ? '•••••••••••• (leave blank to keep encrypted secret)'
                      : '16-character App Password or API secret'
                  }
                  className="w-full p-2.5 pr-10 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600 cursor-pointer"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Sender Identity & Booking Notification Routing */}
          <div className="pt-4 border-t border-stone-200 dark:border-stone-800 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold mb-1 text-stone-700 dark:text-stone-300">
                Sender From Email *
              </label>
              <input
                type="email"
                value={draft.senderEmail}
                onChange={(e) => setDraft({ ...draft, senderEmail: e.target.value })}
                placeholder="hotelkamal.np@gmail.com"
                required
                className="w-full p-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1 text-stone-700 dark:text-stone-300">
                Sender Display Name
              </label>
              <input
                type="text"
                value={draft.senderName}
                onChange={(e) => setDraft({ ...draft, senderName: e.target.value })}
                placeholder="Kamal Hotel Reservations"
                className="w-full p-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1 text-stone-700 dark:text-stone-300">
                Reply-To Email
              </label>
              <input
                type="email"
                value={draft.replyToEmail || ''}
                onChange={(e) => setDraft({ ...draft, replyToEmail: e.target.value })}
                placeholder="hotelkamal.np@gmail.com"
                className="w-full p-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1 text-stone-700 dark:text-stone-300">
                Front Desk BCC Copy Email
              </label>
              <input
                type="email"
                value={draft.notificationEmail || ''}
                onChange={(e) => setDraft({ ...draft, notificationEmail: e.target.value })}
                placeholder="hotelkamal.np@gmail.com"
                className="w-full p-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs"
              />
              <span className="text-[11px] text-stone-400 mt-0.5 block">
                Receives a blind copy of every guest booking confirmation.
              </span>
            </div>

            <div>
              <label className="block font-semibold mb-1 text-stone-700 dark:text-stone-300">
                Verification OTP Expiry (Minutes)
              </label>
              <select
                value={draft.otpExpiryMinutes || 10}
                onChange={(e) =>
                  setDraft({ ...draft, otpExpiryMinutes: Number(e.target.value) })
                }
                className="w-full p-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs"
              >
                <option value={5}>5 Minutes</option>
                <option value={10}>10 Minutes (Recommended)</option>
                <option value={15}>15 Minutes</option>
                <option value={30}>30 Minutes</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1 text-stone-700 dark:text-stone-300">
                Email Subject Prefix
              </label>
              <input
                type="text"
                value={draft.emailSubjectPrefix || ''}
                onChange={(e) => setDraft({ ...draft, emailSubjectPrefix: e.target.value })}
                placeholder="[Kamal Hotel]"
                className="w-full p-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs"
              />
            </div>
          </div>

          {/* Behavioral Toggles */}
          <div className="pt-4 border-t border-stone-200 dark:border-stone-800 space-y-3 text-xs">
            <label className="flex items-start justify-between gap-4 p-3 rounded-lg bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800 cursor-pointer">
              <div>
                <div className="font-semibold text-stone-900 dark:text-stone-100">
                  Auto-send confirmation voucher email on completed booking
                </div>
                <div className="text-[11px] text-stone-500 mt-0.5">
                  Automatically emails a formatted reservation summary to the guest (and BCCs Front Desk).
                </div>
              </div>
              <input
                type="checkbox"
                checked={draft.sendBookingConfirmationEmail !== false}
                onChange={(e) =>
                  setDraft({ ...draft, sendBookingConfirmationEmail: e.target.checked })
                }
                className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
              />
            </label>

            <label className="flex items-start justify-between gap-4 p-3 rounded-lg bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800 cursor-pointer">
              <div>
                <div className="font-semibold text-stone-900 dark:text-stone-100">
                  Strict real-SMTP OTP mode (disable on-screen preview fallback)
                </div>
                <div className="text-[11px] text-stone-500 mt-0.5">
                  When checked, guests can only verify if real SMTP credentials deliver the 6-digit OTP to their inbox.
                </div>
              </div>
              <input
                type="checkbox"
                checked={Boolean(draft.requireRealEmailOtp)}
                onChange={(e) =>
                  setDraft({ ...draft, requireRealEmailOtp: e.target.checked })
                }
                className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
              />
            </label>
          </div>
        </form>

        {/* Right Column: Live Test Email Dispatch & Handshake Diagnostics */}
        <div className="lg:col-span-4 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm space-y-4 h-fit">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-700 dark:text-amber-400" />
            <h4 className="font-serif font-semibold text-base text-stone-900 dark:text-stone-100">
              Send Real Test Email
            </h4>
          </div>
          <p className="text-xs text-stone-500 leading-relaxed">
            Connects directly to your SMTP host, authenticates credentials, and sends a real test email to verify inbox delivery.
          </p>

          <div className="space-y-3">
            <div>
              <label className="block font-semibold mb-1 text-xs text-stone-700 dark:text-stone-300">
                Test Recipient Email
              </label>
              <input
                type="email"
                value={testEmailTarget}
                onChange={(e) => setTestEmailTarget(e.target.value)}
                placeholder="hotelkamal.np@gmail.com"
                className="w-full p-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs"
              />
            </div>

            <button
              type="button"
              disabled={isTesting}
              onClick={handleSendTest}
              className={`w-full py-2.5 px-4 rounded-lg text-xs font-semibold shadow-sm transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 ${themeClasses.primary}`}
            >
              {isTesting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Authenticating &amp; Sending...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Real Test Email</span>
                </>
              )}
            </button>

            {testResult && (
              <div
                className={`p-3 rounded-lg border text-xs space-y-1 ${
                  testResult.success
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                    : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                }`}
              >
                <div className="font-semibold flex items-center gap-1.5">
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{testResult.success ? 'Real Email Delivered' : 'SMTP Error'}</span>
                </div>
                <p className="text-[11px] leading-relaxed break-words">{testResult.message}</p>
              </div>
            )}

            {smtpConfig.lastTestedAt && !testResult && (
              <div className="p-3 rounded-lg bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-[11px] text-stone-500 space-y-1">
                <div className="font-semibold text-stone-700 dark:text-stone-300">
                  Last SMTP Test ({new Date(smtpConfig.lastTestedAt).toLocaleString()})
                </div>
                <div
                  className={
                    smtpConfig.lastTestStatus === 'success'
                      ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                      : 'text-rose-600 dark:text-rose-400 font-medium'
                  }
                >
                  {smtpConfig.lastTestStatus === 'success' ? 'Verified' : 'Failed'}
                </div>
                {smtpConfig.lastTestMessage && (
                  <p className="text-[11px] text-stone-500 break-words">{smtpConfig.lastTestMessage}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  Lock,
  Unlock,
  QrCode,
  ShieldCheck,
  ShieldAlert,
  Clock,
  ScanLine,
  DoorOpen,
} from 'lucide-react';
import { useHotel } from '../../context/HotelContext';
import { DoorUnlockEvent } from '../../types/hotel';

interface DigitalKeycardDoorReaderProps {
  roomNumber: string;
}

export const DigitalKeycardDoorReader: React.FC<DigitalKeycardDoorReaderProps> = ({ roomNumber }) => {
  const { digitalKeycards, doorUnlockLogs, verifyAndUnlockDoor, showToast } = useHotel();

  const qrPreviewCanvasRef = useRef<HTMLCanvasElement>(null);

  const [tokenInput, setTokenInput] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [lockState, setLockState] = useState<'locked' | 'unlocked' | 'denied'>('locked');
  const [relockSeconds, setRelockSeconds] = useState<number>(0);
  const [feedbackMessage, setFeedbackMessage] = useState<string>(
    `Hold your time-bound QR Keycard near the ${roomNumber} door reader or tap Present Active Keycard.`
  );
  const [lastResultCode, setLastResultCode] = useState<DoorUnlockEvent['result'] | null>(null);

  const normalizedTargetDigits = roomNumber.toLowerCase().replace(/room/g, '').replace(/[^a-z0-9]/g, '').trim();

  // Locate the newest keycard matching this guest's room
  const matchingRoomKeycard = useMemo(() => {
    const roomKeys = digitalKeycards.filter(
      (k) =>
        k.roomNumber.toLowerCase().replace(/room/g, '').replace(/[^a-z0-9]/g, '').trim() ===
        normalizedTargetDigits
    );
    return (
      roomKeys.find(
        (k) => k.status === 'active' && new Date(k.expiresAt).getTime() > Date.now()
      ) ||
      roomKeys[0] ||
      null
    );
  }, [digitalKeycards, normalizedTargetDigits]);

  // Render guest's own active QR pass for quick presentation
  useEffect(() => {
    if (!qrPreviewCanvasRef.current || !matchingRoomKeycard) return;
    const payload = JSON.stringify({
      v: 1,
      token: matchingRoomKeycard.keyToken,
      room: matchingRoomKeycard.roomNumber,
      guest: matchingRoomKeycard.guestName,
      scope: matchingRoomKeycard.accessScope,
      iat: matchingRoomKeycard.validFrom,
      exp: matchingRoomKeycard.expiresAt,
    });
    QRCode.toCanvas(
      qrPreviewCanvasRef.current,
      payload,
      {
        width: 148,
        margin: 1,
        color: { dark: '#1c1917', light: '#ffffff' },
      },
      (err) => {
        if (err) console.error('Reader QR preview failed:', err);
      }
    );
  }, [matchingRoomKeycard]);

  // Auto-relock countdown after door unlock
  useEffect(() => {
    if (lockState !== 'unlocked') return;
    if (relockSeconds <= 0) {
      setLockState('locked');
      setFeedbackMessage(`${roomNumber} smart deadbolt automatically re-locked.`);
      return;
    }
    const timer = window.setTimeout(() => setRelockSeconds((prev) => prev - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [lockState, relockSeconds, roomNumber]);

  const runUnlockAttempt = (rawCredential: string) => {
    if (!rawCredential.trim()) {
      setLockState('denied');
      setLastResultCode('denied_invalid');
      setFeedbackMessage('No QR credential supplied. Enter a key token or scan your pass.');
      return;
    }

    setIsScanning(true);
    window.setTimeout(() => {
      const verification = verifyAndUnlockDoor(rawCredential, roomNumber);
      setIsScanning(false);
      setLastResultCode(verification.result);
      setFeedbackMessage(verification.message);

      if (verification.granted) {
        setLockState('unlocked');
        setRelockSeconds(8);
        showToast(`${roomNumber} Unlocked`, 'Smart deadbolt retracted for 8 seconds.', 'success');
      } else {
        setLockState('denied');
        showToast('Door Access Denied', verification.message, 'error');
      }
    }, 350);
  };

  const roomLogs = useMemo(() => {
    return doorUnlockLogs
      .filter(
        (l) =>
          l.roomNumber.toLowerCase().replace(/room/g, '').replace(/[^a-z0-9]/g, '').trim() ===
          normalizedTargetDigits
      )
      .slice(0, 6);
  }, [doorUnlockLogs, normalizedTargetDigits]);

  const timeRemainingText = useMemo(() => {
    if (!matchingRoomKeycard) return 'None issued';
    const diff = new Date(matchingRoomKeycard.expiresAt).getTime() - Date.now();
    if (matchingRoomKeycard.status === 'revoked') return 'Revoked by Reception';
    if (diff <= 0 || matchingRoomKeycard.status === 'expired') return 'Expired';
    const hrs = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    return hrs > 0 ? `${hrs}h ${mins}m remaining` : `${mins}m remaining`;
  }, [matchingRoomKeycard]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
      {/* Left 7 Cols: Hardware Door Lock Reader Simulator */}
      <div className="lg:col-span-7 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 dark:border-stone-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <DoorOpen className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <h3 className="text-lg font-serif font-bold text-stone-900 dark:text-stone-50">
                Smart Door Lock QR Reader · {roomNumber}
              </h3>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Companion optical reader verifying room match, revocation status, and time-bound key expiration in real time.
            </p>
          </div>
        </div>

        {/* Simulated Metallic Hardware Bezel */}
        <div className="rounded-xl bg-stone-950 border border-stone-800 p-5 text-stone-100 space-y-4">
          <div className="flex items-center justify-between border-b border-stone-800 pb-3">
            <div className="font-mono text-xs text-stone-300">
              LOCK UNIT · {roomNumber.toUpperCase()}
            </div>
            <div
              className={`inline-flex items-center gap-1.5 font-mono text-xs font-bold tabular-nums ${
                lockState === 'unlocked'
                  ? 'text-emerald-400'
                  : lockState === 'denied'
                  ? 'text-rose-400'
                  : 'text-amber-400'
              }`}
            >
              {lockState === 'unlocked' ? (
                <>
                  <Unlock className="w-4 h-4" />
                  <span>UNLOCKED · RELOCK IN {relockSeconds}s</span>
                </>
              ) : lockState === 'denied' ? (
                <>
                  <ShieldAlert className="w-4 h-4" />
                  <span>ACCESS DENIED · LOCKED</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>DEADBOLT ENGAGED</span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-5">
            {/* Optical Reader Glass */}
            <div className="w-36 h-36 rounded-xl border border-stone-700 bg-stone-900 flex flex-col items-center justify-center gap-2 shrink-0 relative overflow-hidden">
              <div
                className={`transition-transform duration-200 ${
                  lockState === 'unlocked' ? 'scale-110 text-emerald-400' : isScanning ? 'scale-95 text-amber-400' : 'text-stone-300'
                }`}
              >
                {lockState === 'unlocked' ? (
                  <Unlock className="w-10 h-10" />
                ) : lockState === 'denied' ? (
                  <ShieldAlert className="w-10 h-10 text-rose-400" />
                ) : (
                  <ScanLine className="w-10 h-10" />
                )}
              </div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-stone-400">
                {isScanning
                  ? 'Verifying Token...'
                  : lockState === 'unlocked'
                  ? 'Latch Open'
                  : 'Optical QR Zone'}
              </span>
            </div>

            {/* Verification Message & Direct Scan Input */}
            <div className="flex-1 w-full space-y-3">
              <div
                className={`p-3 rounded-lg border text-xs leading-relaxed ${
                  lockState === 'unlocked'
                    ? 'bg-emerald-950/60 border-emerald-700 text-emerald-200'
                    : lockState === 'denied'
                    ? 'bg-rose-950/60 border-rose-700 text-rose-200'
                    : 'bg-stone-900 border-stone-800 text-stone-300'
                }`}
              >
                <div className="font-semibold mb-0.5">
                  {lockState === 'unlocked'
                    ? 'Door Unlocked — Welcome Inside'
                    : lockState === 'denied'
                    ? `Verification Failed (${lastResultCode?.replace('denied_', '').toUpperCase() || 'DENIED'})`
                    : 'Reader Ready'}
                </div>
                <p className="text-[11px] opacity-90">{feedbackMessage}</p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  runUnlockAttempt(tokenInput);
                }}
                className="flex flex-col sm:flex-row gap-2"
              >
                <input
                  type="text"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="Paste QR JSON payload or Key Token (e.g. DK-302-9F4A2C)"
                  className="flex-1 px-3 py-2 rounded-lg bg-stone-900 border border-stone-700 text-stone-100 placeholder-stone-500 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <button
                  type="submit"
                  disabled={isScanning}
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-semibold inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>{isScanning ? 'Scanning...' : 'Scan & Unlock'}</span>
                </button>
              </form>
            </div>
          </div>

          {/* Quick Scenario Verification Helpers */}
          <div className="pt-2 border-t border-stone-800 flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <span className="text-stone-400">Simulate other QR tokens against {roomNumber}:</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {digitalKeycards.slice(0, 3).map((dk) => (
                <button
                  key={dk.id}
                  type="button"
                  onClick={() => {
                    setTokenInput(dk.keyToken);
                    runUnlockAttempt(dk.keyToken);
                  }}
                  className="px-2.5 py-1 rounded-md bg-stone-800 hover:bg-stone-700 text-stone-200 font-mono transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Test {dk.keyToken}
                </button>
              ))}
              {lockState === 'unlocked' && (
                <button
                  type="button"
                  onClick={() => {
                    setLockState('locked');
                    setRelockSeconds(0);
                    setFeedbackMessage(`${roomNumber} manually re-locked by guest.`);
                  }}
                  className="px-2.5 py-1 rounded-md bg-stone-800 hover:bg-stone-700 text-amber-300 font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Re-Lock Now
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right 5 Cols: Active Wallet QR Pass + Recent Room Door Events */}
      <div className="lg:col-span-5 space-y-4">
        <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
            <h4 className="font-serif font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Your Active Room QR Pass</span>
            </h4>
            <span className="font-mono text-[11px] text-stone-500 flex items-center gap-1 tabular-nums">
              <Clock className="w-3 h-3" />
              <span>{timeRemainingText}</span>
            </span>
          </div>

          {matchingRoomKeycard ? (
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="p-2 bg-white rounded-lg border border-stone-200 shrink-0">
                <canvas ref={qrPreviewCanvasRef} className="block rounded" />
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <div>
                  <div className="text-[11px] text-stone-500 dark:text-stone-400">Issued Token</div>
                  <div className="font-mono font-bold text-sm text-amber-800 dark:text-amber-300 break-all">
                    {matchingRoomKeycard.keyToken}
                  </div>
                </div>
                <div className="text-[11px] text-stone-600 dark:text-stone-400 tabular-nums">
                  Valid until {new Date(matchingRoomKeycard.expiresAt).toLocaleString()}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTokenInput(matchingRoomKeycard.keyToken);
                    runUnlockAttempt(matchingRoomKeycard.keyToken);
                  }}
                  className="w-full py-2 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Present Keycard to Unlock Door</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-lg border border-dashed border-stone-300 dark:border-stone-700 text-stone-500 text-center">
              No QR keycard has been issued for {roomNumber} yet. Ask Reception to generate a time-bound Digital Keycard.
            </div>
          )}
        </div>

        {/* Recent Door Access Attempts for this Room */}
        <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-5 space-y-3">
          <h4 className="font-serif font-bold text-sm text-stone-900 dark:text-stone-100">
            Recent Door Access Activity ({roomNumber})
          </h4>
          {roomLogs.length === 0 ? (
            <div className="text-stone-500 text-[11px]">No unlock scans recorded for this room yet.</div>
          ) : (
            <div className="divide-y divide-stone-100 dark:divide-stone-800">
              {roomLogs.map((log) => (
                <div key={log.id} className="py-2 flex items-start justify-between gap-2 text-[11px]">
                  <div className="min-w-0">
                    <div
                      className={`font-semibold ${
                        log.result === 'granted'
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-rose-700 dark:text-rose-400'
                      }`}
                    >
                      {log.result === 'granted' ? 'Unlocked' : 'Denied'} · {log.keyToken}
                    </div>
                    <div className="text-stone-500 truncate">{log.reason}</div>
                  </div>
                  <span className="font-mono text-stone-400 shrink-0 tabular-nums">
                    {log.timestamp.slice(11)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

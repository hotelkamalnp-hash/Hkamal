import nodemailer from 'nodemailer';
import {
  listCollection,
  listDueNotificationJobs,
  updateNotificationJobStatus,
  upsertCollectionItem,
  type PersistentNotificationJob,
} from './db.ts';
import { getServerSmtpSettings } from './security.ts';
import { executeNightAudit } from './accounting.ts';
import type { NightAuditRecord } from '../src/types/hotel';

let jobWorkerTimer: NodeJS.Timeout | null = null;
let nightAuditTimer: NodeJS.Timeout | null = null;

export function getSmsGatewayConfig() {
  const sparrowToken = (process.env.SPARROW_SMS_TOKEN || '').trim();
  const sparrowIdentity = (process.env.SPARROW_SMS_IDENTITY || '').trim();
  const twilioSid = (process.env.TWILIO_ACCOUNT_SID || '').trim();
  const twilioToken = (process.env.TWILIO_AUTH_TOKEN || '').trim();
  const twilioFrom = (process.env.TWILIO_FROM_NUMBER || '').trim();
  const twilioWhatsapp = (process.env.TWILIO_WHATSAPP_FROM || '').trim();

  return {
    sparrowConfigured: Boolean(sparrowToken && sparrowIdentity),
    twilioSmsConfigured: Boolean(twilioSid && twilioToken && twilioFrom),
    twilioWhatsappConfigured: Boolean(twilioSid && twilioToken && twilioWhatsapp),
    sparrowToken,
    sparrowIdentity,
    twilioSid,
    twilioToken,
    twilioFrom,
    twilioWhatsapp,
  };
}

async function deliverEmailJob(job: PersistentNotificationJob): Promise<void> {
  const cfg = getServerSmtpSettings();
  if (!cfg.isConfigured) {
    throw new Error('SMTP credentials not configured on server.');
  }
  const transporter = nodemailer.createTransport({
    host: cfg.smtpHost,
    port: Number(cfg.smtpPort) || 587,
    secure: cfg.encryption === 'ssl' || Number(cfg.smtpPort) === 465,
    auth: {
      user: cfg.smtpUser,
      pass: cfg.smtpPassword,
    },
    requireTLS: cfg.encryption === 'tls',
    connectionTimeout: 12000,
    greetingTimeout: 12000,
    socketTimeout: 15000,
  });

  const fromLabel = cfg.senderName
    ? `"${cfg.senderName.replace(/"/g, '')}" <${cfg.senderEmail}>`
    : cfg.senderEmail;

  await transporter.sendMail({
    from: fromLabel,
    replyTo: cfg.replyToEmail || cfg.senderEmail,
    to: job.recipient,
    subject: job.subject || `${cfg.emailSubjectPrefix || '[Kamal Hotel]'} Notification`,
    text: job.body,
    html: job.htmlBody,
  });
}

async function deliverSmsOrWhatsappJob(job: PersistentNotificationJob): Promise<void> {
  const smsCfg = getSmsGatewayConfig();
  if (job.channel === 'whatsapp') {
    if (!smsCfg.twilioWhatsappConfigured) {
      throw new Error('TWILIO_WHATSAPP_FROM / Twilio credentials not configured.');
    }
    const auth = Buffer.from(`${smsCfg.twilioSid}:${smsCfg.twilioToken}`).toString('base64');
    const resp = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${smsCfg.twilioSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: smsCfg.twilioWhatsapp.startsWith('whatsapp:')
            ? smsCfg.twilioWhatsapp
            : `whatsapp:${smsCfg.twilioWhatsapp}`,
          To: job.recipient.startsWith('whatsapp:') ? job.recipient : `whatsapp:${job.recipient}`,
          Body: job.body,
        }).toString(),
      }
    );
    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(`Twilio WhatsApp HTTP ${resp.status}: ${txt.slice(0, 200)}`);
    }
    return;
  }

  // Prefer Sparrow SMS Nepal for Nepal numbers or when configured
  if (smsCfg.sparrowConfigured) {
    const resp = await fetch('https://api.sparrowsms.com/v2/sms/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: smsCfg.sparrowToken,
        from: smsCfg.sparrowIdentity,
        to: job.recipient.replace(/^\+977\s*/, '').replace(/\s+/g, ''),
        text: job.body,
      }),
    });
    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(`Sparrow SMS HTTP ${resp.status}: ${txt.slice(0, 200)}`);
    }
    return;
  }

  if (smsCfg.twilioSmsConfigured) {
    const auth = Buffer.from(`${smsCfg.twilioSid}:${smsCfg.twilioToken}`).toString('base64');
    const resp = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${smsCfg.twilioSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: smsCfg.twilioFrom,
          To: job.recipient,
          Body: job.body,
        }).toString(),
      }
    );
    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(`Twilio SMS HTTP ${resp.status}: ${txt.slice(0, 200)}`);
    }
    return;
  }

  throw new Error('SMS gateway (SPARROW_SMS_TOKEN or TWILIO_ACCOUNT_SID) not configured on server.');
}

export async function processDueNotificationJobsOnce(): Promise<{ processed: number; sent: number; failed: number }> {
  const due = listDueNotificationJobs(10);
  let sent = 0;
  let failed = 0;

  for (const job of due) {
    const nextAttempt = job.attempts + 1;
    try {
      if (job.channel === 'email') {
        await deliverEmailJob(job);
      } else {
        await deliverSmsOrWhatsappJob(job);
      }

      const nowIso = new Date().toISOString();
      updateNotificationJobStatus(job.id, {
        status: 'sent',
        attempts: nextAttempt,
        sentAt: nowIso,
      });

      upsertCollectionItem('notifications', `notif-${job.id}`, {
        id: `notif-${job.id}`,
        type: job.channel,
        recipient: job.recipient,
        subject: job.subject,
        message: job.body,
        bookingCode: job.payload?.bookingCode as string | undefined,
        sentAt: nowIso,
        status: 'delivered',
      });
      sent += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Delivery error';
      const terminal = nextAttempt >= job.maxAttempts;
      const backoffMs = Math.pow(2, nextAttempt) * 30 * 1000;
      updateNotificationJobStatus(job.id, {
        status: terminal ? 'failed' : 'queued',
        attempts: nextAttempt,
        nextRunAt: terminal ? undefined : Date.now() + backoffMs,
        lastError: message,
      });
      if (terminal) failed += 1;
    }
  }

  return { processed: due.length, sent, failed };
}

export function checkScheduledNightAuditIfDue(): { triggered: boolean; auditDate?: string } {
  // Check Kathmandu time (+05:45)
  const nowUtcMs = Date.now();
  const ktmDate = new Date(nowUtcMs + (5 * 60 + 45) * 60 * 1000);
  const ktmHour = ktmDate.getUTCHours();
  const ktmMin = ktmDate.getUTCMinutes();
  const ktmIsoDate = ktmDate.toISOString().slice(0, 10);

  if (ktmHour === 23 && ktmMin >= 50) {
    const existing = listCollection<NightAuditRecord>('nightAudits').find(
      (n) => n.auditDate === ktmIsoDate && n.status === 'closed'
    );
    if (!existing) {
      executeNightAudit({
        auditDate: ktmIsoDate,
        auditorName: 'Scheduled Night Audit Worker (23:50 NPT)',
        notes: 'Automatically executed by scheduled night-audit background job.',
      });
      return { triggered: true, auditDate: ktmIsoDate };
    }
  }
  return { triggered: false };
}

let supabaseKeepAliveTimer: NodeJS.Timeout | null = null;
let autoPruneTimer: NodeJS.Timeout | null = null;

export async function pingSupabaseKeepAlive(): Promise<{ ok: boolean; latencyMs: number; message: string }> {
  try {
    const { pingSupabase } = await import('./databaseAdmin.ts');
    const res = await pingSupabase();
    if (res.ok) {
      console.log(`[Supabase Keep-Alive] Active heartbeat confirmed (${res.latencyMs}ms). 7-day inactivity pause prevented.`);
    } else {
      console.warn(`[Supabase Keep-Alive] Heartbeat check note: ${res.message}`);
    }
    return res;
  } catch (err: any) {
    console.warn(`[Supabase Keep-Alive] Heartbeat error: ${err?.message || err}`);
    return { ok: false, latencyMs: 0, message: err?.message || 'Ping failed' };
  }
}

export function startBackgroundWorkers(): void {
  if (!jobWorkerTimer) {
    jobWorkerTimer = setInterval(() => {
      void processDueNotificationJobsOnce();
    }, 15_000);
    jobWorkerTimer.unref?.();
  }
  if (!nightAuditTimer) {
    nightAuditTimer = setInterval(() => {
      try {
        checkScheduledNightAuditIfDue();
      } catch {
        // Ignore transient scheduler errors
      }
    }, 60_000);
    nightAuditTimer.unref?.();
  }

  // Supabase Keep-Alive: 5-second initial ping, then runs every 6 hours
  if (!supabaseKeepAliveTimer) {
    setTimeout(() => {
      void pingSupabaseKeepAlive();
    }, 5000);

    supabaseKeepAliveTimer = setInterval(() => {
      void pingSupabaseKeepAlive();
    }, 6 * 3600 * 1000); // Every 6 hours
    supabaseKeepAliveTimer.unref?.();
  }

  // Weekly Free-Tier Storage Auto-Prune (runs every 7 days)
  if (!autoPruneTimer) {
    autoPruneTimer = setInterval(async () => {
      try {
        const { pruneEphemeralData } = await import('./databaseAdmin.ts');
        const res = pruneEphemeralData({
          maxDoorLogsAgeDays: 60,
          maxAuditLogsAgeDays: 90,
          purgeExpiredGuestSessions: true,
        });
        console.log('[Auto-Prune] Cleaned ephemeral database records for free-tier optimization:', res.prunedCounts);
      } catch (err: any) {
        console.warn('[Auto-Prune] Job failed:', err?.message || err);
      }
    }, 7 * 86400 * 1000);
    autoPruneTimer.unref?.();
  }
}

export function stopBackgroundWorkers(): void {
  if (jobWorkerTimer) {
    clearInterval(jobWorkerTimer);
    jobWorkerTimer = null;
  }
  if (nightAuditTimer) {
    clearInterval(nightAuditTimer);
    nightAuditTimer = null;
  }
  if (supabaseKeepAliveTimer) {
    clearInterval(supabaseKeepAliveTimer);
    supabaseKeepAliveTimer = null;
  }
  if (autoPruneTimer) {
    clearInterval(autoPruneTimer);
    autoPruneTimer = null;
  }
}

export function getWorkerStatus() {
  return {
    notificationWorkerActive: Boolean(jobWorkerTimer),
    nightAuditSchedulerActive: Boolean(nightAuditTimer),
    supabaseKeepAliveActive: Boolean(supabaseKeepAliveTimer),
    autoPruneActive: Boolean(autoPruneTimer),
    smsGateway: {
      sparrowConfigured: getSmsGatewayConfig().sparrowConfigured,
      twilioSmsConfigured: getSmsGatewayConfig().twilioSmsConfigured,
      twilioWhatsappConfigured: getSmsGatewayConfig().twilioWhatsappConfigured,
    },
  };
}

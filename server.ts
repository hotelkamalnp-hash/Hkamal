import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';
import nodemailer from 'nodemailer';

interface GroundedSource {
  title: string;
  uri: string;
}

interface ParsedWeatherInfo {
  condition: string;
  temperatureC: string;
  feelsLikeOrRange: string;
  humidityOrWind: string;
  himalayanVisibility: string;
  guestTip: string;
}

interface ParsedCulturalEvent {
  title: string;
  dateOrTiming: string;
  location: string;
  category: string;
  summary: string;
}

interface ParsedAttraction {
  name: string;
  distanceFromKamalpokhari: string;
  bestTimeToday: string;
  highlight: string;
}

interface KathmanduLocalGuideResponse {
  focus: string;
  fetchedAt: string;
  conciergeBrief: string;
  weather: ParsedWeatherInfo;
  events: ParsedCulturalEvent[];
  attractions: ParsedAttraction[];
  rawSummary?: string;
  searchQueries: string[];
  sources: GroundedSource[];
}

function getGenAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    const err = new Error(
      'GEMINI_API_KEY is not configured. Please add your Gemini API key in Settings > Secrets.'
    ) as Error & { status?: number };
    err.status = 503;
    throw err;
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function extractJsonBlock(text: string): Record<string, unknown> | null {
  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1)) as Record<string, unknown>;
      } catch {
        return null;
      }
    }
    return null;
  }
}

async function fetchKathmanduLocalGuide(focus: string): Promise<KathmanduLocalGuideResponse> {
  const ai = getGenAIClient();
  const todayIso = new Date().toISOString().split('T')[0];

  const focusDirective =
    focus === 'weather'
      ? 'Prioritize today’s current live Kathmandu weather forecast, hourly sky visibility for the Himalayas, temperature, and outdoor travel advice.'
      : focus === 'events'
      ? 'Prioritize current and upcoming cultural events, jatras, temple ceremonies, art exhibitions, and live cultural evenings happening in Kathmandu this week.'
      : focus === 'attractions'
      ? 'Prioritize nearby Kathmandu UNESCO heritage sites, cultural neighborhoods, and practical visiting times from Kamalpokhari.'
      : 'Balance live Kathmandu weather conditions, current cultural events/festivals happening this week, and key heritage attractions near Kamalpokhari.';

  const prompt = `Today's date is ${todayIso}. A guest staying at Kamal Hotel in Kamalpokhari, Kathmandu, Nepal needs live local planning intelligence.
${focusDirective}

Use Google Search to retrieve real-time, verified current information for Kathmandu right now:
1. Live Kathmandu weather today (current temperature in °C, high/low range, sky/rain conditions, wind/humidity, and Himalayan mountain view visibility).
2. Real-time cultural events, Nepalese festivals, temple ceremonies, exhibitions, or concerts happening in Kathmandu today or over the next 7–14 days.
3. Top nearby cultural attractions in Kathmandu Valley (around Kamalpokhari, Pashupatinath, Boudhanath, Durbar Squares, Garden of Dreams, Swayambhunath) with today's visiting hours/tips.

Return ONLY valid JSON with this exact structure (no markdown commentary outside the JSON):
{
  "conciergeBrief": "2-3 concise sentences summarizing today's weather and cultural highlights for a hotel guest in Kathmandu.",
  "weather": {
    "condition": "Short weather condition label e.g. Partly Cloudy / Clear Skies",
    "temperatureC": "Current temperature e.g. 22°C",
    "feelsLikeOrRange": "Daily high / low or feels-like e.g. High 24°C / Low 12°C",
    "humidityOrWind": "e.g. Humidity 58% · Wind 9 km/h NW",
    "himalayanVisibility": "Visibility note for Nagarkot / rooftop mountain views",
    "guestTip": "Practical clothing or timing tip for guests today"
  },
  "events": [
    {
      "title": "Event or festival name",
      "dateOrTiming": "Exact dates or schedule",
      "location": "Venue or neighborhood in Kathmandu",
      "category": "Festival | Cultural | Arts & Music | Heritage",
      "summary": "1-2 sentence factual description for guests"
    }
  ],
  "attractions": [
    {
      "name": "Attraction name",
      "distanceFromKamalpokhari": "Approx drive/walk time from Kamalpokhari",
      "bestTimeToday": "Recommended visiting window",
      "highlight": "What makes it special today"
    }
  ]
}`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      temperature: 0.2,
    },
  });

  const text = response.text || '';
  const parsed = extractJsonBlock(text);

  const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
  const rawChunks = groundingMetadata?.groundingChunks || [];
  const seenUris = new Set<string>();
  const sources: GroundedSource[] = [];

  for (const chunk of rawChunks) {
    const uri = chunk.web?.uri;
    if (uri && !seenUris.has(uri)) {
      seenUris.add(uri);
      sources.push({
        title: chunk.web?.title || new URL(uri).hostname,
        uri,
      });
    }
  }

  const searchQueries = Array.isArray(groundingMetadata?.webSearchQueries)
    ? groundingMetadata.webSearchQueries
    : [];

  const weatherRaw = (parsed?.weather as Record<string, unknown> | undefined) || {};
  const weather: ParsedWeatherInfo = {
    condition: String(weatherRaw.condition || 'Live Kathmandu Conditions'),
    temperatureC: String(weatherRaw.temperatureC || 'See grounded sources'),
    feelsLikeOrRange: String(weatherRaw.feelsLikeOrRange || 'Seasonal Kathmandu Valley temperature'),
    humidityOrWind: String(weatherRaw.humidityOrWind || 'Updated via live search'),
    himalayanVisibility: String(weatherRaw.himalayanVisibility || 'Clear morning hours typically offer best Langtang & Ganesh Himal views'),
    guestTip: String(weatherRaw.guestTip || 'Carry a light layer for evening rooftop dining breezes.'),
  };

  const eventsRaw = Array.isArray(parsed?.events) ? parsed.events : [];
  const events: ParsedCulturalEvent[] = eventsRaw
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item) => ({
      title: String(item.title || 'Kathmandu Cultural Highlight'),
      dateOrTiming: String(item.dateOrTiming || 'Ongoing / Seasonal'),
      location: String(item.location || 'Kathmandu Valley'),
      category: String(item.category || 'Cultural'),
      summary: String(item.summary || ''),
    }))
    .slice(0, 6);

  const attractionsRaw = Array.isArray(parsed?.attractions) ? parsed.attractions : [];
  const attractions: ParsedAttraction[] = attractionsRaw
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item) => ({
      name: String(item.name || 'Kathmandu Heritage Site'),
      distanceFromKamalpokhari: String(item.distanceFromKamalpokhari || 'Kathmandu Valley'),
      bestTimeToday: String(item.bestTimeToday || 'Morning or Sunset'),
      highlight: String(item.highlight || ''),
    }))
    .slice(0, 6);

  const conciergeBrief =
    typeof parsed?.conciergeBrief === 'string' && parsed.conciergeBrief.trim()
      ? parsed.conciergeBrief.trim()
      : text.trim() || 'Live Kathmandu weather and cultural guidance retrieved via search.';

  return {
    focus,
    fetchedAt: new Date().toISOString(),
    conciergeBrief,
    weather,
    events,
    attractions,
    rawSummary: parsed ? undefined : text.trim(),
    searchQueries,
    sources,
  };
}

interface VerificationOtpRecord {
  code: string;
  email: string;
  guestName: string;
  expiresAt: number;
  verified: boolean;
}

const bookingEmailOtpStore = new Map<string, VerificationOtpRecord>();

interface IncomingSmtpPayload {
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  senderEmail?: string;
  senderName?: string;
  replyToEmail?: string;
  notificationEmail?: string;
  encryption?: 'ssl' | 'tls' | 'none';
  sendBookingConfirmationEmail?: boolean;
  requireRealEmailOtp?: boolean;
  otpExpiryMinutes?: number;
  emailSubjectPrefix?: string;
}

interface ResolvedSmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  senderEmail: string;
  senderName: string;
  replyToEmail?: string;
  notificationEmail?: string;
  encryption: 'ssl' | 'tls' | 'none';
  sendBookingConfirmationEmail: boolean;
  requireRealEmailOtp: boolean;
  otpExpiryMinutes: number;
  subjectPrefix: string;
  hasRealCredentials: boolean;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function resolveEffectiveSmtp(input?: IncomingSmtpPayload): ResolvedSmtpConfig {
  const host = (input?.smtpHost || process.env.SMTP_HOST || '').trim();
  const port = Number(input?.smtpPort || process.env.SMTP_PORT || 587) || 587;
  const user = (input?.smtpUser || process.env.SMTP_USER || '').trim();
  const pass = (input?.smtpPassword || process.env.SMTP_PASS || '').trim();
  const senderEmail = (input?.senderEmail || process.env.SMTP_FROM_EMAIL || user || '').trim();
  const senderName = (input?.senderName || process.env.SMTP_FROM_NAME || 'Kamal Hotel Reservations').trim();
  const replyToEmail = (input?.replyToEmail || senderEmail || '').trim() || undefined;
  const notificationEmail = (input?.notificationEmail || '').trim() || undefined;
  const rawEnc = input?.encryption || (process.env.SMTP_ENCRYPTION as 'ssl' | 'tls' | 'none' | undefined) || (port === 465 ? 'ssl' : 'tls');
  const encryption: 'ssl' | 'tls' | 'none' =
    rawEnc === 'ssl' || rawEnc === 'none' ? rawEnc : 'tls';

  const isPlaceholderPassword =
    !pass ||
    pass === 'SG.demo_key_hotel_gateway' ||
    pass === 'YOUR_APP_PASSWORD';

  const hasRealCredentials = Boolean(
    host &&
      senderEmail &&
      user &&
      !isPlaceholderPassword
  );

  return {
    host,
    port,
    user,
    pass,
    senderEmail,
    senderName,
    replyToEmail,
    notificationEmail,
    encryption,
    sendBookingConfirmationEmail: input?.sendBookingConfirmationEmail !== false,
    requireRealEmailOtp: Boolean(input?.requireRealEmailOtp),
    otpExpiryMinutes: Math.min(60, Math.max(3, Number(input?.otpExpiryMinutes) || 10)),
    subjectPrefix: (input?.emailSubjectPrefix || '').trim(),
    hasRealCredentials,
  };
}

function createMailTransporter(cfg: ResolvedSmtpConfig) {
  const useSecure = cfg.encryption === 'ssl' || cfg.port === 465;
  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: useSecure,
    requireTLS: cfg.encryption === 'tls' && !useSecure,
    auth: cfg.user && cfg.pass ? { user: cfg.user, pass: cfg.pass } : undefined,
    connectionTimeout: 12000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
}

function formatSmtpErrorHint(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err || 'SMTP connection error');
  if (msg.includes('535') || msg.toLowerCase().includes('username and password not accepted')) {
    return `${msg} — For Gmail, enable 2-Step Verification and generate a 16-character Google App Password (do not use your normal account password).`;
  }
  if (msg.includes('ECONNREFUSED') || msg.includes('ETIMEDOUT') || msg.includes('ENOTFOUND')) {
    return `${msg} — Verify SMTP hostname, port (587 STARTTLS or 465 SSL), and firewall rules.`;
  }
  return msg;
}

function getGoogleMapsApiKey(): string {
  return (
    process.env.VITE_GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    ''
  ).trim();
}

const NEIGHBORHOOD_CATEGORY_TYPES: Record<string, string[]> = {
  all: [
    'tourist_attraction',
    'hindu_temple',
    'museum',
    'park',
    'restaurant',
    'cafe',
    'transit_station',
    'bus_station',
  ],
  landmarks: [
    'tourist_attraction',
    'hindu_temple',
    'museum',
    'park',
    'historical_landmark',
  ],
  restaurants: ['restaurant', 'cafe', 'bakery'],
  transit: ['transit_station', 'bus_station', 'taxi_stand', 'airport'],
};

async function startServer(): Promise<void> {
  const app = express();
  const httpServer = http.createServer(app);
  const port = Number(process.env.PORT) || 3000;

  app.use(express.json());

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true, service: 'kamal-hotel-pms' });
  });

  app.get('/api/maps/config', (_req: Request, res: Response) => {
    const apiKey = getGoogleMapsApiKey();
    res.json({
      hasKey: Boolean(apiKey),
      apiKey,
    });
  });

  const handleNeighborhoodPlaces = async (req: Request, res: Response) => {
    const apiKey = getGoogleMapsApiKey();
    if (!apiKey) {
      res.status(503).json({
        error: 'Google Maps API key is not configured on the server.',
        code: 'MISSING_MAPS_API_KEY',
        places: [],
      });
      return;
    }

    const rawBody = (req.method === 'GET' ? req.query : req.body) || {};
    const lat = Number(rawBody.latitude ?? rawBody.lat) || 27.7123;
    const lng = Number(rawBody.longitude ?? rawBody.lng) || 85.324;
    const radiusMeters = Math.min(5000, Math.max(300, Number(rawBody.radiusMeters) || 1500));
    const category =
      typeof rawBody.category === 'string' && NEIGHBORHOOD_CATEGORY_TYPES[rawBody.category]
        ? rawBody.category
        : 'all';
    const includedTypes = NEIGHBORHOOD_CATEGORY_TYPES[category];

    const extractText = (value: unknown): string | undefined => {
      if (typeof value === 'string') return value;
      if (value && typeof value === 'object' && 'text' in value) {
        const txt = (value as { text?: unknown }).text;
        return typeof txt === 'string' ? txt : undefined;
      }
      return undefined;
    };

    const resolveBucket = (
      primaryType: string | undefined,
      types: string[]
    ): 'landmarks' | 'restaurants' | 'transit' => {
      if (category === 'landmarks' || category === 'restaurants' || category === 'transit') {
        return category;
      }
      const allTypes = new Set([primaryType, ...types].filter(Boolean) as string[]);
      if (
        allTypes.has('transit_station') ||
        allTypes.has('bus_station') ||
        allTypes.has('taxi_stand') ||
        allTypes.has('airport') ||
        allTypes.has('train_station') ||
        allTypes.has('subway_station')
      ) {
        return 'transit';
      }
      if (
        allTypes.has('restaurant') ||
        allTypes.has('cafe') ||
        allTypes.has('bakery') ||
        allTypes.has('meal_takeaway') ||
        allTypes.has('bar')
      ) {
        return 'restaurants';
      }
      return 'landmarks';
    };

    try {
      const response = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask':
            'places.id,places.displayName,places.formattedAddress,places.shortFormattedAddress,places.location,places.primaryType,places.primaryTypeDisplayName,places.types,places.rating,places.userRatingCount,places.googleMapsUri,places.currentOpeningHours,places.businessStatus',
          'X-Goog-Maps-Solution-ID': 'gmp_mcp_codeassist_v1_aistudio',
        },
        body: JSON.stringify({
          includedTypes,
          maxResultCount: 16,
          rankPreference: 'DISTANCE',
          locationRestriction: {
            circle: {
              center: { latitude: lat, longitude: lng },
              radius: radiusMeters,
            },
          },
        }),
      });

      const payload = (await response.json()) as {
        places?: Array<Record<string, unknown>>;
        error?: { code?: number; message?: string; status?: string };
      };

      if (!response.ok) {
        const isQuota =
          response.status === 429 ||
          payload?.error?.status === 'RESOURCE_EXHAUSTED' ||
          String(payload?.error?.message || '').toLowerCase().includes('quota');
        res.status(isQuota ? 429 : response.status).json({
          error: payload?.error?.message || 'Unable to retrieve nearby neighborhood places.',
          code: isQuota ? 'RESOURCE_EXHAUSTED' : payload?.error?.status || 'PLACES_ERROR',
          places: [],
        });
        return;
      }

      const rawPlaces = Array.isArray(payload.places) ? payload.places : [];
      const normalizedPlaces = rawPlaces
        .map((p) => {
          const loc = p.location as { latitude?: number; longitude?: number } | undefined;
          if (typeof loc?.latitude !== 'number' || typeof loc?.longitude !== 'number') {
            return null;
          }
          const primaryType = typeof p.primaryType === 'string' ? p.primaryType : undefined;
          const types = Array.isArray(p.types) ? p.types.filter((t): t is string => typeof t === 'string') : [];
          const hours = p.currentOpeningHours as { openNow?: boolean } | undefined;

          return {
            id: String(p.id || `${loc.latitude},${loc.longitude}`),
            name: extractText(p.displayName) || extractText(p.name) || 'Local Highlight',
            formattedAddress: typeof p.formattedAddress === 'string' ? p.formattedAddress : '',
            shortFormattedAddress:
              typeof p.shortFormattedAddress === 'string' ? p.shortFormattedAddress : undefined,
            location: {
              latitude: loc.latitude,
              longitude: loc.longitude,
            },
            primaryType,
            primaryTypeDisplayName: extractText(p.primaryTypeDisplayName),
            types,
            rating: typeof p.rating === 'number' ? p.rating : null,
            userRatingCount: typeof p.userRatingCount === 'number' ? p.userRatingCount : null,
            googleMapsUri: typeof p.googleMapsUri === 'string' ? p.googleMapsUri : undefined,
            openNow: typeof hours?.openNow === 'boolean' ? hours.openNow : null,
            businessStatus: typeof p.businessStatus === 'string' ? p.businessStatus : undefined,
            categoryBucket: resolveBucket(primaryType, types),
          };
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item));

      res.json({
        category,
        center: { lat, lng },
        radiusMeters,
        places: normalizedPlaces,
      });
    } catch (error: unknown) {
      const err = error as Error;
      console.error('Neighborhood Places API proxy error:', err);
      res.status(502).json({
        error: err.message || 'Network error while querying Places API.',
        places: [],
      });
    }
  };

  app.post('/api/neighborhood/places', handleNeighborhoodPlaces);
  app.get('/api/neighborhood/places', handleNeighborhoodPlaces);

  app.post('/api/email/test-smtp', async (req: Request, res: Response) => {
    const testEmail =
      typeof req.body?.testEmail === 'string' ? req.body.testEmail.trim() : '';
    const smtpCfg = resolveEffectiveSmtp(req.body?.smtpConfig);
    const hotelName =
      typeof req.body?.hotelName === 'string' && req.body.hotelName.trim()
        ? req.body.hotelName.trim()
        : smtpCfg.senderName || 'Kamal Hotel';

    if (!smtpCfg.host || !smtpCfg.senderEmail) {
      res.status(400).json({
        ok: false,
        error: 'SMTP Host and Sender From Email are required.',
      });
      return;
    }
    if (!smtpCfg.hasRealCredentials) {
      res.status(400).json({
        ok: false,
        error:
          'SMTP Username and real Password / App Password are required to connect to your mail server.',
      });
      return;
    }

    const recipient = testEmail || smtpCfg.senderEmail;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipient)) {
      res.status(400).json({
        ok: false,
        error: 'Please enter a valid recipient email address for the test email.',
      });
      return;
    }

    try {
      const transporter = createMailTransporter(smtpCfg);
      await transporter.verify();

      const prefix = smtpCfg.subjectPrefix ? `${smtpCfg.subjectPrefix} ` : '';
      const info = await transporter.sendMail({
        from: `"${smtpCfg.senderName}" <${smtpCfg.senderEmail}>`,
        to: recipient,
        replyTo: smtpCfg.replyToEmail || smtpCfg.senderEmail,
        subject: `${prefix}SMTP Connection Verified — ${hotelName}`,
        text: `Your outgoing mail server (${smtpCfg.host}:${smtpCfg.port}, ${smtpCfg.encryption.toUpperCase()}) is connected and ready to deliver guest verification codes and booking vouchers for ${hotelName}.`,
        html: `
          <div style="font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 28px; color: #1c1917; border: 1px solid #e7e5e4; border-radius: 12px;">
            <p style="font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #92400e; margin: 0 0 8px;">${escapeHtml(hotelName)} · Mail Gateway</p>
            <h2 style="font-family: Georgia, serif; font-size: 22px; margin: 0 0 14px; color: #1c1917;">SMTP Delivery Verified</h2>
            <p style="font-size: 14px; line-height: 1.6; color: #44403c; margin: 0 0 18px;">
              This test message confirms that your real SMTP server is authenticated and ready to send booking OTP codes and confirmation vouchers.
            </p>
            <div style="background: #fafaf9; border: 1px solid #e7e5e4; border-radius: 8px; padding: 14px; font-size: 13px; color: #57534e;">
              <div><strong>SMTP Host:</strong> ${escapeHtml(smtpCfg.host)}:${smtpCfg.port} (${smtpCfg.encryption.toUpperCase()})</div>
              <div style="margin-top: 4px;"><strong>Sender:</strong> ${escapeHtml(smtpCfg.senderName)} &lt;${escapeHtml(smtpCfg.senderEmail)}&gt;</div>
              <div style="margin-top: 4px;"><strong>Tested At:</strong> ${new Date().toUTCString()}</div>
            </div>
          </div>
        `,
      });

      res.json({
        ok: true,
        messageId: info.messageId,
        accepted: info.accepted,
        message: `Connected to ${smtpCfg.host}:${smtpCfg.port} and delivered real test email to ${recipient} (ID: ${info.messageId}).`,
      });
    } catch (error: unknown) {
      console.error('SMTP test error:', error);
      res.status(502).json({
        ok: false,
        error: formatSmtpErrorHint(error),
      });
    }
  });

  app.post('/api/bookings/send-verification-code', async (req: Request, res: Response) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const guestName = typeof req.body?.guestName === 'string' ? req.body.guestName.trim() : 'Valued Guest';
    const hotelName =
      typeof req.body?.hotelName === 'string' && req.body.hotelName.trim()
        ? req.body.hotelName.trim()
        : 'Kamal Hotel';

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      res.status(400).json({ ok: false, error: 'Please enter a valid email address.' });
      return;
    }

    const smtpCfg = resolveEffectiveSmtp(req.body?.smtpConfig);
    const ttlMs = smtpCfg.otpExpiryMinutes * 60 * 1000;
    const code = String(Math.floor(100000 + Math.random() * 900000));

    bookingEmailOtpStore.set(email, {
      code,
      email,
      guestName,
      expiresAt: Date.now() + ttlMs,
      verified: false,
    });

    if (smtpCfg.hasRealCredentials) {
      try {
        const transporter = createMailTransporter(smtpCfg);
        const prefix = smtpCfg.subjectPrefix ? `${smtpCfg.subjectPrefix} ` : '';
        const info = await transporter.sendMail({
          from: `"${smtpCfg.senderName || hotelName}" <${smtpCfg.senderEmail}>`,
          to: email,
          replyTo: smtpCfg.replyToEmail || smtpCfg.senderEmail,
          subject: `${prefix}Your ${hotelName} Verification Code: ${code}`,
          text: `Namaste ${guestName},\n\nYour 6-digit email verification code for ${hotelName} is: ${code}\n\nThis code expires in ${smtpCfg.otpExpiryMinutes} minutes. Please enter it on the booking page to confirm your email and finalize your stay.\n\nWarm regards,\n${hotelName}`,
          html: `
            <div style="font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #1c1917; border: 1px solid #e7e5e4; border-radius: 14px; background: #ffffff;">
              <p style="font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: #92400e; margin: 0 0 8px;">${escapeHtml(hotelName)}</p>
              <h2 style="font-family: Georgia, serif; font-size: 24px; font-weight: 600; margin: 0 0 12px; color: #1c1917;">Confirm your email address</h2>
              <p style="font-size: 14px; line-height: 1.6; color: #44403c; margin: 0 0 22px;">
                Namaste ${escapeHtml(guestName)}, please enter the 6-digit verification code below to confirm your reservation request at ${escapeHtml(hotelName)}.
              </p>
              <div style="background: #fafaf9; border: 1px solid #e7e5e4; border-radius: 10px; padding: 18px; text-align: center; margin: 0 0 22px;">
                <div style="font-family: 'JetBrains Mono', monospace, sans-serif; font-size: 32px; font-weight: 700; letter-spacing: 0.28em; color: #1c1917;">${code}</div>
              </div>
              <p style="font-size: 12px; line-height: 1.5; color: #78716c; margin: 0;">
                This code expires in ${smtpCfg.otpExpiryMinutes} minutes. If you did not initiate this booking, you may safely ignore this email.
              </p>
            </div>
          `,
        });

        res.json({
          ok: true,
          email,
          expiresInSeconds: Math.round(ttlMs / 1000),
          deliveryMode: 'smtp',
          smtpSent: true,
          messageId: info.messageId,
          message: `Verification code sent to ${email} via ${smtpCfg.host}. Check your inbox.`,
        });
        return;
      } catch (error: unknown) {
        console.error('Failed sending verification email via SMTP:', error);
        res.status(502).json({
          ok: false,
          deliveryMode: 'smtp_error',
          smtpSent: false,
          error: `SMTP delivery failed: ${formatSmtpErrorHint(error)}`,
        });
        return;
      }
    }

    if (smtpCfg.requireRealEmailOtp) {
      res.status(422).json({
        ok: false,
        deliveryMode: 'smtp_unconfigured',
        smtpSent: false,
        error: 'Real SMTP delivery is required. Please configure SMTP credentials in CMS -> Email & SMTP Settings.',
      });
      return;
    }

    res.json({
      ok: true,
      email,
      expiresInSeconds: Math.round(ttlMs / 1000),
      deliveryMode: 'sandbox_preview',
      smtpSent: false,
      previewCode: code,
      verificationCodePreview: code,
      message: `SMTP not configured yet — showing sandbox preview code. Add Gmail/SMTP in CMS to email ${email} directly.`,
    });
  });

  app.post('/api/bookings/verify-email-code', (req: Request, res: Response) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';

    if (!email || !code) {
      res.status(400).json({ ok: false, verified: false, error: 'Email and 6-digit verification code are required.' });
      return;
    }

    const record = bookingEmailOtpStore.get(email);
    if (!record) {
      res.status(400).json({
        ok: false,
        verified: false,
        error: 'No active verification code found for this email. Please request a new code.',
      });
      return;
    }

    if (Date.now() > record.expiresAt) {
      bookingEmailOtpStore.delete(email);
      res.status(400).json({
        ok: false,
        verified: false,
        error: 'Verification code expired. Please request a new 6-digit code.',
      });
      return;
    }

    if (record.code !== code) {
      res.status(400).json({
        ok: false,
        verified: false,
        error: 'Invalid verification code. Please check your email and try again.',
      });
      return;
    }

    record.verified = true;
    bookingEmailOtpStore.set(email, record);

    res.json({
      ok: true,
      verified: true,
      email,
      verifiedAt: new Date().toISOString(),
    });
  });

  app.post('/api/bookings/send-confirmation-email', async (req: Request, res: Response) => {
    const guestEmail = typeof req.body?.guestEmail === 'string' ? req.body.guestEmail.trim() : '';
    const guestName = typeof req.body?.guestName === 'string' ? req.body.guestName.trim() : 'Valued Guest';
    const guestPhone = typeof req.body?.guestPhone === 'string' ? req.body.guestPhone.trim() : '';
    const bookingCode = typeof req.body?.bookingCode === 'string' ? req.body.bookingCode.trim() : '';
    const roomName = typeof req.body?.roomName === 'string' ? req.body.roomName.trim() : 'Suite';
    const assignedRoomNumber = typeof req.body?.assignedRoomNumber === 'string' ? req.body.assignedRoomNumber.trim() : '';
    const checkInDate = typeof req.body?.checkInDate === 'string' ? req.body.checkInDate.trim() : '';
    const checkOutDate = typeof req.body?.checkOutDate === 'string' ? req.body.checkOutDate.trim() : '';
    const nights = Number(req.body?.nights) || 1;
    const adults = Number(req.body?.adults) || 1;
    const children = Number(req.body?.children) || 0;
    const currency = typeof req.body?.currency === 'string' ? req.body.currency : 'USD';
    const roomSubtotalFormatted = typeof req.body?.roomSubtotalFormatted === 'string' ? req.body.roomSubtotalFormatted : '';
    const serviceChargeFormatted = typeof req.body?.serviceChargeFormatted === 'string' ? req.body.serviceChargeFormatted : '';
    const taxFormatted = typeof req.body?.taxFormatted === 'string' ? req.body.taxFormatted : '';
    const couponCode = typeof req.body?.couponCode === 'string' ? req.body.couponCode.trim() : '';
    const discountFormatted = typeof req.body?.discountFormatted === 'string' ? req.body.discountFormatted : '';
    const addons: { name: string; priceFormatted?: string }[] = Array.isArray(req.body?.addons) ? req.body.addons : [];
    const totalAmountFormatted = typeof req.body?.totalAmountFormatted === 'string' ? req.body.totalAmountFormatted : '';
    const paymentMethod = typeof req.body?.paymentMethod === 'string' ? req.body.paymentMethod : 'card';
    const paymentStatus = typeof req.body?.paymentStatus === 'string' ? req.body.paymentStatus : 'paid';
    const specialRequests = typeof req.body?.specialRequests === 'string' ? req.body.specialRequests.trim() : '';
    const hotelName = typeof req.body?.hotelName === 'string' && req.body.hotelName.trim() ? req.body.hotelName.trim() : 'Kamal Hotel';
    const hotelAddress = typeof req.body?.hotelAddress === 'string' ? req.body.hotelAddress : 'Kamalpokhari, Kathmandu, Nepal';
    const hotelPhone = typeof req.body?.hotelPhone === 'string' ? req.body.hotelPhone : '';
    const hotelEmail = typeof req.body?.hotelEmail === 'string' ? req.body.hotelEmail : '';
    const panVatNumber = typeof req.body?.panVatNumber === 'string' ? req.body.panVatNumber : '';
    const checkInTime = typeof req.body?.checkInTime === 'string' ? req.body.checkInTime : '02:00 PM';
    const checkOutTime = typeof req.body?.checkOutTime === 'string' ? req.body.checkOutTime : '12:00 PM';
    const googleMapsUrl = typeof req.body?.googleMapsUrl === 'string' ? req.body.googleMapsUrl : '';

    if (!guestEmail || !bookingCode) {
      res.status(400).json({ ok: false, sent: false, error: 'Guest email and booking reference code are required.' });
      return;
    }

    const smtpCfg = resolveEffectiveSmtp(req.body?.smtpConfig);
    if (!smtpCfg.sendBookingConfirmationEmail) {
      res.json({ ok: true, sent: false, deliveryMode: 'disabled', message: 'Booking confirmation emails are disabled in SMTP settings.' });
      return;
    }

    if (!smtpCfg.hasRealCredentials) {
      res.json({
        ok: true,
        sent: false,
        deliveryMode: 'smtp_unconfigured',
        message: 'SMTP credentials not configured — configure SMTP in CMS to send real confirmation emails.',
      });
      return;
    }

    try {
      const transporter = createMailTransporter(smtpCfg);
      const prefix = smtpCfg.subjectPrefix ? `${smtpCfg.subjectPrefix} ` : '';
      const copyRecipient =
        smtpCfg.notificationEmail && smtpCfg.notificationEmail.toLowerCase() !== guestEmail.toLowerCase()
          ? smtpCfg.notificationEmail
          : undefined;

      const addonsRowsHtml = addons
        .map(
          (a) =>
            `<tr><td style="padding: 8px 0; color: #57534e; font-size: 13px;">Add-On: ${escapeHtml(String(a.name || ''))}</td><td style="padding: 8px 0; text-align: right; color: #1c1917; font-size: 13px;">${escapeHtml(String(a.priceFormatted || 'Included'))}</td></tr>`
        )
        .join('');

      const info = await transporter.sendMail({
        from: `"${smtpCfg.senderName || hotelName}" <${smtpCfg.senderEmail}>`,
        to: guestEmail,
        bcc: copyRecipient,
        replyTo: smtpCfg.replyToEmail || smtpCfg.senderEmail,
        subject: `${prefix}Official Reservation Voucher (${bookingCode}) — ${hotelName}`,
        text: `Namaste ${guestName},\n\nYour reservation at ${hotelName} is confirmed.\nReference: ${bookingCode}\nSuite: ${roomName}\nAssigned Room: ${assignedRoomNumber ? `Room ${assignedRoomNumber}` : 'Front Desk Allocation'}\nCheck-in: ${checkInDate} (${checkInTime})\nCheck-out: ${checkOutDate} (${checkOutTime})\nStay: ${nights} night(s), ${adults} adult(s)${children ? `, ${children} child(ren)` : ''}\nTotal Settled (${currency}): ${totalAmountFormatted}\nPayment: ${paymentStatus.toUpperCase()} (${paymentMethod.toUpperCase()})\n\nAddress: ${hotelAddress}\nPhone: ${hotelPhone}\n${googleMapsUrl ? `Directions: ${googleMapsUrl}\n` : ''}\nWarm regards,\n${hotelName}`,
        html: `
          <div style="background: #f5f5f4; padding: 28px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1c1917;">
            <div style="max-width: 620px; margin: 0 auto; background: #ffffff; border: 1px solid #e7e5e4; border-radius: 16px; overflow: hidden;">
              <div style="background: #1c1917; padding: 26px 28px; border-bottom: 4px solid #b45309;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td>
                      <div style="font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; color: #fbbf24; font-weight: 700;">Official Stay Confirmation Voucher</div>
                      <div style="font-family: Georgia, serif; font-size: 24px; font-weight: 700; color: #ffffff; margin-top: 4px;">${escapeHtml(hotelName)}</div>
                      <div style="font-size: 12px; color: #d6d3d1; margin-top: 2px;">${escapeHtml(hotelAddress)}</div>
                    </td>
                    <td style="text-align: right; vertical-align: top;">
                      <span style="display: inline-block; padding: 5px 10px; border-radius: 999px; background: #064e3b; color: #6ee7b7; font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;">Guaranteed</span>
                      <div style="font-family: monospace; font-size: 14px; font-weight: 700; color: #fcd34d; margin-top: 8px;">${escapeHtml(bookingCode)}</div>
                    </td>
                  </tr>
                </table>
              </div>

              <div style="padding: 28px;">
                <h1 style="font-family: Georgia, serif; font-size: 23px; font-weight: 700; margin: 0 0 10px; color: #1c1917;">Namaste ${escapeHtml(guestName)}, your stay is confirmed.</h1>
                <p style="font-size: 14px; line-height: 1.6; color: #44403c; margin: 0 0 22px;">
                  We are delighted to welcome you to ${escapeHtml(hotelName)}. Please present your Booking Reference ID <strong style="color: #92400e; font-family: monospace;">${escapeHtml(bookingCode)}</strong> along with a valid Passport or National ID upon arrival at Reception.
                </p>

                <table style="width: 100%; border-collapse: separate; border-spacing: 10px 0; margin: 0 -10px 20px;">
                  <tr>
                    <td style="width: 50%; background: #fafaf9; border: 1px solid #e7e5e4; border-radius: 10px; padding: 14px; vertical-align: top;">
                      <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #78716c; font-weight: 700;">Check-In</div>
                      <div style="font-size: 15px; font-weight: 700; color: #1c1917; margin-top: 4px;">${escapeHtml(checkInDate)}</div>
                      <div style="font-size: 12px; color: #57534e; margin-top: 2px;">From ${escapeHtml(checkInTime)}</div>
                    </td>
                    <td style="width: 50%; background: #fafaf9; border: 1px solid #e7e5e4; border-radius: 10px; padding: 14px; vertical-align: top;">
                      <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #78716c; font-weight: 700;">Check-Out</div>
                      <div style="font-size: 15px; font-weight: 700; color: #1c1917; margin-top: 4px;">${escapeHtml(checkOutDate)}</div>
                      <div style="font-size: 12px; color: #57534e; margin-top: 2px;">Until ${escapeHtml(checkOutTime)}</div>
                    </td>
                  </tr>
                </table>

                <div style="background: #fafaf9; border: 1px solid #e7e5e4; border-radius: 12px; padding: 18px; margin-bottom: 22px;">
                  <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #92400e; font-weight: 700; margin-bottom: 10px;">Reservation &amp; Folio Breakdown (${escapeHtml(currency)})</div>
                  <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #292524;">
                    <tr>
                      <td style="padding: 8px 0; color: #57534e;">Suite Category</td>
                      <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #1c1917;">${escapeHtml(roomName)}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #57534e;">Allocated Unit</td>
                      <td style="padding: 8px 0; text-align: right; font-weight: 700; font-family: monospace; color: #92400e;">${assignedRoomNumber ? `Room ${escapeHtml(assignedRoomNumber)}` : 'Assigned Upon Arrival'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #57534e;">Occupancy &amp; Stay</td>
                      <td style="padding: 8px 0; text-align: right;">${nights} Night(s) · ${adults} Adult(s)${children ? `, ${children} Child(ren)` : ''}</td>
                    </tr>
                    ${roomSubtotalFormatted ? `<tr><td style="padding: 8px 0; color: #57534e;">Room Tariff Subtotal</td><td style="padding: 8px 0; text-align: right;">${escapeHtml(roomSubtotalFormatted)}</td></tr>` : ''}
                    ${addonsRowsHtml}
                    ${couponCode && discountFormatted ? `<tr><td style="padding: 8px 0; color: #047857; font-weight: 600;">Promo Savings (${escapeHtml(couponCode)})</td><td style="padding: 8px 0; text-align: right; color: #047857; font-weight: 600;">-${escapeHtml(discountFormatted)}</td></tr>` : ''}
                    ${serviceChargeFormatted ? `<tr><td style="padding: 8px 0; color: #57534e;">Hotel Service Charge (10%)</td><td style="padding: 8px 0; text-align: right;">${escapeHtml(serviceChargeFormatted)}</td></tr>` : ''}
                    ${taxFormatted ? `<tr><td style="padding: 8px 0; color: #57534e;">Nepal Statutory VAT (13%)</td><td style="padding: 8px 0; text-align: right;">${escapeHtml(taxFormatted)}</td></tr>` : ''}
                    <tr>
                      <td style="padding: 8px 0; color: #57534e;">Payment Gateway</td>
                      <td style="padding: 8px 0; text-align: right; text-transform: uppercase;">${escapeHtml(paymentStatus)} · ${escapeHtml(paymentMethod)}</td>
                    </tr>
                    <tr style="border-top: 2px solid #d6d3d1;">
                      <td style="padding: 12px 0 0; font-size: 14px; font-weight: 700; color: #1c1917;">Total Settled</td>
                      <td style="padding: 12px 0 0; text-align: right; font-size: 18px; font-weight: 700; color: #92400e;">${escapeHtml(totalAmountFormatted)}</td>
                    </tr>
                  </table>
                  ${specialRequests ? `<div style="margin-top: 14px; padding-top: 12px; border-top: 1px dashed #d6d3d1; font-size: 12px; color: #57534e;"><strong>Guest Special Requests:</strong> ${escapeHtml(specialRequests)}</div>` : ''}
                </div>

                ${googleMapsUrl ? `<div style="text-align: center; margin-bottom: 22px;"><a href="${escapeHtml(googleMapsUrl)}" style="display: inline-block; padding: 12px 24px; border-radius: 8px; background: #b45309; color: #ffffff; font-size: 13px; font-weight: 700; text-decoration: none;">Open Google Maps Directions</a></div>` : ''}

                <div style="border-top: 1px solid #e7e5e4; padding-top: 16px; font-size: 12px; color: #57534e; line-height: 1.6;">
                  <div><strong>${escapeHtml(hotelName)}</strong> · ${escapeHtml(hotelAddress)}</div>
                  <div>${hotelPhone ? `24/7 Front Desk: ${escapeHtml(hotelPhone)}` : ''}${hotelEmail ? ` · Email: ${escapeHtml(hotelEmail)}` : ''}${guestPhone ? ` · Guest Contact: ${escapeHtml(guestPhone)}` : ''}</div>
                  ${panVatNumber ? `<div style="font-size: 11px; color: #78716c; margin-top: 2px;">Nepal IRD PAN / VAT Reg #: ${escapeHtml(panVatNumber)}</div>` : ''}
                </div>
              </div>
            </div>
          </div>
        `,
      });

      res.json({
        ok: true,
        sent: true,
        deliveryMode: 'smtp',
        messageId: info.messageId,
        recipient: guestEmail,
        copySentTo: copyRecipient || null,
        message: `Confirmation email sent to ${guestEmail}.`,
      });
    } catch (error: unknown) {
      console.error('Failed sending confirmation email via SMTP:', error);
      res.status(502).json({
        ok: false,
        sent: false,
        deliveryMode: 'smtp_error',
        error: formatSmtpErrorHint(error),
      });
    }
  });

  const handleLocalGuideRequest = async (req: Request, res: Response) => {
    try {
      const focusParam =
        (req.method === 'GET' ? req.query.focus : req.body?.focus) || 'all';
      const focus = typeof focusParam === 'string' ? focusParam : 'all';

      const data = await fetchKathmanduLocalGuide(focus);
      res.json(data);
    } catch (error: unknown) {
      const err = error as Error & { status?: number };
      const status = typeof err.status === 'number' ? err.status : 500;
      const message =
        status === 400 || status === 403
          ? 'Gemini API authentication failed. Please check GEMINI_API_KEY in Settings > Secrets.'
          : err.message || 'Failed to fetch live Kathmandu local guide.';

      console.error('Kathmandu Local Guide API error:', error);
      res.status(status).json({ error: message });
    }
  };

  app.post('/api/local-guide/kathmandu', handleLocalGuideRequest);
  app.get('/api/local-guide/kathmandu', handleLocalGuideRequest);

  if (process.env.NODE_ENV !== 'production') {
    const [{ createServer: createViteServer }, viteConfigModule] = await Promise.all([
      import('vite'),
      import('./vite.config.ts'),
    ]);
    const rawConfig = viteConfigModule.default;
    const resolvedViteConfig =
      typeof rawConfig === 'function'
        ? await rawConfig({ mode: process.env.NODE_ENV || 'development', command: 'serve' })
        : rawConfig;

    const disableHmrWsPlugin = {
      name: 'kamal-disable-hmr-ws',
      transform(code: string, id: string) {
        if (id.endsWith('/vite/dist/client/client.mjs') || id.endsWith('\\vite\\dist\\client\\client.mjs')) {
          const patched = code
            .replace(
              'transport.connect(createHMRHandler(handleMessage));',
              '/* HMR WebSocket disabled */'
            )
            .replace(
              'throw new SendBeforeConnectError("send was called before connect");',
              'return;'
            )
            .replace(
              'throw new SendBeforeConnectError("invoke was called before connect");',
              'return;'
            );
          return {
            code: patched,
            map: null,
          };
        }
        return null;
      },
    };

    const vite = await createViteServer({
      ...resolvedViteConfig,
      plugins: [...(resolvedViteConfig?.plugins || []), disableHmrWsPlugin],
      configFile: false,
      server: {
        ...(resolvedViteConfig?.server || {}),
        middlewareMode: true,
        hmr: false,
        watch: null,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (req: Request, res: Response, next) => {
      if (req.path.startsWith('/api/')) {
        next();
        return;
      }
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`Kamal Hotel server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Kamal Hotel server:', err);
  process.exit(1);
});

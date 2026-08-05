/**
 * Single source of truth for which services exist, how a user connects to
 * them, and how they're presented. Shared by the dashboard UI and the
 * connections API so "implemented" never drifts between client and server.
 */

export type ServiceAuthType = 'oauth' | 'manual' | 'comingSoon';

export interface ServiceDef {
  name: string;
  /** Matches the NextAuth provider id / Connection.provider column. */
  provider: string;
  authType: ServiceAuthType;
  color: string;
  glow: string;
  icon: string;
  accent: string;
}

export const SERVICES: ServiceDef[] = [
  {
    name: 'Spotify',
    provider: 'spotify',
    authType: 'oauth',
    color: 'from-[#1DB954]/30 to-[#1ED760]/10',
    glow: 'shadow-[0_0_25px_#1DB95460]',
    icon: 'https://cdn-icons-png.flaticon.com/512/174/174872.png',
    accent: '#1DB954',
  },
  {
    name: 'YouTube',
    provider: 'google',
    authType: 'oauth',
    color: 'from-[#FF0000]/30 to-[#FF3333]/10',
    glow: 'shadow-[0_0_25px_#FF000060]',
    icon: 'https://cdn-icons-png.flaticon.com/512/1384/1384060.png',
    accent: '#FF0000',
  },
  {
    name: 'GitHub',
    provider: 'github',
    authType: 'oauth',
    color: 'from-[#6F42C1]/30 to-[#7C3AED]/10',
    glow: 'shadow-[0_0_25px_#6F42C180]',
    icon: 'https://cdn-icons-png.flaticon.com/512/25/25231.png',
    accent: '#6F42C1',
  },
  {
    name: 'Strava',
    provider: 'strava',
    authType: 'oauth',
    color: 'from-[#FC4C02]/30 to-[#FF6B3B]/10',
    glow: 'shadow-[0_0_25px_#FC4C0260]',
    icon: 'https://upload.wikimedia.org/wikipedia/commons/c/cb/Strava_Logo.svg',
    accent: '#FC4C02',
  },
  {
    name: 'LinkedIn',
    provider: 'linkedin',
    authType: 'oauth',
    color: 'from-[#0A66C2]/30 to-[#0077B5]/10',
    glow: 'shadow-[0_0_25px_#0A66C260]',
    icon: 'https://upload.wikimedia.org/wikipedia/commons/c/ca/LinkedIn_logo_initials.png',
    accent: '#0A66C2',
  },
  {
    name: 'Telegram',
    provider: 'telegram',
    authType: 'manual',
    color: 'from-[#0088CC]/30 to-[#229ED9]/10',
    glow: 'shadow-[0_0_25px_#0088CC60]',
    icon: 'https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg',
    accent: '#0088CC',
  },
  {
    name: 'Duolingo',
    provider: 'duolingo',
    authType: 'manual',
    color: 'from-[#58CC02]/30 to-[#7ACF00]/10',
    glow: 'shadow-[0_0_25px_#58CC0260]',
    icon: 'https://design.duolingo.com/0ae09c1b67d1113e0ac1.svg',
    accent: '#58CC02',
  },
  {
    name: 'Letterboxd',
    provider: 'letterboxd',
    authType: 'comingSoon',
    color: 'from-[#2C3440]/30 to-[#445566]/10',
    glow: 'shadow-[0_0_25px_#00A0E960]',
    icon: 'https://a.ltrbxd.com/logos/letterboxd-logo-v-neg-rgb.svg',
    accent: '#00A0E9',
  },
];

/** Providers a user can actually connect to today (excludes "coming soon"). */
export const CONNECTABLE_SERVICES = SERVICES.filter((s) => s.authType !== 'comingSoon');

export const OAUTH_PROVIDERS = SERVICES.filter((s) => s.authType === 'oauth').map((s) => s.provider);
export const MANUAL_PROVIDERS = SERVICES.filter((s) => s.authType === 'manual').map((s) => s.provider);

export type ConnectionStatus = 'connected' | 'pending' | 'expired' | 'error' | 'never';

export interface ConnectionInfo {
  provider: string;
  status: ConnectionStatus;
  connectedAt?: string;
  expiresAt?: string;
  metadata?: Record<string, unknown> | null;
  lastError?: string | null;
}

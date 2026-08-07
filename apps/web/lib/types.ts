export interface SpotifyData {
  topSong: string;
  topArtist: string;
  minutes: number;
  topGenre: string;
  trackImage?: string;
  artistImage?: string;
  recentTrackCount?: number;
  minutesNote?: string;
}

export interface YouTubeData {
  channelName: string;
  topVideo: string;
  watchHours: number;
  topCategory: string;
  subscriberCount?: string;
  viewCount?: string;
  recentSub?: string;
  likedVideoCount?: number;
  watchHoursNote?: string;
}

export interface GitHubData {
  username: string;
  commits: number;
  topRepo: string;
  languages: string[];
  totalStars: number;
}

export interface StravaData {
  distanceKm: number;
  activities: number;
}

export interface DuolingoData {
  streakDays: number;
  xp: number;
  language: string;
}

export interface AggregatedData {
  totalHours: number;
  topCategory: string;
}

export type ProviderErrorKind = 'not_connected' | 'token_expired' | 'token_revoked' | 'fetch_error';

export interface ProviderStatus {
  ok: boolean;
  error?: ProviderErrorKind;
  message?: string;
}

export interface WrapData {
  spotify?: SpotifyData;
  google?: YouTubeData;
  github?: GitHubData;
  strava?: StravaData;
  duolingo?: DuolingoData;
  aggregated?: AggregatedData;
  providerStatus?: Record<string, ProviderStatus>;
}

/** Sanitized subset of WrapData safe to render on a public, unauthenticated share page. */
export interface PublicWrapSnapshot {
  year: number;
  displayName: string | null;
  totalHours: number;
  topArtist?: string;
  topSong?: string;
  commits?: number;
  distanceKm?: number;
  streakDays?: number;
}

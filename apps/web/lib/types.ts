export interface SpotifyData {
  topSong: string;
  topArtist: string;
  minutes: number;
  topGenre: string;
  trackImage?: string;
  artistImage?: string;
}

export interface YouTubeData {
  channelName: string;
  topVideo: string;
  watchHours: number;
  topCategory: string;
  subscriberCount?: string;
  viewCount?: string;
  recentSub?: string;
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

export interface WrapData {
  spotify?: SpotifyData;
  google?: YouTubeData;
  github?: GitHubData;
  strava?: StravaData;
  duolingo?: DuolingoData;
  aggregated?: AggregatedData;
}

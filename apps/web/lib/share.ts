import { PublicWrapSnapshot, WrapData } from './types';

/**
 * Reduces full wrap data to the highlight stats already shown on the in-app
 * share card. Keeps public snapshots from leaking anything the user didn't
 * already choose to put on their share card (usernames, channel names, etc).
 */
export function buildPublicSnapshot(
  data: WrapData,
  year: number,
  displayName: string | null,
): PublicWrapSnapshot {
  return {
    year,
    displayName,
    totalHours: data.aggregated?.totalHours ?? 0,
    topArtist: data.spotify?.topArtist,
    topSong: data.spotify?.topSong,
    commits: data.github?.commits,
    distanceKm: data.strava?.distanceKm,
    streakDays: data.duolingo?.streakDays,
  };
}

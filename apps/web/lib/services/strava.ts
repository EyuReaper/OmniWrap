import { BaseService } from './base';
import { fetchWithRetry } from '../retry';

const STRAVA_API = 'https://www.strava.com/api/v3';
const STRAVA_PER_PAGE = 200; // Strava's maximum page size
const STRAVA_MAX_PAGES = 30; // safety cap (~6000 activities)

interface StravaActivity {
  distance: number;
  sport_type?: string;
  type?: string;
  total_elevation_gain?: number;
}

export class StravaService extends BaseService {
  constructor(
    userId: string,
    private year: number,
  ) {
    super(userId, 'strava');
  }

  async fetchData() {
    try {
      const accessToken = await this.getAccessToken();
      const headers = { Authorization: `Bearer ${accessToken}` };

      // 1. Get Athlete Profile
      const athleteResponse = await fetchWithRetry(`${STRAVA_API}/athlete`, { headers });
      if (!athleteResponse.ok) throw new Error(`Strava athlete API returned ${athleteResponse.status}`);
      const athlete = (await athleteResponse.json()) as { firstname?: string; lastname?: string };

      // 2. Fetch ALL activities for the year, paged. Strava caps per_page at
      //    200 and returns newest-first, so loop until a short/empty page.
      const after = Math.floor(new Date(`${this.year}-01-01T00:00:00Z`).getTime() / 1000);
      const before = Math.floor(new Date(`${this.year}-12-31T23:59:59Z`).getTime() / 1000);

      let totalDistance = 0; // meters
      let elevationGain = 0; // meters
      let activities = 0;
      const activityCounts: { [key: string]: number } = {};

      for (let page = 1; page <= STRAVA_MAX_PAGES; page++) {
        const url =
          `${STRAVA_API}/athlete/activities?after=${after}&before=${before}` +
          `&per_page=${STRAVA_PER_PAGE}&page=${page}`;
        const response = await fetchWithRetry(url, { headers });
        if (!response.ok) throw new Error(`Strava activities API returned ${response.status}`);

        const batch = (await response.json()) as StravaActivity[];
        // Defensive: Strava can return an error object (e.g. { message, errors })
        // with a 2xx shape in some edge cases — treat a non-array as failure.
        if (!Array.isArray(batch)) throw new Error('Strava returned an unexpected activities payload');
        if (batch.length === 0) break;

        for (const activity of batch) {
          totalDistance += activity.distance;
          elevationGain += activity.total_elevation_gain || 0;
          const type = activity.sport_type || activity.type || 'Unknown';
          activityCounts[type] = (activityCounts[type] || 0) + 1;
          activities += 1;
        }

        if (batch.length < STRAVA_PER_PAGE) break;
      }

      const topSport = Object.entries(activityCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || 'Run';

      return {
        athleteName:
          athlete.firstname && athlete.lastname ? `${athlete.firstname} ${athlete.lastname}` : undefined,
        distanceKm: Math.round(totalDistance / 1000),
        activities,
        topSport,
        elevationGain: Math.round(elevationGain),
      };
    } catch (error) {
      this.handleError(error);
    }
  }
}
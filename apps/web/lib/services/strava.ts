import { BaseService } from './base';

export class StravaService extends BaseService {
  constructor(userId: string) {
    super(userId, 'strava');
  }

  async fetchData() {
    try {
      const accessToken = await this.getAccessToken();

      // 1. Get Athlete Profile
      const athleteResponse = await fetch('https://www.strava.com/api/v3/athlete', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const athlete = await athleteResponse.json();

      // 2. Get 2025 Activities
      const after = Math.floor(new Date('2025-01-01T00:00:00Z').getTime() / 1000);
      const activitiesResponse = await fetch(`https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=100`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const activities = await activitiesResponse.json();

      let totalDistance = 0;
      const activityCounts: { [key: string]: number } = {};

      interface StravaActivity {
        distance: number;
        sport_type?: string;
        type?: string;
        total_elevation_gain?: number;
      }

      activities.forEach((activity: StravaActivity) => {
        totalDistance += activity.distance; // in meters
        const type = activity.sport_type || activity.type || 'Unknown';
        activityCounts[type] = (activityCounts[type] || 0) + 1;
      });

      // Find top sport
      const topSport = Object.entries(activityCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || 'Running';

      return {
        athleteName: athlete.firstname + ' ' + athlete.lastname,
        distanceKm: Math.floor(totalDistance / 1000),
        activities: activities.length,
        topSport: topSport,
        elevationGain: activities.reduce((acc: number, cur: StravaActivity) => acc + (cur.total_elevation_gain || 0), 0),
      };
    } catch (error) {
      this.handleError(error);
    }
  }
}

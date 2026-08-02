import { describe, it, expect, vi } from 'vitest';

// Mock Prisma client to prevent actual DB connections in unit tests
vi.mock('@/lib/prisma', () => ({
  prisma: {
    connection: {
      findMany: vi.fn(),
    },
    wrap: {
      upsert: vi.fn(),
    },
  },
}));

import { Aggregator } from '../aggregator';
import { WrapData } from '../../types';

describe('Aggregator - calculateTopCategory Logic', () => {
  const aggregator = new Aggregator('test-user-id');

  /** Score-only fixtures; cast because calculateTopCategory only reads numeric fields. */
  const scoreOnly = (data: {
    spotify?: { minutes: number };
    google?: { watchHours: number };
    github?: { commits: number };
    strava?: { distanceKm: number };
  }) => data as WrapData;

  it('should identify "Music" as top category when Spotify minutes yield the highest score', () => {
    const wrapData = scoreOnly({
      spotify: { minutes: 6000 }, // score = 6000
      google: { watchHours: 20 },  // score = 20 * 60 = 1200
      github: { commits: 100 },    // score = 100 * 10 = 1000
      strava: { distanceKm: 50 },  // score = 50 * 5 = 250
    });

    const topCategory = aggregator.calculateTopCategory(wrapData);
    expect(topCategory).toBe('Music');
  });

  it('should identify "Video" as top category when YouTube watch hours yield the highest score', () => {
    const wrapData = scoreOnly({
      spotify: { minutes: 500 },  // score = 500
      google: { watchHours: 150 }, // score = 150 * 60 = 9000
      github: { commits: 200 },    // score = 200 * 10 = 2000
      strava: { distanceKm: 100 }, // score = 100 * 5 = 500
    });

    const topCategory = aggregator.calculateTopCategory(wrapData);
    expect(topCategory).toBe('Video');
  });

  it('should identify "Code" as top category when GitHub commits yield the highest score', () => {
    const wrapData = scoreOnly({
      spotify: { minutes: 100 },  // score = 100
      google: { watchHours: 5 },   // score = 300
      github: { commits: 1500 },  // score = 1500 * 10 = 15000
      strava: { distanceKm: 20 },  // score = 100
    });

    const topCategory = aggregator.calculateTopCategory(wrapData);
    expect(topCategory).toBe('Code');
  });

  it('should identify "Fitness" as top category when Strava distance yields the highest score', () => {
    const wrapData = scoreOnly({
      spotify: { minutes: 200 },   // score = 200
      google: { watchHours: 2 },    // score = 120
      github: { commits: 10 },     // score = 100
      strava: { distanceKm: 1000 },// score = 1000 * 5 = 5000
    });

    const topCategory = aggregator.calculateTopCategory(wrapData);
    expect(topCategory).toBe('Fitness');
  });

  it('should handle missing or empty provider data without crashing', () => {
    const wrapData: WrapData = {};

    const topCategory = aggregator.calculateTopCategory(wrapData);
    expect(typeof topCategory).toBe('string');
    expect(['Music', 'Video', 'Code', 'Fitness']).toContain(topCategory);
  });
});

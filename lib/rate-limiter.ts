/**
 * GenForge Rate Limiter & Spending Cap Tracker
 * Enforces per-IP per-minute, per-IP per-day, and global daily limits.
 */

import { config } from './config.ts';

interface IpUsage {
  minuteBucket: number[];
  dayBucket: number[];
}

class RateLimiter {
  private ipRecords: Map<string, IpUsage> = new Map();
  private globalDailyCount = 0;
  private currentDay = new Date().toISOString().slice(0, 10);

  private resetDailyIfNewDay() {
    const today = new Date().toISOString().slice(0, 10);
    if (today !== this.currentDay) {
      this.currentDay = today;
      this.globalDailyCount = 0;
      this.ipRecords.clear();
    }
  }

  public checkAndIncrement(ip: string): { allowed: boolean; reason?: string; remainingQuota: { ipMinute: number; ipDay: number; globalDay: number } } {
    this.resetDailyIfNewDay();
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    // Check Global Cap
    if (this.globalDailyCount >= config.GLOBAL_PER_DAY) {
      return {
        allowed: false,
        reason: `Global daily request cap reached (${config.GLOBAL_PER_DAY} requests). Please try again tomorrow.`,
        remainingQuota: { ipMinute: 0, ipDay: 0, globalDay: 0 },
      };
    }

    let record = this.ipRecords.get(ip);
    if (!record) {
      record = { minuteBucket: [], dayBucket: [] };
      this.ipRecords.set(ip, record);
    }

    // Prune stale timestamps
    record.minuteBucket = record.minuteBucket.filter(t => t > oneMinuteAgo);
    record.dayBucket = record.dayBucket.filter(t => t > oneDayAgo);

    // Check IP Per-Minute
    if (record.minuteBucket.length >= config.PER_IP_PER_MINUTE) {
      return {
        allowed: false,
        reason: `Too many requests. Limit is ${config.PER_IP_PER_MINUTE} requests per minute.`,
        remainingQuota: {
          ipMinute: 0,
          ipDay: Math.max(0, config.PER_IP_PER_DAY - record.dayBucket.length),
          globalDay: Math.max(0, config.GLOBAL_PER_DAY - this.globalDailyCount),
        },
      };
    }

    // Check IP Per-Day
    if (record.dayBucket.length >= config.PER_IP_PER_DAY) {
      return {
        allowed: false,
        reason: `Daily quota exceeded for this IP (${config.PER_IP_PER_DAY} requests/day).`,
        remainingQuota: {
          ipMinute: 0,
          ipDay: 0,
          globalDay: Math.max(0, config.GLOBAL_PER_DAY - this.globalDailyCount),
        },
      };
    }

    // Record request
    record.minuteBucket.push(now);
    record.dayBucket.push(now);
    this.globalDailyCount++;

    return {
      allowed: true,
      remainingQuota: {
        ipMinute: config.PER_IP_PER_MINUTE - record.minuteBucket.length,
        ipDay: config.PER_IP_PER_DAY - record.dayBucket.length,
        globalDay: config.GLOBAL_PER_DAY - this.globalDailyCount,
      },
    };
  }

  public getQuota(ip: string) {
    this.resetDailyIfNewDay();
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    const record = this.ipRecords.get(ip) || { minuteBucket: [], dayBucket: [] };
    const minuteCount = record.minuteBucket.filter(t => t > oneMinuteAgo).length;
    const dayCount = record.dayBucket.filter(t => t > oneDayAgo).length;

    return {
      perMinuteLimit: config.PER_IP_PER_MINUTE,
      perDayLimit: config.PER_IP_PER_DAY,
      globalLimit: config.GLOBAL_PER_DAY,
      remainingPerMinute: Math.max(0, config.PER_IP_PER_MINUTE - minuteCount),
      remainingPerDay: Math.max(0, config.PER_IP_PER_DAY - dayCount),
      remainingGlobal: Math.max(0, config.GLOBAL_PER_DAY - this.globalDailyCount),
      globalUsed: this.globalDailyCount,
    };
  }
}

export const rateLimiter = new RateLimiter();

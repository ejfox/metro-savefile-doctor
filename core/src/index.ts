/**
 * Metro Savefile Doctor - Core Library
 * Browser-compatible utilities for reading/writing .metro save files
 */

// Types
export * from './types.js';

// Metro file loader
export {
  parseMetroBuffer,
  serializeMetroSave,
  parseJsonSave,
  serializeJsonSave,
  isMetroFormat,
} from './metro-loader.js';

// Analysis functions
export { analyzeRoutes } from './analysis/route-analysis.js';
export type { RouteAnalysisResult, RouteInfo, TrainsByRoute } from './analysis/route-analysis.js';

export { analyzeOrphans } from './analysis/orphan-analysis.js';
export type { OrphanAnalysisResult, OrphanedTrackStats } from './analysis/orphan-analysis.js';

export { analyzeTrackCoverage } from './analysis/track-coverage.js';
export type { TrackCoverageResult, Bounds } from './analysis/track-coverage.js';

export { checkRouteCompleteness } from './analysis/route-completeness.js';
export type { RouteCompletenessResult, RouteCompletenessInfo } from './analysis/route-completeness.js';

// Utility functions
export function formatMoney(amount: number): string {
  if (amount >= 1_000_000_000) {
    return '$' + (amount / 1_000_000_000).toFixed(1) + 'B';
  }
  if (amount >= 1_000_000) {
    return '$' + (amount / 1_000_000).toFixed(1) + 'M';
  }
  if (amount >= 1_000) {
    return '$' + (amount / 1_000).toFixed(1) + 'K';
  }
  return '$' + amount.toLocaleString();
}

export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

export function formatNumber(num: number): string {
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(1) + 'B';
  }
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1) + 'M';
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1) + 'K';
  }
  return num.toLocaleString();
}

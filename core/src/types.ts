/**
 * Metro savefile type definitions
 */

export interface SaveStats {
  stations: number;
  routes: number;
  trains: number;
  money: number;
  elapsedSeconds: number;
}

export interface MetroSaveData {
  name: string;
  cityCode: string;
  timestamp: number;
  gameSessionId: string;
  stats: SaveStats;
  data: SaveGameData;
  /** Full decompressed bundle { mainSave, autosaves, ... } — preserved for lossless writes */
  _bundle?: any;
  /** Whether the file used the mainSave/autosaves bundle shape */
  _isBundle?: boolean;
  _headerBuffer?: Uint8Array;
  /** Lightweight autosave index (metadata region, preserved verbatim) */
  _autosaveIndex?: any[];
  /** Preserved thumbnail PNG bytes (empty/undefined if none) */
  _thumbnail?: Uint8Array;
}

export interface SaveGameData {
  money: number;
  elapsedSeconds: number;
  ownedTrainCount?: number;
  transitCost?: number;
  gameMode?: 'easy' | 'normal' | 'hard';
  stations?: Station[];
  routes?: Route[];
  trains?: Train[];
  tracks?: Track[];
  trackGroups?: TrackGroup[];
  stNodes?: StNode[];
  [key: string]: any;
}

export interface Station {
  id: string;
  name: string;
  routeIds?: string[];
  stNodeIds?: string[];
  trackIds?: string[];
  [key: string]: any;
}

export interface Route {
  id: string;
  name: string;
  bullet?: string;
  color: string;
  active: boolean;
  visible: boolean;
  stopIds?: string[];
  stNodes?: Array<{ id: string; center?: [number, number] }>;
  stCombos?: Array<{ path?: Array<{ trackId: string }> }>;
  parentRouteId?: string;
  isVariant?: boolean;
  [key: string]: any;
}

export interface Train {
  id: string;
  routeId: string;
  motion?: { speed: number };
  stuckDetection?: { lastMovementTime: number };
  [key: string]: any;
}

export interface Track {
  id: string;
  buildType: string;
  displayType: string;
  coords?: [number, number][];
  [key: string]: any;
}

export interface TrackGroup {
  trackIds: string[];
  [key: string]: any;
}

export interface StNode {
  id: string;
  [key: string]: any;
}

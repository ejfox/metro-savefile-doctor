/**
 * Metro savefile type definitions
 */

export interface SaveStats {
  stations: number;
  routes: number;
  trains: number;
  money: number;
}

export interface MetroSaveData {
  name: string;
  cityCode: string;
  timestamp: number;
  gameSessionId: string;
  stats: SaveStats;
  data: SaveGameData;
  _headerBuffer?: Uint8Array;
  _autosaveIndex?: any[];
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

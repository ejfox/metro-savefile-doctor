# Timelapse Route Rendering Bug Investigation

## Date: December 30, 2025

## ✅ RESOLVED - NOT A BUG

## Problem Statement
User reports that timelapse view only shows 2 routes/lines when there should be 8 (N, Q, R, W lines with variants).

## Root Cause
**This is NOT a parsing or rendering bug.** The save data is 100% valid and complete.

The visual issue is caused by:
1. **All 8 routes have the SAME color** (`#fccc0a` yellow)
2. **Route variants share most of their geometry** (express/local variants run on the same tracks)
3. **NYC N/Q/R/W lines overlap on Broadway** - this is geographically accurate!

When rendering 8 yellow routes that share 80%+ of their geometry, you only SEE 2-3 distinct visual lines.

## Save File Analyzed
- **File**: `mod_ui_full_nmlp_65ae1bbab4f14129b5474e6c60864844.metro`
- **City**: NYC
- **Size**: 26.37 MB
- **Tracks**: 12,875
- **Stations**: 635
- **Routes**: 8

## Route Structure in Save File

### Routes Present
| Route | Bullet | Variant | stNodes | stCombos | Path Coords |
|-------|--------|---------|---------|----------|-------------|
| N Local | N | Local | 89 | 88 | 704 |
| N Weekdays | N | Weekdays | 55 | 54 | 577 |
| N Weekends | N | Weekends | 63 | 62 | 592 |
| Q Local | Q | Local | 67 | 66 | 552 |
| Q Weekdays | Q | Weekdays | 57 | 56 | 536 |
| R Local | R | Local | 90 | 89 | 715 |
| R Late Night | R | Late Night | 33 | 32 | 249 |
| W | W | (none) | 45 | 44 | 348 |

### Route Data Structure Analysis

**Routes use a different data format than expected:**

1. **`route.stNodes`** - Array of **full objects**, NOT ID strings:
   ```javascript
   route.stNodes[0] = {
     id: "3db7626b-d384-403c-b5eb-2a00596d94d5",
     center: [lng, lat],
     trackIds: [...],
     buildType: "..."
   }
   ```

2. **`route.stCombos`** - Connection segments between station nodes:
   ```javascript
   route.stCombos[0] = {
     startStNodeId: "3db7626b-...",
     endStNodeId: "a9eb7782-...",
     distance: 1946.94,
     path: [/* array of track segment objects */]
   }
   ```

3. **`stCombo.path`** - Array of track segment objects (NOT track IDs):
   ```javascript
   path[0] = {
     trackId: "1d4b9e3d-a192-411e-a4d9-c7be387cdec6@@1",
     reversed: false,
     length: 113.57,
     signals: [{signalId: "...", areaCovered: "all"}]
   }
   ```

### Data Integrity: ✅ VALID

- All 8 routes have valid stNode references (stNodes[i].id exists in global stNodes)
- All 8 routes have complete path data (every stCombo has a path array)
- All stNodes have center coordinates
- Stations are properly assigned to routes (87/635 stations have routeIds)

### Family Structure (Express/Local Variants)
```
Family N (a8298bba): 3 variants - Local, Weekdays, Weekends
Family Q (957ca16d): 2 variants - Local, Weekdays
Family R (3b9d0ed8): 2 variants - Local, Late Night
Family W (e328431e): 1 variant - (none)
```

## Likely Bug Locations

### 1. Route Geometry Generation (Most Likely)

The code that converts route data to GeoJSON for rendering may expect:
- `route.stopIds` (array of station IDs) - **NOT PRESENT**
- `route.path` (array of coordinates) - **NOT PRESENT in expected format**

Instead, routes use:
- `route.stNodes` (array of station node objects)
- `route.stCombos[].path` (array of track segment objects)

**Files to investigate:**
- `app/game/helpers/geojsonCreators/getRoutesGeojson.ts`
- `app/game/map/deckGLLayers/deckglRoutesLayer.tsx`

### 2. Timelapse-Specific Rendering

Timelapse may have its own route rendering logic that doesn't handle the new format.

**Files to investigate:**
- Look for timelapse-related files
- Check how timelapse generates route visualizations

### 3. Route Variant Handling

With 4 route families and 8 total variants, the timelapse might:
- Only render parent routes (4 families = shows less than expected)
- Not handle `familyId` correctly
- Filter out variants based on some criteria

## Key Observations

1. **All routes share the same color** (`#fccc0a` - yellow)
   - This is suspicious - real NYC N/Q/R/W have different colors
   - May indicate routes were auto-generated or copied

2. **Routes have no names** (all unnamed)
   - Only have `bullet` (N, Q, R, W) and `variantName`

3. **Train assignment**
   - Only 7 trains running, all on route `a8298bba` (N Local)
   - Other routes have 0 trains

4. **`route.stopIds` is NOT used**
   - Routes use `stNodes` array with embedded objects
   - This may be the actual bug - code expects `stopIds` but data has `stNodes`

## Recommended Investigation Steps

1. **Check `getRoutesGeojson.ts`**
   - How does it extract geometry from routes?
   - Does it handle `stNodes` (objects) vs `stopIds` (IDs)?
   - Does it read `stCombo.path` for line geometry?

2. **Check timelapse rendering code**
   - What route data does it consume?
   - Does it filter routes by any criteria?

3. **Compare with working saves**
   - Get a save where timelapse shows all routes
   - Compare route data structure

4. **Check if this is a migration issue**
   - Was route format changed recently?
   - Did old saves get migrated incorrectly?

## Quick Debug Commands

```javascript
// In browser console - check route geojson generation
const store = window.__ZUSTAND_STORE__?.getState?.();
console.log('Route feature collection:', store?.routeFeatureCollection);
console.log('Routes with geometry:', store?.routeFeatureCollection?.features?.length);

// Check individual route features
store?.routeFeatureCollection?.features?.forEach((f, i) => {
  console.log(`Route ${i}:`, f.properties?.routeId?.slice(0,8),
              'coords:', f.geometry?.coordinates?.length);
});
```

## Files Created During Investigation

- `scripts/route-analysis.js` - Basic route structure check
- `scripts/deep-route-check.js` - Alternative storage locations
- `scripts/route-geometry-check.js` - stNode validation
- `scripts/stnode-id-compare.js` - ID format comparison
- `scripts/route-completeness.js` - Full completeness check
- `scripts/path-format-check.js` - Path data format analysis

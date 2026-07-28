# Changelog

All notable changes to Metro Savefile Doctor are documented here.

## [1.2.0]

### Added
- **Export** saves to GIS and spreadsheet formats: GeoJSON, KML, KMZ, and CSV
  (stations, routes, tracks). Stations become points; tracks and routes become
  lines, with routes assembled from their track path and styled by line color.
- Node CLI: `npm run export -- <save> <format> [output]`.
- Desktop **EXPORT** panel in the sidebar.

### Fixed
- **Lossless `.metro` writes.** The writer now preserves the entire save bundle —
  main save, all autosaves (with their full data), timelapse frames, viewport,
  and version — instead of rebuilding a lossy subset. Previous versions destroyed
  autosaves and timelapse data when saving an edited file.
- **Thumbnail preserved.** The save thumbnail is kept and its header offsets are
  written correctly; earlier versions left a stale offset that corrupted the
  thumbnail shown in the game's menu.
- **Accurate header stats.** Money, station/route/train counts, and elapsed time
  are recomputed into the header on save, so the game's home menu reflects your
  edits without having to load the save.

## [1.1.0]

- Desktop app (macOS / Windows / Linux) with drag & drop, quick editing,
  analysis reports, and auto-backup.

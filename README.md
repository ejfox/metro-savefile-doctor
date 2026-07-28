# 🏥 Subway Builder Savefile Doctor

A beautiful TUI (Text User Interface) tool for editing Subway Builder save files.

## Desktop App

**[Download the latest release](https://github.com/ejfox/metro-savefile-doctor/releases/latest)**

Cross-platform desktop app with a crackintro aesthetic:
- **macOS**: `.dmg` (Apple Silicon & Intel)
- **Windows**: `.msi` installer
- **Linux**: `.AppImage` / `.deb` / `.rpm`

Features drag & drop, quick editing, analysis reports, and auto-backup.

## Features

- 💰 **Edit Money** - Give yourself unlimited cash
- ⏱️ **Edit Game Time** - Change elapsed simulation time
- 🚆 **Edit Train Count** - Change owned train count
- 🎫 **Edit Transit Cost** - Change ticket price for riders
- 🗺️ **Export** - GeoJSON, KML, KMZ, and CSV (stations / routes / tracks)
- 💾 **Auto Backup** - Creates backups before modifying
- 📦 **Binary Format Support** - Handles both JSON and .metro binary saves
- ✨ **Beautiful TUI** - Interactive terminal interface with colors

### Lossless writes

The `.metro` writer preserves the **entire** save bundle — main save, all
autosaves (with full data), timelapse frames, viewport, version, and the
thumbnail — and only rewrites the fields you edit. It also recomputes the header
stats so the game's home menu shows your edited money/stations immediately.

## Export

Turn any save into a GIS or spreadsheet file. Stations become points, tracks and
routes become lines (routes are assembled from their track path and keep their
line color).

```bash
# tsx or bun
npm run export -- ~/saves/my-city.metro geojson
npm run export -- ~/saves/my-city.metro kml
npm run export -- ~/saves/my-city.metro kmz            # zipped KML for Google Earth
npm run export -- ~/saves/my-city.metro csv-stations
npm run export -- ~/saves/my-city.metro csv-routes ./routes.csv   # explicit output path
```

Formats: `geojson` · `kml` · `kmz` · `csv-stations` · `csv-routes` · `csv-tracks`.
Open GeoJSON at [geojson.io](https://geojson.io) or in QGIS; open KML/KMZ in
Google Earth. In the desktop app, use the **EXPORT** panel.

## Installation

```bash
cd tools/savefile-doctor
npm install
chmod +x cli.js
```

## Usage

### Basic Usage

```bash
# Edit a .metro binary save file (creates backup automatically)
./cli.js ~/Documents/SubwayBuilder/my-save.metro

# Or edit a JSON save file
./cli.js ~/path/to/your-save.json
```

### Advanced Options

```bash
# Save to a different file
./cli.js my-save.json --output modified-save.json

# Don't create backup
./cli.js my-save.json --no-backup

# Install globally
npm link
savefile-doctor ~/saves/my-save.json
```

## Controls

- **Arrow Keys** - Navigate menu
- **Enter** - Edit selected field
- **Escape** - Cancel editing
- **s** - Save changes
- **q** - Quit (without saving if you haven't pressed 's')

## Examples

### Give Yourself Money

1. Run the tool: `./cli.js my-save.metro`
2. Select "💰 Money"
3. Enter new amount (e.g., `999999999`)
4. Press Enter
5. Press 's' to save

### Fix Train Count

1. Run the tool: `./cli.js my-save.metro`
2. Select "🚆 Owned Trains"
3. Enter new count (e.g., `100`)
4. Press Enter
5. Press 's' to save

## Safety

- **Automatic Backups**: By default, creates `.backup` file before modifying
- **Validation**: Checks file format before editing
- **Non-Destructive**: Original file preserved unless you save changes

## Requirements

- Node.js 18+
- Subway Builder save file (.metro binary or JSON format)

## Supported Formats

- **📦 .metro files** - Binary format with 4KB header, compressed game data, and metadata
- **📄 JSON files** - Plain JSON save files

The tool automatically detects the format and handles both seamlessly.

## Troubleshooting

**"Invalid save file format"**

- Make sure you're using a Subway Builder save file
- File must be valid JSON with `data` and `version` fields

**"File not found"**

- Check the file path is correct
- Use absolute paths or relative to current directory

## Technical Details

Built with:

- [Ink](https://github.com/vadimdemedes/ink) - React for CLIs
- [Chalk](https://github.com/chalk/chalk) - Terminal colors
- [Meow](https://github.com/sindresorhus/meow) - CLI argument parsing

## License

MIT

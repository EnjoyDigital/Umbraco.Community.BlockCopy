# Umbraco.Community.BlockCopy

Copy blocks between different Umbraco CMS websites running on different URLs.

Umbraco has built-in clipboard support for copying blocks within a single instance. This package extends that to work **across sites** by combining an Umbraco backoffice extension with a companion Chrome Extension that acts as a cross-origin clipboard bridge.

**Assumption:** Both sites must have the same block/element type structure (matching content type GUIDs).

## How It Works

```
  Site A                    Chrome Extension                  Site B
  +-----------------+      +------------------+      +-----------------+
  | Copy to External | ---> | chrome.storage   | ---> | Paste from      |
  |                  |      | .local           |      | External        |
  +-----------------+      +------------------+      +-----------------+
```

1. Click **"Copy to External"** on a Block List or Block Grid property on Site A
2. The Chrome extension stores the serialized block data
3. Navigate to Site B
4. Click **"Paste from External"** on a compatible property
5. Review the paste preview and confirm
6. Blocks are inserted with freshly generated keys

## Installation

### 1. Umbraco Package

Install the NuGet package into your Umbraco 17+ project:

```bash
dotnet add package Umbraco.Community.BlockCopy
```

Or add it to your `.csproj`:

```xml
<PackageReference Include="Umbraco.Community.BlockCopy" Version="1.*" />
```

The package registers two property actions on Block List and Block Grid editors:
- **Copy to External** (appears when the property has a value)
- **Paste from External** (appears when the property is writable)

### 2. Chrome Extension

The Chrome extension is required for cross-site communication. Install it in developer mode:

1. **Build the extension:**
   ```bash
   cd chrome-extension
   npm install
   npm run build
   ```

2. **Load in Chrome:**
   - Open Chrome and navigate to `chrome://extensions`
   - Enable **Developer mode** (toggle in the top-right corner)
   - Click **"Load unpacked"**
   - Select the `chrome-extension` folder (the one containing `manifest.json`)

3. **Verify:** You should see the "Umbraco Block Copy" extension in your toolbar. Click the icon to see the popup showing clipboard status.

4. **Pin it (optional):** Click the puzzle piece icon in Chrome's toolbar and pin "Umbraco Block Copy" for easy access.

> **Note:** The extension needs to be loaded on both machines/browsers where you want to copy and paste blocks. If you're working on a single machine with two Umbraco sites, one installation covers both.

### Chrome Extension Permissions

| Permission | Why |
|-----------|-----|
| `storage` | Stores copied block data in `chrome.storage.local` |
| Content script on all URLs | Detects Umbraco backoffice pages to enable the bridge |

The extension only activates on pages running the Umbraco backoffice (detected by the presence of `<umb-backoffice-main>` in the DOM). On all other pages it does nothing.

## Usage

### Copying Blocks

1. Navigate to a content node with a Block List or Block Grid property
2. Click the **three-dot menu** on the property
3. Select **"Copy to External"**
4. A notification confirms the blocks were copied
5. The Chrome extension popup will show the clipboard contents

### Pasting Blocks

1. Navigate to the target site's content node
2. Click the **three-dot menu** on a Block List or Block Grid property
3. Select **"Paste from External"**
4. Review the **paste preview** showing:
   - Source URL and timestamp
   - Number of blocks
   - Content type GUIDs (verify these match your target site)
   - Warnings for media references or editor type mismatches
5. Click **"Paste"** to confirm

> **Important:** Pasting **replaces** the current property value. It does not append blocks.

### Limitations

- **Media references** (images, files) are passed through as-is. The GUIDs may not match on the target site - you'll need to re-select media items after pasting.
- **Nested block editors** (blocks containing other Block List/Grid values) have their inner keys preserved, not regenerated. This may cause key collisions in complex scenarios.
- **Culture-variant blocks** are preserved structurally but the target site must support the same cultures.
- Chrome only (no Firefox/Safari support).

## Development

### Prerequisites

- Node.js >= 22.17.1
- npm >= 10.9.2
- .NET 9.0 SDK
- Umbraco CMS 17+

### Building

**Frontend extension:**
```bash
cd src/Umbraco.Community.BlockCopy.Client
npm install
npm run build
```

**Chrome extension:**
```bash
cd chrome-extension
npm install
npm run build
```

**.NET project:**
```bash
dotnet build
```

### Testing

**Unit tests (52 tests):**
```bash
cd src/Umbraco.Community.BlockCopy.Client
npm test
```

**Chrome extension tests (20 tests):**
```bash
cd chrome-extension
npm test
```

**E2E tests (7 tests):**
```bash
cd src/Umbraco.Community.BlockCopy.Client
npx playwright install chromium
npm run test:e2e
```

### Project Structure

```
Umbraco.Community.BlockCopy/
+-- src/
|   +-- Umbraco.Community.BlockCopy/              # .NET NuGet package
|   |   +-- BlockCopyComposer.cs
|   |   +-- wwwroot/App_Plugins/BlockCopy/         # Built frontend assets
|   +-- Umbraco.Community.BlockCopy.Client/        # Frontend extension
|       +-- src/
|       |   +-- models/        # BlockSerializer, PortableBlockData
|       |   +-- bridge/        # DOM event bridge to Chrome extension
|       |   +-- actions/       # Copy/Paste property actions
|       |   +-- modals/        # Paste preview modal
|       +-- e2e/               # Playwright E2E tests
+-- chrome-extension/                              # Chrome Extension (MV3)
|   +-- src/
|   |   +-- background.ts     # Service worker
|   |   +-- content-script.ts # Umbraco page detection + event relay
|   |   +-- popup.ts          # Extension popup UI
|   |   +-- storage/          # chrome.storage.local wrapper
|   +-- tests/                 # Vitest unit tests
+-- Umbraco.Community.BlockCopy.sln
```

## Architecture

The system has three layers:

1. **Umbraco Extension** - Property actions that serialize blocks to a `PortableBlockData` format and dispatch/receive DOM `CustomEvent`s
2. **Chrome Content Script** - Injected into Umbraco backoffice pages, relays events between the DOM and the Chrome service worker
3. **Chrome Service Worker** - Stores/retrieves block data in `chrome.storage.local`

Key regeneration on paste follows the same pattern as Umbraco's internal `UmbBlockPropertyValueCloner`, using `crypto.randomUUID()` with a fallback to `crypto.getRandomValues()` for non-secure contexts.

## Contributing

Contributions are welcome! Please open an issue or pull request.

## License

MIT

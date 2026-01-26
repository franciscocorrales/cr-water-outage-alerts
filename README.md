# Cortes de Agua CR – Avisos

Unofficial Chrome (Manifest V3) extension that monitors public water service information in Costa Rica (AyA) and notifies you when there are scheduled water service interruptions for your area.

**This extension is not affiliated with Acueductos y Alcantarillados (AyA).**

## Features

- **Multi-location support**: Add multiple specific locations (Province / Canton / District) to monitor simultaneously.
- **Instant Alerts**:
    - **In-Browser Banner**: Shows a warning banner at the bottom of any active tab when an outage is detected.
    - **System Notifications**: Shows a native OS notification.
- **Customizable**:
    - Toggle browser banners and/or system notifications on/off.
    - Choose between 12-hour (AM/PM) and 24-hour time formats.
- **Popup Dashboard**: View a detailed list of all current scheduled outages by clicking the extension icon.
- **Privacy Focused**: No personal data is collected. It only queries the public AyA API.

## Installation (Developer Mode)

1. Clone this repository:
   ```bash
   git clone https://github.com/franciscocorrales/cr-water-outage-alerts.git
   cd cr-water-outage-alerts
   ```

2. Open Chrome and go to `chrome://extensions/`.
3. Enable **Developer mode** (toggle in the top right corner).
4. Click **Load unpacked**.
5. Select the `cr-water-outage-alerts` folder.

## Configuration

1. Right-click the extension icon and select **Options** (or click the ⚙️ icon in the popup).
2. Use the dropdowns to select your Province, Canton, and District.
3. Click "Add Location". You can add as many as you need (e.g., home, work, parents' house).
4. Save your changes.

## Development

The project structure is organized as follows:

- `css/` - Stylesheets for popup, options, and content scripts.
- `js/` - Logic for background workers, UI interaction, and API handling.
- `ui/` - HTML files for the Popup and Options pages.
- `icons/` - Extension icons.

### Key Files

- `js/background.js`: Service worker that periodically checks the API for updates.
- `js/content.js`: Injected script that displays the alert banner on websites.
- `js/config.js`: Centralized constants and defaults.

## License

This project is licensed under **GPL-3.0**. See the `LICENSE` file for details.

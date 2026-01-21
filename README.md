# cr-water-outage-alerts

**Extension name (store / browser): Cortes de Agua CR – Avisos**

Unofficial Chrome (Manifest V3) extension that monitors public water service information in Costa Rica and notifies you when there are scheduled water service interruptions for a specific location.

The user‑visible name, descriptions and notifications inside the browser are in **Spanish**, to better match Costa Rican users and the Chrome Web Store audience, but the **codebase and documentation are in English**.

Currently it polls periodically and shows a desktop notification whenever an alert message is returned that is different from:

> "No existen interrupciones para esta ubicación"

## Project status

Initial minimal version (MVP):

- Periodically (every minute) checks for outages for a fixed water service location (province/canton/district).
- Avoids repeating identical notifications for the same alert message.
- Does not collect or send any personal data: it only calls a public water service API.

Planned improvements:

- Make province / canton / district configurable from the extension.
- Make the polling interval configurable (longer than 1 minute, or temporarily disabled).
- Improve Spanish copy for notifications and add a simple UI.

## Installation (development mode)

1. Clone this repository:

   ```bash
   git clone https://github.com/franciscocorrales/cr-water-outage-alerts.git
   cd cr-water-outage-alerts
   ```

2. Open Chrome and go to `chrome://extensions/`.
3. Enable **Developer mode** (top right corner).
4. Click **Load unpacked**.
5. Select this repository folder.

Chrome will load the extension using `manifest.json` and the background service worker `background.js`. From that moment it will start polling the configured public API periodically.

## License

This project is licensed under **GPL-3.0**. See the `LICENSE` file for details.

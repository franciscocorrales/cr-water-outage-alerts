// Load shared configuration for this service worker.
// In MV3 classic service workers, importScripts is supported.
importScripts('config.js');

// TODO: Future feature - Add ability to pause notifications for 1h, 8h, etc.
// This will require checking a 'pausedUntil' timestamp in storage before
// sending notifications.


/**
 * Build the full water service API URL based on configuration.
 */
function buildApiUrl(location) {
  const { baseUrl, dateRange } = AYA_CONFIG.api;
  const params = new URLSearchParams({
    FkProvincia: String(location.provinceId),
    FkCanton: String(location.cantonId),
    FkDistrito: String(location.districtId),
    FechaInicio: dateRange.from,
    FechaFin: dateRange.to
  });
  return `${baseUrl}?${params.toString()}`;
}

// Shortcuts to configuration values.
const NO_INTERRUPTIONS_PHRASE = AYA_CONFIG.phrases.noInterruptions;
const LAST_ALERT_SIGNATURE_KEY = AYA_CONFIG.storageKeys.lastAlertSignature;
const LATEST_OUTAGE_DATA_KEY = AYA_CONFIG.storageKeys.latestOutageData;
const ALARM_NAME = AYA_CONFIG.alarms.name;
const DEFAULT_PERIOD_MINUTES = AYA_CONFIG.alarms.defaultPeriodMinutes; 
const DEV_POLL_INTERVAL_MS = AYA_CONFIG.dev.pollIntervalMs; 

/**
 * @typedef {Object} AyaInterruption
 * @property {number} idInterrupcion
 * @property {string} descripcion
 * @property {string} inicioAfectacion // e.g. "19/01/2026 22:00"
 * @property {string} finAfectacion    // e.g. "20/01/2026 04:00"
 * @property {string} [locationName]   // Custom property added by us
 */

/**
 * @typedef {Object} AyaAlert
 * @property {string} type  // e.g. "Info", "Success"
 * @property {string} title // e.g. "Información", "Éxito"
 * @property {string} message
 */

/**
 * @typedef {Object} AyaResponse
 * @property {AyaAlert} alerta
 * @property {AyaInterruption[] | null} entidad
 */

async function fetchOutageInfo(location) {
  const url = buildApiUrl(location);
  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      console.warn(`Water API error for ${location.name}: ${response.status}`);
      return null;
    }
    return await response.json();
  } catch (err) {
    console.error(`Fetch error for ${location.name}`, err);
    return null;
  }
}

/**
 * Helper to convert 24h date string to 12h format if configured.
 * API format: "dd/MM/yyyy HH:mm"
 */
function formatInterruptionDates(interruption, timeFormat) {
  if (timeFormat !== '12h') return interruption;

  const fmt = (dateStr) => {
    if (!dateStr || dateStr.length < 16) return dateStr;
    const [datePart, timePart] = dateStr.split(' ');
    let [hours, minutes] = timePart.split(':');
    hours = parseInt(hours, 10);
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    return `${datePart} ${hours}:${minutes} ${ampm}`;
  };

  return {
    ...interruption,
    inicioAfectacion: fmt(interruption.inicioAfectacion),
    finAfectacion: fmt(interruption.finAfectacion)
  };
}

async function checkForOutages() {
  try {
    // 1. Get Settings
    const stored = await chrome.storage.local.get(['settings', LAST_ALERT_SIGNATURE_KEY]);
    const settings = stored.settings || {
      timeFormat: '12h',
      // Default location if none configured (San Ramón, San Juan)
      monitoredLocations: [{ provinceId: '2', cantonId: '29', districtId: '231', name: 'San Ramón' }]
    };

    const monitoredLocations = settings.monitoredLocations || [];
    if (monitoredLocations.length === 0) {
      console.debug('No monitored locations configured.');
      // Clear legacy data?
      return;
    }

    // 2. Fetch all locations
    let allInterruptions = [];
    let lastAlertInfo = null; // Store one alert object just in case

    for (const loc of monitoredLocations) {
      const data = await fetchOutageInfo(loc);
      if (!data) continue;

      /** @type {AyaResponse} */
      const response = /** @type {any} */ (data);
      const rawMessage = response.alerta && response.alerta.message ? response.alerta.message : '';
      
      // If explicit "No interruptions", we ignore this location
      if (rawMessage && rawMessage.includes(NO_INTERRUPTIONS_PHRASE)) {
        continue;
      }

      if (response.entidad && Array.isArray(response.entidad)) {
        const locInterruptions = response.entidad.map(i => ({
          ...i,
          locationName: loc.name
        }));
        allInterruptions = allInterruptions.concat(locInterruptions);
      }
      
      if (response.alerta) lastAlertInfo = response.alerta;
    }

    // 3. Process Results
    // Format dates according to settings
    const formattedInterruptions = allInterruptions.map(i => 
      formatInterruptionDates(i, settings.timeFormat)
    );

    // If no interruptions found across all locations
    if (formattedInterruptions.length === 0) {
       // Reset signature if we went from outages -> no outages
       await chrome.storage.local.set({ 
         [LAST_ALERT_SIGNATURE_KEY]: buildInterruptionsSignature([]),
         // Also update latest data so popup shows "No outages"
         [LATEST_OUTAGE_DATA_KEY]: {
            alerta: { message: NO_INTERRUPTIONS_PHRASE },
            interruptions: [],
            lastUpdated: Date.now()
         }
       });
       return;
    }

    // 4. Check for changes
    const currentSignature = buildInterruptionsSignature(formattedInterruptions);
    const lastSignature = stored[LAST_ALERT_SIGNATURE_KEY];

    const { title, message, count } = buildOutageNotificationText(lastAlertInfo, formattedInterruptions);

    // Always notify the active tab so the banner appears/updates on page load.
    notifyActiveTabOutage(title, message, formattedInterruptions);

    // Avoid spamming system notifications with the same set of interruptions.
    if (lastSignature === currentSignature) {
      return;
    }

    // Commented out as requested - OS notifications disabled for now
    // await showOutageNotification(title, message, count);
    
    await chrome.storage.local.set({ 
      [LAST_ALERT_SIGNATURE_KEY]: currentSignature,
      [LATEST_OUTAGE_DATA_KEY]: {
        alerta: lastAlertInfo,
        interruptions: formattedInterruptions,
        lastUpdated: Date.now()
      }
    });

  } catch (error) {
    console.error('Error checking water outages:', error);
  }
}

/**
 * Build a stable signature string representing the current list of
 * interruptions, used to avoid duplicate notifications. Today it
 * uses the interruption IDs and date ranges; in the future we can
 * evolve this without changing external behavior.
 *
 * @param {AyaInterruption[]} interruptions
 * @returns {string}
 */
function buildInterruptionsSignature(interruptions) {
  const minimal = interruptions.map((i) => ({
    idInterrupcion: i.idInterrupcion,
    inicioAfectacion: i.inicioAfectacion,
    finAfectacion: i.finAfectacion
  }));
  return JSON.stringify(minimal);
}

/**
 * Build the notification title and message summarizing the upcoming interruptions.
 *
 * In the future we can transform the date strings (e.g. "19/01/2026 22:00")
 * into more natural language like "from Tuesday 19, 10pm to Wednesday
 * 20, 4am" using proper date parsing/formatting.
 *
 * @param {AyaAlert | null} alerta
 * @param {AyaInterruption[]} interruptions
 * @returns {{ title: string, message: string, count: number }}
 */
function buildOutageNotificationText(alerta, interruptions) {
  const count = interruptions.length;
  const first = interruptions[0];

  const title = (alerta && alerta.title) || 'Cortes de agua programados';

  let message;
  if (count === 1) {
    message =
      `Se ha programado un corte de agua en tu zona. ` +
      `Desde ${first.inicioAfectacion} hasta ${first.finAfectacion}.`;
  } else {
    message =
      `Se han programado ${count} cortes de agua en tu zona. ` +
      `Próximo: ${first.inicioAfectacion} - ${first.finAfectacion}.`;
  }

  return { title, message, count };
}

/**
 * Show a system notification summarizing the upcoming interruptions.
 *
 * @param {string} title
 * @param {string} message
 * @param {number} count
 */
async function showOutageNotification(title, message, count) {

  console.debug('Water outage notification - about to show', { title, message, count });

  chrome.notifications.create(
    {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title,
      message,
      priority: 2,
      silent: false
    },
    (notificationId) => {
      if (chrome.runtime.lastError) {
        console.error('Water notification error', chrome.runtime.lastError);
      } else {
        console.debug('Water notification created', notificationId);
      }
    }
  );
}

/**
 * Inform the active tab (content script) about the outage so it can
 * display an in-page banner/modal.
 *
 * @param {string} title
 * @param {string} message
 * @param {AyaInterruption[]} interruptions
 */
function notifyActiveTabOutage(title, message, interruptions) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (chrome.runtime.lastError) {
      console.error('Water outage tabs query error', chrome.runtime.lastError);
      return;
    }

    const activeTab = tabs && tabs[0];
    if (!activeTab || activeTab.id == null) {
      return;
    }

    chrome.tabs.sendMessage(
      activeTab.id,
      {
        type: 'WATER_OUTAGE_ALERT',
        payload: {
          title,
          text: message,
          interruptions
        }
      },
      () => {
        if (chrome.runtime.lastError) {
          // This is expected on pages where the content script cannot run.
          console.debug('Water outage content script not available in tab', activeTab.id, chrome.runtime.lastError.message);
        }
      }
    );
  });
}

// Simple helper to test notifications from the service worker console.
// In chrome://extensions → Service worker console, you can run:
//   showTestNotification();
// to verify that Chrome/your OS is actually displaying extension notifications.
function showTestNotification() {
  chrome.notifications.create(
    {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'Prueba de notificación de agua',
      message: 'Si ves esto, las notificaciones de la extensión están funcionando.',
      priority: 2,
      silent: false
    },
    (notificationId) => {
      if (chrome.runtime.lastError) {
        console.error('Water test notification error', chrome.runtime.lastError);
      } else {
        console.debug('Water test notification created', notificationId);
      }
    }
  );
}

// Allow content scripts to trigger a fresh outage check on demand
// (e.g. on every page load) so users are more likely to see alerts
// while they are actively browsing.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message) return;
  
  if (message.type === 'TRIGGER_WATER_OUTAGE_CHECK') {
    checkForOutages()
      .then(() => {
        sendResponse({ ok: true });
      })
      .catch((error) => {
        console.error('Error in TRIGGER_WATER_OUTAGE_CHECK handler', error);
        sendResponse({ ok: false, error: String(error) });
      });
    return true; // Keep channel open
  }
  
  if (message.type === 'SETTINGS_UPDATED') {
    console.debug('Settings updated, checking outages...');
    checkForOutages();
  }
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: DEFAULT_PERIOD_MINUTES });
  // Run an immediate check on install.
  checkForOutages();
});

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: DEFAULT_PERIOD_MINUTES });
  checkForOutages();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    checkForOutages();
  }
});

// For development: keep polling frequently while the service worker is alive.
// Note: MV3 service workers are event-based, so this interval is best-effort
// and is intended only for local testing, not for production behavior.
if (DEV_POLL_INTERVAL_MS > 0) {
  setInterval(checkForOutages, DEV_POLL_INTERVAL_MS);
}

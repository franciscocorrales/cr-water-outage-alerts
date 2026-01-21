// Load shared configuration for this service worker.
// In MV3 classic service workers, importScripts is supported.
importScripts('config.js');

/**
 * Build the full water service API URL based on configuration.
 * Params are currently hard-coded via AYA_CONFIG.api.location.
 */
function buildApiUrl() {
  const { baseUrl, location, dateRange } = AYA_CONFIG.api;
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
const ALARM_NAME = AYA_CONFIG.alarms.name;
const DEFAULT_PERIOD_MINUTES = AYA_CONFIG.alarms.defaultPeriodMinutes; // TODO: make configurable via options UI
const DEV_POLL_INTERVAL_MS = AYA_CONFIG.dev.pollIntervalMs; // Development-only: poll every 10s for testing

/**
 * @typedef {Object} AyaInterruption
 * @property {number} idInterrupcion
 * @property {string} descripcion
 * @property {string} inicioAfectacion // e.g. "19/01/2026 22:00"
 * @property {string} finAfectacion    // e.g. "20/01/2026 04:00"
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

async function fetchOutageInfo() {
  const url = buildApiUrl();
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Water API error: ${response.status}`);
  }
  return response.json();
}

async function checkForOutages() {
  try {
    const data = await fetchOutageInfo();
    /** @type {AyaResponse} */
    const response = /** @type {any} */ (data);

    const alerta = response && response.alerta ? response.alerta : null;
    const interruptions = Array.isArray(response && response.entidad)
      ? /** @type {AyaInterruption[]} */ (response.entidad)
      : [];

    const rawMessage = alerta && typeof alerta.message === 'string' ? alerta.message.trim() : '';

    // Helpful for debugging in chrome://extensions background console.
    console.debug('Water outages check result', { alerta, interruptionsCount: interruptions.length, rawMessage });

    // Case: explicit "no interruptions" message.
    if (rawMessage && rawMessage.includes(NO_INTERRUPTIONS_PHRASE)) {
      await chrome.storage.local.set({ [LAST_ALERT_SIGNATURE_KEY]: buildInterruptionsSignature([]) });
      return;
    }

    // Only notify if we have at least one scheduled interruption.
    if (!interruptions.length) {
      return;
    }

    const currentSignature = buildInterruptionsSignature(interruptions);
    const stored = await chrome.storage.local.get(LAST_ALERT_SIGNATURE_KEY);
    const lastSignature = stored[LAST_ALERT_SIGNATURE_KEY];

    // Avoid spamming notifications with the same set of interruptions.
    if (lastSignature === currentSignature) {
      return;
    }

    await showOutageNotification(alerta, interruptions);
    await chrome.storage.local.set({ [LAST_ALERT_SIGNATURE_KEY]: currentSignature });
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
 * Show a notification summarizing the upcoming interruptions.
 *
 * In the future we can transform the date strings (e.g. "19/01/2026 22:00")
 * into more natural language like "from Tuesday 19, 10pm to Wednesday
 * 20, 4am" using proper date parsing/formatting.
 *
 * @param {AyaAlert | null} alerta
 * @param {AyaInterruption[]} interruptions
 */
async function showOutageNotification(alerta, interruptions) {
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

/**
 * Central configuration for the water outage checker.
 *
 * All hard-coded values live here so they can be easily changed or
 * later wired to an options UI.
 */
const AYA_CONFIG = {
  api: {
    baseUrl: 'https://apigat.aya.go.cr/sitio/api/SitioWeb/Interrupciones',
    // Dynamic locations are now handled in settings, not hardcoded here.
    dateRange: {
      from: '',
      to: ''
    }
  },
  phrases: {
    noInterruptions: 'No existen interrupciones para esta ubicación'
  },
  storageKeys: {
    lastAlertSignature: 'lastAlertSignature',
    latestOutageData: 'latestOutageData',
    settings: 'settings'
  },
  alarms: {
    name: 'checkAyaOutages',
    defaultPeriodMinutes: 60
  },
  defaults: {
    timeFormat: '12h',
    checkIntervalMinutes: 60,
    notifications: {
      browser: true,
      os: true
    }
  },
  dev: {
    pollIntervalMs: 10_000
  }
};

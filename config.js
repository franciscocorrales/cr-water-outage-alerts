/**
 * Central configuration for the water outage checker.
 *
 * All hard-coded values live here so they can be easily changed or
 * later wired to an options UI.
 */
const AYA_CONFIG = {
  api: {
    baseUrl: 'https://apigat.aya.go.cr/sitio/api/SitioWeb/Interrupciones',
    location: {
      provinceId: 2, // hardcoded for testing
      cantonId: 29, // hardcoded for testing
      districtId: 231 // hardcoded for testing
    },
    dateRange: {
      from: '',
      to: ''
    }
  },
  phrases: {
    noInterruptions: 'No existen interrupciones para esta ubicación'
  },
  storageKeys: {
    lastAlertSignature: 'lastAlertSignature'
  },
  alarms: {
    name: 'checkAyaOutages',
    defaultPeriodMinutes: 1
  },
  dev: {
    pollIntervalMs: 10_000 // Development-only: poll every 10s for testing
  }
};

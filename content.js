// Content script: listens for outage alerts from the background
// service worker and displays a simple in-page banner/modal.
console.debug('[cr-water-outage-alerts] content script loaded on', window.location.href);

const OUTAGE_BANNER_ID = 'water-outage-alert-banner';

// On each top-level page load, ask the background service worker
// to check for outages. If there are any, it will notify this
// content script via WATER_OUTAGE_ALERT so we can show a banner.
if (window.top === window) {
  try {
    chrome.runtime.sendMessage({ type: 'TRIGGER_WATER_OUTAGE_CHECK' });
  } catch (e) {
    // Ignore if messaging is not available in this context.
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.type !== 'WATER_OUTAGE_ALERT') {
    return;
  }

  const { title, text } = message.payload || {};
  if (!text) {
    return;
  }

  showOutageBanner(title || 'Cortes de agua programados', text);
});

function showOutageBanner(title, text) {
  // Reuse the same banner if it already exists.
  let existing = document.getElementById(OUTAGE_BANNER_ID);
  if (existing) {
    const messageEl = existing.querySelector('[data-outage-message]');
    if (messageEl) {
      messageEl.textContent = text;
    }
    existing.style.display = 'flex';
    return;
  }

  const container = document.createElement('div');
  container.id = OUTAGE_BANNER_ID;
  container.style.position = 'fixed';
  container.style.zIndex = '2147483647';
  container.style.left = '0';
  container.style.right = '0';
  container.style.bottom = '0';
  container.style.padding = '12px 16px';
  container.style.display = 'flex';
  container.style.alignItems = 'center';
  container.style.justifyContent = 'space-between';
  container.style.background = 'rgba(0, 0, 0, 0.9)';
  container.style.color = '#fff';
  container.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  container.style.fontSize = '14px';
  container.style.boxShadow = '0 -2px 8px rgba(0, 0, 0, 0.4)';

  const textContainer = document.createElement('div');

  if (title) {
    const titleEl = document.createElement('div');
    titleEl.textContent = title;
    titleEl.style.fontWeight = '600';
    titleEl.style.marginBottom = '2px';
    textContainer.appendChild(titleEl);
  }

  const messageEl = document.createElement('div');
  messageEl.textContent = text;
  messageEl.setAttribute('data-outage-message', 'true');
  textContainer.appendChild(messageEl);

  const closeButton = document.createElement('button');
  closeButton.textContent = 'Cerrar';
  closeButton.style.marginLeft = '16px';
  closeButton.style.padding = '4px 10px';
  closeButton.style.borderRadius = '4px';
  closeButton.style.border = 'none';
  closeButton.style.cursor = 'pointer';
  closeButton.style.background = '#f44336';
  closeButton.style.color = '#fff';
  closeButton.style.fontWeight = '500';

  closeButton.addEventListener('click', () => {
    container.style.display = 'none';
  });

  container.appendChild(textContainer);
  container.appendChild(closeButton);

  document.documentElement.appendChild(container);
}

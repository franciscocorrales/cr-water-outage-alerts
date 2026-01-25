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

  const textContainer = document.createElement('div');

  if (title) {
    const titleEl = document.createElement('div');
    titleEl.textContent = title;
    titleEl.className = 'water-outage-title';
    textContainer.appendChild(titleEl);
  }

  const messageEl = document.createElement('div');
  messageEl.textContent = text;
  messageEl.setAttribute('data-outage-message', 'true');
  textContainer.appendChild(messageEl);

  const closeButton = document.createElement('button');
  closeButton.textContent = 'Cerrar';
  closeButton.className = 'water-outage-close-btn';

  closeButton.addEventListener('click', () => {
    container.style.display = 'none';
  });

  container.appendChild(textContainer);
  container.appendChild(closeButton);

  document.documentElement.appendChild(container);
}

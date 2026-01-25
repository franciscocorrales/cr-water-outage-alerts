// Retrieve the configuration to get the storage key
// Note: In a popup, we can't easily importScripts like a service worker.
// We'll just hardcode the key or duplicate the config logic for simplicity 
// unless we change the build system. For now, duplication is safest/easiest 
// without a bundler.
const STORAGE_KEY_DATA = 'latestOutageData';

document.addEventListener('DOMContentLoaded', async () => {
  const contentEl = document.getElementById('content');
  const optionsBtn = document.getElementById('openOptions');

  if (optionsBtn) {
    optionsBtn.addEventListener('click', () => {
       if (chrome.runtime.openOptionsPage) {
         chrome.runtime.openOptionsPage();
       } else {
         window.open(chrome.runtime.getURL('options.html'));
       }
    });
  }
  
  try {
    const data = await chrome.storage.local.get(STORAGE_KEY_DATA);
    const outageData = data[STORAGE_KEY_DATA];

    if (!outageData) {
      renderEmpty(contentEl, 'No hay información disponible todavía.');
      return;
    }

    renderOutages(contentEl, outageData);
  } catch (error) {
    console.error('Error reading storage', error);
    renderEmpty(contentEl, 'Error al cargar los datos.');
  }
});

function renderEmpty(container, message) {
  container.innerHTML = `<div class="empty-state">${message}</div>`;
}

function renderOutages(container, data) {
  const { alerta, interruptions, lastUpdated } = data;

  container.innerHTML = '';

  // Show general alert message if present
  if (alerta && alerta.message) {
    const box = document.createElement('div');
    box.className = 'alert-box';
    box.textContent = alerta.message;
    container.appendChild(box);
  }

  // Show interruptions list
  if (interruptions && interruptions.length > 0) {
    const list = document.createElement('div');
    interruptions.forEach(i => {
      const item = document.createElement('div');
      item.className = 'outage-item';
      
      const dateEl = document.createElement('div');
      dateEl.className = 'outage-date';
      dateEl.textContent = `${i.inicioAfectacion} - ${i.finAfectacion}`;
      
      const locEl = document.createElement('div');
      locEl.style.fontSize = '11px';
      locEl.style.color = '#777';
      locEl.style.marginBottom = '2px';
      locEl.textContent = i.locationName || '';

      const descEl = document.createElement('div');
      descEl.className = 'outage-desc';
      descEl.textContent = i.descripcion || 'Sin descripción detallada';
      
      item.appendChild(dateEl);
      if (i.locationName) item.appendChild(locEl);
      item.appendChild(descEl);
      list.appendChild(item);
    });
    container.appendChild(list);
  } else {
    // If we have data object but no interruptions
    if (!alerta || !alerta.message) {
      renderEmpty(container, 'No hay cortes programados.');
    }
  }

  // Last updated footer
  if (lastUpdated) {
    const footer = document.createElement('div');
    footer.className = 'refresh-hint';
    const date = new Date(lastUpdated);
    footer.textContent = `Actualizado: ${date.toLocaleTimeString()}`;
    container.appendChild(footer);
  }
}

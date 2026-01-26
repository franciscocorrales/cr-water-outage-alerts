const provinceSelect = document.getElementById('provinceSelect');
const cantonSelect = document.getElementById('cantonSelect');
const districtSelect = document.getElementById('districtSelect');
const addLocationBtn = document.getElementById('addLocationBtn');
const locationList = document.getElementById('locationList');
const noLocationsMsg = document.getElementById('noLocationsMsg');
const saveBtn = document.getElementById('saveBtn');
const statusMsg = document.getElementById('statusMsg');

// Notification Checkboxes
const browserNotifCheck = document.getElementById('browserNotifCheck');
const osNotifCheck = document.getElementById('osNotifCheck');

let currentSettings = {
  timeFormat: AYA_CONFIG.defaults.timeFormat,
  notifications: { ...AYA_CONFIG.defaults.notifications },
  monitoredLocations: []
};

// --- Initialization ---

document.addEventListener('DOMContentLoaded', async () => {
  populateProvinces();
  await loadSettings();
  renderUI();
  
  // Event Listeners
  provinceSelect.addEventListener('change', onProvinceChange);
  cantonSelect.addEventListener('change', onCantonChange);
  districtSelect.addEventListener('change', checkAddButtonState);
  addLocationBtn.addEventListener('click', addLocation);
  saveBtn.addEventListener('click', saveSettings);
});

async function loadSettings() {
  const result = await chrome.storage.local.get(AYA_CONFIG.storageKeys.settings);
  if (result[AYA_CONFIG.storageKeys.settings]) {
    // Merge with defaults to ensure new keys exist
    currentSettings = { 
      ...currentSettings, 
      ...result[AYA_CONFIG.storageKeys.settings] 
    };
    
    // Ensure nested objects are merged correctly if missing
    if (!currentSettings.notifications) {
      currentSettings.notifications = { ...AYA_CONFIG.defaults.notifications };
    }
  } else {
    // Default fallback if nothing stored
    currentSettings.monitoredLocations = [
      { 
        provinceId: '2', 
        cantonId: '29', 
        districtId: '231', 
        name: 'Alajuela / San Ramón / San Juan' 
      }
    ];
  }
}

function renderUI() {
  // Time Format
  const radio = document.querySelector(`input[name="timeFormat"][value="${currentSettings.timeFormat}"]`);
  if (radio) radio.checked = true;

  // Notifications
  if (browserNotifCheck) browserNotifCheck.checked = currentSettings.notifications.browser;
  if (osNotifCheck) osNotifCheck.checked = currentSettings.notifications.os;

  // Locations List
  renderLocationList();
}

// --- Dropdown Logic ---

function populateProvinces() {
  // AYA_LOCATIONS is defined in locations.js
  if (!window.AYA_LOCATIONS || !AYA_LOCATIONS.provinces) return;
  
  Object.values(AYA_LOCATIONS.provinces).forEach(p => {
    const option = document.createElement('option');
    option.value = p.id;
    option.textContent = p.name;
    provinceSelect.appendChild(option);
  });
}

function onProvinceChange() {
  cantonSelect.innerHTML = '<option value="">Seleccionar Cantón...</option>';
  districtSelect.innerHTML = '<option value="">Seleccionar Distrito...</option>';
  cantonSelect.disabled = true;
  districtSelect.disabled = true;
  addLocationBtn.disabled = true;

  const provId = provinceSelect.value;
  if (!provId) return;

  const province = AYA_LOCATIONS.provinces[provId];
  if (province && province.cantons) {
    Object.values(province.cantons).forEach(c => {
      const option = document.createElement('option');
      option.value = c.id;
      option.textContent = c.name;
      cantonSelect.appendChild(option);
    });
    cantonSelect.disabled = false;
  }
}

function onCantonChange() {
  districtSelect.innerHTML = '<option value="">Seleccionar Distrito...</option>';
  districtSelect.disabled = true;
  addLocationBtn.disabled = true;

  const provId = provinceSelect.value;
  const cantId = cantonSelect.value;
  if (!provId || !cantId) return;

  const province = AYA_LOCATIONS.provinces[provId];
  const canton = province.cantons[cantId];
  
  if (canton && canton.districts) {
    Object.values(canton.districts).forEach(d => {
      const option = document.createElement('option');
      option.value = d.id;
      option.textContent = d.name;
      districtSelect.appendChild(option);
    });
    districtSelect.disabled = false;
  }
}

function checkAddButtonState() {
  // Button is effectively enabled by nature, but we check validity on click? 
  // Or valid logic here.
}

function addLocation() {
  const provId = provinceSelect.value;
  const cantId = cantonSelect.value;
  const distId = districtSelect.value;

  if (!provId || !cantId || !distId) return;

  // Build name
  const pName = provinceSelect.options[provinceSelect.selectedIndex].text;
  const cName = cantonSelect.options[cantonSelect.selectedIndex].text;
  const dName = districtSelect.options[districtSelect.selectedIndex].text;
  const fullName = `${pName} / ${cName} / ${dName}`;

  // Check duplicate
  const exists = currentSettings.monitoredLocations.some(
    l => l.provinceId == provId && l.cantonId == cantId && l.districtId == distId
  );
  if (exists) return;

  currentSettings.monitoredLocations.push({
    provinceId: provId,
    cantonId: cantId,
    districtId: distId,
    name: fullName
  });

  renderLocationList();
  
  // Reset selection
  provinceSelect.value = "";
  onProvinceChange(); // Trigger clear
}

function removeLocation(index) {
  currentSettings.monitoredLocations.splice(index, 1);
  renderLocationList();
}

function renderLocationList() {
  locationList.innerHTML = '';
  
  if (currentSettings.monitoredLocations.length === 0) {
    locationList.style.display = 'none';
    noLocationsMsg.style.display = 'block';
  } else {
    locationList.style.display = 'block';
    noLocationsMsg.style.display = 'none';

    currentSettings.monitoredLocations.forEach((loc, index) => {
      const div = document.createElement('div');
      div.className = 'location-item';
      
      const label = document.createElement('span');
      label.textContent = loc.name;
      
      const btn = document.createElement('button');
      btn.className = 'danger';
      btn.textContent = 'Eliminar';
      btn.onclick = () => removeLocation(index);

      div.appendChild(label);
      div.appendChild(btn);
      locationList.appendChild(div);
    });
  }
}

// --- Save ---

async function saveSettings() {
  // Update time format
  const selectedTime = document.querySelector('input[name="timeFormat"]:checked');
  if (selectedTime) {
    currentSettings.timeFormat = selectedTime.value;
  }

  // Update Notification settings
  if (browserNotifCheck) currentSettings.notifications.browser = browserNotifCheck.checked;
  if (osNotifCheck) currentSettings.notifications.os = osNotifCheck.checked;

  await chrome.storage.local.set({ [AYA_CONFIG.storageKeys.settings]: currentSettings });
  
  // Notify background logic to reload settings/re-check immediately?
  chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED' });

  statusMsg.textContent = 'Configuración guardada correctamente.';
  setTimeout(() => {
    statusMsg.textContent = '';
  }, 2000);
}

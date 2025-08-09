document.addEventListener('DOMContentLoaded', function() {
  const machineList = document.getElementById('machineList');
  const addMachineButton = document.getElementById('addMachine');
  const saveButton = document.getElementById('saveButton');
  const statusDiv = document.getElementById('status');

  let gpuData = [];

  // Disable save until machines loaded
  saveButton.disabled = true;

  // Fetch GPU demand data once on popup load
  fetch('https://app-api.salad.com/api/v2/demand-monitor/gpu')
    .then(res => res.json())
    .then(data => {
      gpuData = data;
      loadMachines();
    })
    .catch(err => {
      console.error('Failed to fetch GPU demand data:', err);
      loadMachines();  // Load anyway without GPU dropdowns
    });

  function loadMachines() {
    chrome.storage.sync.get(['machineNames'], function(result) {
      const savedMachines = result.machineNames || [];
      machineList.innerHTML = '';

      if (savedMachines.length === 0) {
        addMachineEntry();
      } else {
        savedMachines.forEach(({ machineId, customName, gpuName }) => {
          addMachineEntry(machineId, customName, gpuName);
        });
      }
      saveButton.disabled = false;
    });
  }

  function addMachineEntry(machineId = '', customName = '', gpuName = '') {
    const entry = document.createElement('div');
    entry.className = 'machine-entry';

    // Create inputs
    const machineIdInput = document.createElement('input');
    machineIdInput.type = 'text';
    machineIdInput.className = 'machineId';
    machineIdInput.placeholder = 'Machine ID';
    machineIdInput.value = machineId;

    const customNameInput = document.createElement('input');
    customNameInput.type = 'text';
    customNameInput.className = 'customName';
    customNameInput.placeholder = 'Custom Name';
    customNameInput.value = customName;

    const gpuSelect = document.createElement('select');
    gpuSelect.className = 'gpuSelect';

    // Loading option first
    const loadingOption = document.createElement('option');
    loadingOption.value = '';
    loadingOption.textContent = 'Loading GPUs...';
    gpuSelect.appendChild(loadingOption);

    // Fill GPU options after gpuData loaded
    if (gpuData.length > 0) {
      gpuSelect.innerHTML = '<option value="">Select GPU</option>';
      gpuData.forEach(({ name, displayName }) => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = displayName;
        if (name === gpuName) option.selected = true;
        gpuSelect.appendChild(option);
      });
    }

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'removeMachine';
    removeBtn.title = 'Remove this machine';
    removeBtn.textContent = '-';

    entry.appendChild(machineIdInput);
    entry.appendChild(customNameInput);
    entry.appendChild(gpuSelect);
    entry.appendChild(removeBtn);

    machineList.appendChild(entry);

    // Clear status message on input
    [machineIdInput, customNameInput, gpuSelect].forEach(el =>
      el.addEventListener('input', () => {
        statusDiv.textContent = '';
      })
    );
  }

  // Event delegation for remove buttons
  machineList.addEventListener('click', function(e) {
    if (e.target.classList.contains('removeMachine')) {
      if (machineList.children.length > 1) {
        e.target.parentElement.remove();
        statusDiv.textContent = '';
      } else {
        alert('You must have at least one machine entry.');
      }
    }
  });

  addMachineButton.addEventListener('click', () => addMachineEntry());

  saveButton.addEventListener('click', function() {
    const machineEntries = machineList.querySelectorAll('.machine-entry');
    const machineNames = [];
    const seenIds = new Set();

    for (const entry of machineEntries) {
      const machineId = entry.querySelector('.machineId').value.trim();
      const customName = entry.querySelector('.customName').value.trim();
      const gpuName = entry.querySelector('.gpuSelect').value;

      if (!machineId || !customName) {
        statusDiv.style.color = 'red';
        statusDiv.textContent = 'Please fill out all Machine ID and Custom Name fields.';
        return;
      }

      if (seenIds.has(machineId)) {
        statusDiv.style.color = 'red';
        statusDiv.textContent = `Duplicate Machine ID found: ${machineId}`;
        return;
      }

      seenIds.add(machineId);
      machineNames.push({ machineId, customName, gpuName });
    }

    chrome.storage.sync.set({ machineNames }, function() {
      if (chrome.runtime.lastError) {
        statusDiv.style.color = 'red';
        statusDiv.textContent = 'Error saving machine names.';
        console.error(chrome.runtime.lastError);
      } else {
        statusDiv.style.color = 'green';
        statusDiv.textContent = 'Machine names saved!';

        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
          if (tabs[0]?.id) {
            chrome.tabs.sendMessage(tabs[0].id, { machineNames });
          }
        });

        setTimeout(() => {
          statusDiv.textContent = '';
        }, 2500);
      }
    });
  });
});

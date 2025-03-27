document.addEventListener('DOMContentLoaded', function() {
  const machineList = document.getElementById('machineList');
  const addMachineButton = document.getElementById('addMachine');
  const saveButton = document.getElementById('saveButton');
  const statusDiv = document.getElementById('status');


  chrome.storage.sync.get(['machineNames'], function(result) {
    const savedMachines = result.machineNames || [];
    
    machineList.innerHTML = '';

    savedMachines.forEach(machine => {
      addMachineEntry(machine.machineId, machine.customName);
    });

    if (savedMachines.length === 0) {
      addMachineEntry();
    }
  });

  function addMachineEntry(machineId = '', customName = '') {
    const entry = document.createElement('div');
    entry.className = 'machine-entry';
    entry.innerHTML = `
      <input type="text" class="machineId" placeholder="Machine ID" value="${machineId}">
      <input type="text" class="customName" placeholder="Custom Name" value="${customName}">
      <button class="removeMachine">-</button>
    `;

    entry.querySelector('.removeMachine').addEventListener('click', function() {
      if (machineList.children.length > 1) {
        entry.remove();
      }
    });

    machineList.appendChild(entry);
  }

  addMachineButton.addEventListener('click', () => addMachineEntry());

  saveButton.addEventListener('click', function() {
    const machineEntries = document.querySelectorAll('.machine-entry');
    const machineNames = [];

    machineEntries.forEach(entry => {
      const machineId = entry.querySelector('.machineId').value.trim();
      const customName = entry.querySelector('.customName').value.trim();
      
      if (machineId && customName) {
        machineNames.push({ machineId, customName });
      }
    });

    chrome.storage.sync.set({machineNames: machineNames}, function() {
      statusDiv.textContent = 'Machine names saved!';
      statusDiv.style.color = 'green';
      
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {machineNames: machineNames});
      });

      setTimeout(() => {
        statusDiv.textContent = '';
      }, 2000);
    });
  });
});
function replaceMachineNames() {
    chrome.storage.sync.get(['machineNames'], function(result) {
      const machineNames = result.machineNames || [];
      
      if (machineNames.length > 0) {
        const machineIdSelectors = [
            '.css-15d7bl7.ei767vo0',  // Summary page machine ID
            '.css-cke5iv.ei767vo0',   // Checkbox area machine ID
            '.c0196',                 // Detailed earnings table machine ID
            'div[data-testid="machine-id"]' // Generic fallback selector
          ];
  
        const processElements = () => {
          machineIdSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            
            elements.forEach(element => {
              if (element.getAttribute('data-custom-name') === 'true') return;
  
              const originalMachineId = element.textContent.trim();
              
              const matchingMachine = machineNames.find(machine => 
                machine.machineId.toLowerCase() === originalMachineId.toLowerCase()
              );
              
              if (matchingMachine) {
                element.textContent = matchingMachine.customName;
                element.setAttribute('data-custom-name', 'true');
              }
            });
          });
        };
  
        processElements();
        
        const delayedAttempts = [
          500,
          1500,
          3000,
          5000
        ];
  
        delayedAttempts.forEach(delay => {
          setTimeout(processElements, delay);
        });
      }
    });
  }
  
  function setupMutationObserver() {
    const targetNode = document.body;
  
    const config = { 
      childList: true, 
      subtree: true,
      characterData: true
    };
  
    const callback = function(mutationsList, observer) {
      for(let mutation of mutationsList) {
        if (mutation.type === 'childList' || mutation.type === 'characterData') {
          replaceMachineNames();
        }
      }
    };
  
    const observer = new MutationObserver(callback);
    observer.observe(targetNode, config);
  }
  
  function init() {
    replaceMachineNames();
    setupMutationObserver();
  }
  
  init();
  
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.machineNames) {
      replaceMachineNames();
    }
  });
  
  window.addEventListener('popstate', replaceMachineNames);
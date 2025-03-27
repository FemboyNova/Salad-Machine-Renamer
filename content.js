function replaceMachineNames() {
    chrome.storage.sync.get(['machineNames'], function(result) {
      const machineNames = result.machineNames || [];
      
      if (machineNames.length > 0) {
        const machineIdSelectors = [
          '.css-15d7bl7.ei767vo0',  // Summary page machine ID
          '.css-cke5iv.ei767vo0',   // Checkbox area machine ID
          '.c0196',                 // Detailed earnings table machine ID
        ];
  
        // Combine all selectors
        const allMachineIdElements = [];
        machineIdSelectors.forEach(selector => {
          allMachineIdElements.push(...document.querySelectorAll(selector));
        });
        
        allMachineIdElements.forEach(element => {
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
      }
    });
  }
  
  function setupMutationObserver() {
    const targetNode = document.body;
  
    const config = { 
      childList: true, 
      subtree: true 
    };
  
    const callback = function(mutationsList, observer) {
      for(let mutation of mutationsList) {
        if (mutation.type === 'childList') {
          replaceMachineNames();
        }
      }
    };
  
    const observer = new MutationObserver(callback);
  
    observer.observe(targetNode, config);
  }
  
  replaceMachineNames();
  
  setupMutationObserver();
  
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.machineNames) {
      replaceMachineNames();
    }
  });
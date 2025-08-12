let gpuDemandData = null;
let machineNames = [];
let machineApiData = null;
let viewMode = 'earnings'; // Default to earnings view
let earningsHistoryCache = {};
let lifetimeEarningsCache = {};
let toggleButtonObserver = null;

async function fetchMachineApiData() {
  try {
    const res = await fetch('https://app-api.salad.com/api/v2/machines', {
      credentials: 'include'
    });
    const data = await res.json();
    machineApiData = data.items || data;
    console.log('Machine API data:', machineApiData);

    // Store lifetime earnings
    machineApiData.forEach(m => {
      lifetimeEarningsCache[m.machine_id] = m.lifetime_balance;
    });

    // Update machineNames with valid entries
    if (machineApiData && machineNames.length) {
      machineNames = machineNames.map(m => {
        const matched = machineApiData.find(apiMachine =>
          apiMachine.machine_id && (
            apiMachine.machine_id.startsWith(m.machineId) ||
            m.machineId.startsWith(apiMachine.machine_id.substring(0, 8))
          )
        );
        return {
          ...m,
          valid: !!matched,
          machineIdLong: matched ? matched.machine_id : null
        };
      }).filter(m => m.valid); // Remove invalid entries
    }
  } catch (err) {
    console.error('Failed to fetch machine API data:', err);
  }
}

async function fetchMachineEarningsHistory() {
  try {
    if (!machineApiData) return;
    
    // Clear cache if machine list has changed
    const currentMachineIds = new Set(machineApiData.map(m => m.machine_id));
    Object.keys(earningsHistoryCache).forEach(cachedId => {
      if (!currentMachineIds.has(cachedId)) {
        delete earningsHistoryCache[cachedId];
      }
    });

    // Fetch all machine histories in parallel
    await Promise.all(machineApiData.map(async machine => {
      try {
        if (!earningsHistoryCache[machine.machine_id]) {
          const res = await fetch(`https://app-api.salad.com/api/v2/machines/${machine.machine_id}/earning-history?timeframe=30d`, {
            credentials: 'include'
          });
          
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          
          const data = await res.json();
          if (data && data.earnings) {
            earningsHistoryCache[machine.machine_id] = data.earnings;
          } else {
            console.warn('Unexpected earnings data format for machine:', machine.machine_id, data);
            earningsHistoryCache[machine.machine_id] = {};
          }
        }
      } catch (err) {
        console.error(`Failed to fetch earnings for machine ${machine.machine_id}:`, err);
        earningsHistoryCache[machine.machine_id] = {};
      }
    }));
  } catch (err) {
    console.error('Failed to fetch earnings history:', err);
  }
}

async function fetchGpuDemandData() {
  try {
    const res = await fetch('https://app-api.salad.com/api/v2/demand-monitor/gpu');
    gpuDemandData = await res.json();
  } catch (err) {
    console.error('Failed to fetch GPU demand data:', err);
  }
}

function injectTableStylesAndResize() {
  const style = document.createElement('style');
  style.textContent = `
    table.c0128 { width: auto !important; min-width: 1200px !important; table-layout: auto !important; }
    table.c0128 th, table.c0128 td { white-space: nowrap !important; }
    table.c0128 th.gpuDemandHeader > div.c0120,
    table.c0128 th.earningsHeader > div.c0120 {
      display: flex !important; justify-content: center !important; align-items: center !important; text-align: center !important;
    }
    table.c0128 td.gpuDemandCell > div.c0119 > div.c0119.c0121,
    table.c0128 td.earningsCell > div.c0119 > div.c0119.c0121 {
      display: flex !important; justify-content: center !important; align-items: center !important; text-align: center !important;
    }
    .c0118 > div, .c0118 { width: auto !important; max-width: none !important; }
    .earningsCell div { justify-content: center !important; }
  `;
  document.head.appendChild(style);
}

function addViewToggleButton() {
  const container = document.querySelector('.c0118');
  if (!container) {
    setTimeout(addViewToggleButton, 500);
    return;
  }
  if (document.getElementById('viewToggleContainer')) return;

  // Create container div
  const toggleContainer = document.createElement('div');
  toggleContainer.id = 'viewToggleContainer';
  toggleContainer.style.marginBottom = '15px';
  toggleContainer.style.display = 'flex';
  toggleContainer.style.alignItems = 'center';
  toggleContainer.style.gap = '10px';

  // Create label text
  const label = document.createElement('p');
  label.className = 'c0154';
  label.textContent = 'View Type';
  label.style.margin = '0';
  label.style.fontFamily = 'Mallory, sans-serif';
  label.style.fontSize = '14px';
  label.style.color = '#DBF1C1';

  // Create toggle container
  const toggleWrapper = document.createElement('div');
  toggleWrapper.style.display = 'flex';
  toggleWrapper.style.borderRadius = '4px';
  toggleWrapper.style.overflow = 'hidden';
  toggleWrapper.style.border = '1px solid #3D5C6F';

  // Create EARNINGS button (LEFT side)
  const earningsBtn = document.createElement('button');
  earningsBtn.className = 'c0157 ' + (viewMode === 'earnings' ? 'c0159' : 'c0158');
  earningsBtn.textContent = 'Earnings';
  earningsBtn.style.border = 'none';
  earningsBtn.style.padding = '6px 12px';
  earningsBtn.style.fontFamily = 'Mallory, sans-serif';
  earningsBtn.style.fontSize = '14px';
  earningsBtn.style.cursor = 'pointer';
  earningsBtn.style.backgroundColor = viewMode === 'earnings' ? '#DBF1C1' : 'transparent';
  earningsBtn.style.color = viewMode === 'earnings' ? '#0A2133' : '#DBF1C1';
  earningsBtn.style.fontWeight = 'bold';

  // Create DEMAND button (RIGHT side)
  const demandBtn = document.createElement('button');
  demandBtn.className = 'c0157 ' + (viewMode === 'demand' ? 'c0159' : 'c0158');
  demandBtn.textContent = 'Demand';
  demandBtn.style.border = 'none';
  demandBtn.style.padding = '6px 12px';
  demandBtn.style.fontFamily = 'Mallory, sans-serif';
  demandBtn.style.fontSize = '14px';
  demandBtn.style.cursor = 'pointer';
  demandBtn.style.backgroundColor = viewMode === 'demand' ? '#DBF1C1' : 'transparent';
  demandBtn.style.color = viewMode === 'demand' ? '#0A2133' : '#DBF1C1';
  demandBtn.style.fontWeight = 'bold';

  // Add click handlers
  earningsBtn.onclick = () => {
    viewMode = 'earnings';
    updateToggleStyles();
    updateMachineElements();
  };

  demandBtn.onclick = () => {
    viewMode = 'demand';
    updateToggleStyles();
    updateMachineElements();
  };

  // Helper function to update toggle styles
  function updateToggleStyles() {
    earningsBtn.className = 'c0157 ' + (viewMode === 'earnings' ? 'c0159' : 'c0158');
    earningsBtn.style.backgroundColor = viewMode === 'earnings' ? '#DBF1C1' : 'transparent';
    earningsBtn.style.color = viewMode === 'earnings' ? '#0A2133' : '#DBF1C1';
    
    demandBtn.className = 'c0157 ' + (viewMode === 'demand' ? 'c0159' : 'c0158');
    demandBtn.style.backgroundColor = viewMode === 'demand' ? '#DBF1C1' : 'transparent';
    demandBtn.style.color = viewMode === 'demand' ? '#0A2133' : '#DBF1C1';
  }

  // Assemble the elements - Earnings first (LEFT), then Demand (RIGHT)
  toggleWrapper.appendChild(earningsBtn);
  toggleWrapper.appendChild(demandBtn);
  toggleContainer.appendChild(label);
  toggleContainer.appendChild(toggleWrapper);
  container.insertBefore(toggleContainer, container.firstChild);
}

function waitForContainerAndAddButton(retries = 10) {
  const container = document.querySelector('.c0118');
  if (container) {
    addViewToggleButton();
  } else if (retries > 0) {
    setTimeout(() => waitForContainerAndAddButton(retries - 1), 500);
  } else {
    console.warn('Container .c0118 not found, button not added.');
  }
}

function sumLastHours(history, hours) {
  if (!history || typeof history !== 'object') return 0;
  
  try {
    const entries = Object.entries(history)
      .map(([date, value]) => ({
        date: new Date(date),
        value: typeof value === 'number' ? value : 0
      }))
      .sort((a, b) => b.date - a.date)
      .slice(0, hours);
    
    return entries.reduce((sum, entry) => sum + entry.value, 0);
  } catch (err) {
    console.error('Error summing hours:', err);
    return 0;
  }
}

function addEmptyEarningsCells(row) {
  for (let i = 0; i < 5; i++) {
    const td = document.createElement('td');
    td.className = 'earningsCell';
    td.innerHTML = `
      <div class="c0119">
        <div class="c0119 c0121">N/A</div>
      </div>
    `;
    row.appendChild(td);
  }
}

function addEarningsColumnsToTable() {
  const table = document.querySelector('table.c0128');
  if (!table) return;

  const theadRow = table.querySelector('thead tr');
  const tbodyRows = table.querySelectorAll('tbody tr');

  // Remove existing headers if any
  theadRow.querySelectorAll('.earningsHeader').forEach(el => el.remove());

  // Add earnings headers
  ['GPU Name', 'Last 24h', 'Last 7d', 'Last 30d', 'Lifetime'].forEach(text => {
    const th = document.createElement('th');
    th.className = 'earningsHeader';
    th.innerHTML = `<div class="c0120"><span>${text}</span></div>`;
    theadRow.appendChild(th);
  });

  tbodyRows.forEach(row => {
    row.querySelectorAll('.earningsCell').forEach(el => el.remove());

    const machineIdCell = row.querySelector('.css-15d7bl7.ei767vo0') || row.cells[1];
    if (!machineIdCell) {
      addEmptyEarningsCells(row);
      return;
    }

    const machineIdText = machineIdCell.textContent.trim();
    const matchingMachine = machineApiData?.find(apiMachine => 
      apiMachine.machine_id.startsWith(machineIdText) || 
      machineNames.some(m => 
        m.customName === machineIdText && 
        apiMachine.machine_id.startsWith(m.machineId)
      )
    );

    if (!matchingMachine) {
      addEmptyEarningsCells(row);
      return;
    }

    // Get GPU name using the exact same logic as demand view
    const gpuInfo = gpuDemandData?.find(gpu => {
      const machineEntry = machineNames.find(m => matchingMachine.machine_id.startsWith(m.machineId));
      return machineEntry && gpu.name === machineEntry.gpuName;
    });
    
    const gpuDisplayName = gpuInfo?.displayName
      ? gpuInfo.displayName.replace(/^NVIDIA\s+/i, '')
      : 'N/A';

    const history = earningsHistoryCache[matchingMachine.machine_id] || {};
    const lifetime = lifetimeEarningsCache[matchingMachine.machine_id] || 0;

    [gpuDisplayName, 
     sumLastHours(history, 24), 
     sumLastHours(history, 168), 
     sumLastHours(history, 720), 
     lifetime
    ].forEach((value, i) => {
      const td = document.createElement('td');
      td.className = 'earningsCell';
      td.innerHTML = `
        <div class="c0119">
          <div class="c0119 c0121">
            ${i === 0 ? value : (typeof value === 'number' ? `$${value.toFixed(3)}` : 'N/A')}
          </div>
        </div>
      `;
      row.appendChild(td);
    });
  });
}

function addColumnsToExistingTable() {
  const table = document.querySelector('table.c0128');
  if (!table) return;

  const theadRow = table.querySelector('thead tr');
  const tbodyRows = table.querySelectorAll('tbody tr');

  // Avoid duplicate columns
  if (theadRow.querySelector('.gpuDemandHeader')) return;

  // Add new headers - GPU Name first, then the others
  ['GPU Name', 'GPU Demand (Tier / Util %)', 'Avg Earning Rate', 'Top 25% Earning Rate'].forEach(text => {
    const th = document.createElement('th');
    th.className = 'c0131 gpuDemandHeader';

    const divC0120 = document.createElement('div');
    divC0120.className = 'c0120';

    const span = document.createElement('span');
    span.className = 'css-1la6eeo ei767vo0';
    span.textContent = text;

    divC0120.appendChild(span);
    th.appendChild(divC0120);
    theadRow.appendChild(th);
  });

  tbodyRows.forEach(row => {
    let machineIdCell = row.querySelector('.css-15d7bl7.ei767vo0');
    if (!machineIdCell && row.cells.length >= 2) {
      machineIdCell = row.cells[1];
    }
    if (!machineIdCell) {
      // Add four empty cells (one extra for GPU Name)
      for (let i = 0; i < 4; i++) {
        const td = document.createElement('td');
        td.className = 'c0131 gpuDemandCell';

        const divC0119 = document.createElement('div');
        divC0119.className = 'c0119';

        const divInner = document.createElement('div');
        divInner.className = 'c0119 c0121';
        divInner.textContent = 'N/A';

        divC0119.appendChild(divInner);
        td.appendChild(divC0119);
        row.appendChild(td);
      }
      return;
    }

    const machineId = machineIdCell.textContent.trim();
    const matchingMachine = machineNames.find(m => m.customName.toLowerCase() === machineId.toLowerCase());

    if (!matchingMachine) {
      // Add four empty cells (GPU Name + 3 other columns)
      for (let i = 0; i < 4; i++) {
        const td = document.createElement('td');
        td.className = 'c0131 gpuDemandCell';

        const divC0119 = document.createElement('div');
        divC0119.className = 'c0119';

        const divInner = document.createElement('div');
        divInner.className = 'c0119 c0121';
        divInner.textContent = 'N/A';

        divC0119.appendChild(divInner);
        td.appendChild(divC0119);
        row.appendChild(td);
      }
      return;
    }

    const gpuInfo = gpuDemandData.find(gpu => gpu.name === matchingMachine.gpuName);

    // GPU Name cell (new column), use displayName and remove "NVIDIA " prefix
    const gpuDisplayName = gpuInfo?.displayName
      ? gpuInfo.displayName.replace(/^NVIDIA\s+/i, '')
      : 'N/A';

    const gpuNameTd = document.createElement('td');
    gpuNameTd.className = 'c0131 gpuDemandCell';
    const gpuNameOuter = document.createElement('div');
    gpuNameOuter.className = 'c0119';
    const gpuNameInner = document.createElement('div');
    gpuNameInner.className = 'c0119 c0121';
    gpuNameInner.textContent = gpuDisplayName;
    gpuNameOuter.appendChild(gpuNameInner);
    gpuNameTd.appendChild(gpuNameOuter);
    row.appendChild(gpuNameTd);

    // Combined GPU Demand (Tier / Utilization %)
    const demandTd = document.createElement('td');
    demandTd.className = 'c0131 gpuDemandCell';
    const demandOuter = document.createElement('div');
    demandOuter.className = 'c0119';
    const demandInner = document.createElement('div');
    demandInner.className = 'c0119 c0121';
    demandInner.style.whiteSpace = 'normal'; // allow wrapping if needed

    const tier = gpuInfo?.demandTierName || 'N/A';
    const util = gpuInfo?.utilizationPct != null ? gpuInfo.utilizationPct + '%' : 'N/A';
    demandInner.innerHTML = `${tier} / ${util}`;

    demandOuter.appendChild(demandInner);
    demandTd.appendChild(demandOuter);
    row.appendChild(demandTd);

    // Avg Earning Rate cell
    const avgEarningTd = document.createElement('td');
    avgEarningTd.className = 'c0131 gpuDemandCell';
    const avgOuter = document.createElement('div');
    avgOuter.className = 'c0119';
    const avgInner = document.createElement('div');
    avgInner.className = 'c0119 c0121';
    avgInner.textContent = gpuInfo?.earningRates?.avgEarningRate != null
      ? `$${gpuInfo.earningRates.avgEarningRate.toFixed(3)}`
      : 'N/A';
    avgOuter.appendChild(avgInner);
    avgEarningTd.appendChild(avgOuter);
    row.appendChild(avgEarningTd);

    // Top 25% Earning Rate cell
    const top25EarningTd = document.createElement('td');
    top25EarningTd.className = 'c0131 gpuDemandCell';
    const top25Outer = document.createElement('div');
    top25Outer.className = 'c0119';
    const top25Inner = document.createElement('div');
    top25Inner.className = 'c0119 c0121';
    top25Inner.textContent = gpuInfo?.earningRates?.top25PctEarningRate != null
      ? `$${gpuInfo.earningRates.top25PctEarningRate.toFixed(3)}`
      : 'N/A';
    top25Outer.appendChild(top25Inner);
    top25EarningTd.appendChild(top25Outer);
    row.appendChild(top25EarningTd);
  });
}

function addLegendBelowTable() {
  const container = document.querySelector('.c0118');
  if (!container) return;

  if (!document.getElementById('demandDataLegend')) {
    const legend = document.createElement('div');
    legend.id = 'demandDataLegend';

    legend.style.fontFamily = 'Mallory, BlinkMacSystemFont, -apple-system, "Work Sans", "Segoe UI", "Fira Sans", "Helvetica Neue", Helvetica, Arial, sans-serif';
    legend.style.fontSize = '12px';
    legend.style.lineHeight = '16px';
    legend.style.paddingBottom = '0px';
    legend.style.fontWeight = 'bold';
    legend.style.textAlign = 'center';
    legend.style.color = 'rgb(219, 241, 193)';
    legend.style.marginTop = '8px';
    legend.style.maxWidth = '100%';
    legend.style.overflowWrap = 'break-word';

    legend.innerHTML = `
      <strong>Note:</strong> These columns - <em>GPU Demand Tier/Util %</em>, <em>Avg Earning Rate</em>, and <em>Top 25% Earning Rate</em> - show the chosen GPU's demand information.<br>
      They <strong>do not</strong> represent the exact earnings of your machine.
    `;

    container.appendChild(legend);
  }
}

function replaceMachineIdsInTextNodes() {
  if (!machineNames.length) return;

  const machineMap = {};
  machineNames.forEach(m => {
    machineMap[m.machineId.toLowerCase()] = m.customName;
  });

  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node) {
        if (
          node.parentNode &&
          ['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT'].includes(node.parentNode.nodeName)
        ) {
          return NodeFilter.FILTER_REJECT;
        }
        const text = node.textContent.toLowerCase();
        for (const id in machineMap) {
          if (text.includes(id)) {
            return NodeFilter.FILTER_ACCEPT;
          }
        }
        return NodeFilter.FILTER_REJECT;
      }
    },
    false
  );

  let node;
  while (node = walker.nextNode()) {
    let text = node.textContent;
    for (const id in machineMap) {
      const regex = new RegExp(`\\b${id}\\b`, 'gi');
      text = text.replace(regex, machineMap[id]);
    }
    if (text !== node.textContent) {
      node.textContent = text;
    }
  }
}

function updateMachineElements() {
  if (!machineNames.length || !machineApiData) return;

  // Replace machine IDs with custom names in the list elements
  const machineIdSelector = '.css-15d7bl7.ei767vo0';
  document.querySelectorAll(machineIdSelector).forEach(el => {
    const currentText = el.textContent.trim();
    const matchingMachine = machineNames.find(m => m.machineId.toLowerCase() === currentText.toLowerCase());
    if (matchingMachine && currentText.toLowerCase() === matchingMachine.machineId.toLowerCase()) {
      el.textContent = matchingMachine.customName;
      el.setAttribute('data-custom-name', 'true');
    }
  });

  // Find the table
  const table = document.querySelector('table.c0128');
  if (!table) return;

  // Remove all previously added earnings or demand headers/cells
  [...table.querySelectorAll('.earningsHeader, .earningsCell, .gpuDemandHeader, .gpuDemandCell')].forEach(el => el.remove());

  // Add new columns based on the current view
  if (viewMode === 'earnings') {
    addEarningsColumnsToTable();
  } else if (viewMode === 'demand') {
    addColumnsToExistingTable();
    addLegendBelowTable();
  }

  replaceMachineIdsInTextNodesSafe();
}

function replaceMachineIdsInTextNodesSafe() {
  if (!machineNames.length) return;

  const machineMap = {};
  machineNames.forEach(m => {
    machineMap[m.machineId.toLowerCase()] = m.customName;
  });

  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        if (
          node.parentNode &&
          ['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT'].includes(node.parentNode.nodeName)
        ) {
          return NodeFilter.FILTER_REJECT;
        }
        const text = node.textContent.toLowerCase();

        for (const id in machineMap) {
          // Skip if already contains the custom name
          if (text.includes(id) && !text.includes(machineMap[id].toLowerCase())) {
            return NodeFilter.FILTER_ACCEPT;
          }
        }
        return NodeFilter.FILTER_REJECT;
      }
    },
    false
  );

  let node;
  while ((node = walker.nextNode())) {
    let text = node.textContent;
    for (const id in machineMap) {
      const regex = new RegExp(`\\b${id}\\b`, 'gi');
      text = text.replace(regex, machineMap[id]);
    }
    if (text !== node.textContent) {
      node.textContent = text;
    }
  }
}


async function init() {
  injectTableStylesAndResize();
  
  // Set up observer to maintain button
  if (!toggleButtonObserver) {
    toggleButtonObserver = new MutationObserver(() => {
      if (!document.getElementById('viewToggleContainer')) {
        addViewToggleButton();
      }
    });
    toggleButtonObserver.observe(document.body, { childList: true, subtree: true });
  }

  await fetchGpuDemandData();
  chrome.storage.sync.get(['machineNames'], async function(result) {
    machineNames = result.machineNames || [];
    await fetchMachineApiData();
    await fetchMachineEarningsHistory();
    updateMachineElements();
    
    // Keep your existing interval timers here
    [500, 1500, 3000, 5000, 7500].forEach(delay => {
      setTimeout(() => {
        updateMachineElements();
        if (delay === 7500) setInterval(updateMachineElements, 2000);
      }, delay);
    });
  });
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.machineNames) {
    machineNames = message.machineNames;
    if (!gpuDemandData) {
      fetchGpuDemandData().then(() => fetchMachineApiData().then(() => updateMachineElements()));
    } else {
      fetchMachineApiData().then(() => updateMachineElements());
    }
  }
});

chrome.storage.local.get('showReleaseNotes', data => {
  if (data.showReleaseNotes) {
    const banner = document.createElement('div');
    banner.textContent = 'Salad Machine Renamer Extension updated! Check the release notes in the Extension.';
    banner.style.position = 'fixed';
    banner.style.top = '0';
    banner.style.left = '0';
    banner.style.right = '0';
    banner.style.backgroundColor = 'rgb(219, 241, 193)';
    banner.style.color = '#0A2133';
    banner.style.fontWeight = '700';
    banner.style.fontFamily = 'Mallory, BlinkMacSystemFont, -apple-system, "Work Sans", "Segoe UI", "Fira Sans", "Helvetica Neue", Helvetica, Arial, sans-serif';
    banner.style.textAlign = 'center';
    banner.style.padding = '10px';
    banner.style.zIndex = '9999';
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.marginLeft = '10px';
    closeBtn.style.background = 'none';
    closeBtn.style.border = 'none';
    closeBtn.style.fontSize = '20px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.color = '#0A2133';
    closeBtn.style.fontWeight = '700';
    closeBtn.onclick = () => banner.remove();
    banner.appendChild(closeBtn);
    document.body.appendChild(banner);
    chrome.storage.local.set({ showReleaseNotes: false });
  }
});

init();

// Handle page navigation
if (document.readyState === 'complete') init();
else document.addEventListener('DOMContentLoaded', init);

// Cleanup when leaving page
window.addEventListener('beforeunload', () => {
  if (toggleButtonObserver) toggleButtonObserver.disconnect();
});
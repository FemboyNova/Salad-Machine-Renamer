let gpuDemandData = null;
let machineNames = [];

async function fetchGpuDemandData() {
  try {
    const res = await fetch('https://app-api.salad.com/api/v2/demand-monitor/gpu');
    gpuDemandData = await res.json();
  } catch (err) {
    // Silent fail
  }
}

function injectTableStylesAndResize() {
  const style = document.createElement('style');
  style.textContent = `
    table.c0128 {
      width: auto !important;
      min-width: 1200px !important;
      table-layout: auto !important;
    }

    table.c0128 th, table.c0128 td {
      white-space: nowrap !important;
    }

    /* Center text inside gpuDemandHeader th */
    table.c0128 th.gpuDemandHeader > div.c0120 {
      display: flex !important;
      justify-content: center !important;
      align-items: center !important;
      text-align: center !important;
    }

    /* Center text inside gpuDemandCell td */
    table.c0128 td.gpuDemandCell > div.c0119 > div.c0119.c0121 {
      display: flex !important;
      justify-content: center !important;
      align-items: center !important;
      text-align: center !important;
    }

    /* Container adjustments */
    .c0118 > div {
      width: auto !important;
      max-width: none !important;
    }

    .c0118 {
      width: auto !important;
      max-width: none !important;
    }
  `;
  document.head.appendChild(style);
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
  if (!machineNames.length || !gpuDemandData) return;

  const machineIdSelector = '.css-15d7bl7.ei767vo0';

  document.querySelectorAll(machineIdSelector).forEach(el => {
    const currentText = el.textContent.trim();

    const matchingMachine = machineNames.find(m =>
      m.machineId.toLowerCase() === currentText.toLowerCase()
    );

    // Only replace if the text is exactly the original machine ID
    // and not already the custom name
    if (
      matchingMachine &&
      currentText.toLowerCase() === matchingMachine.machineId.toLowerCase()
    ) {
      el.textContent = matchingMachine.customName;
      el.setAttribute('data-custom-name', 'true');
    }
  });

  addColumnsToExistingTable();
  addLegendBelowTable();

  // Prevent recursive replacement in text nodes
  replaceMachineIdsInTextNodesSafe();
}

// Safer text node replacement
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

  await fetchGpuDemandData();

  chrome.storage.sync.get(['machineNames'], function(result) {
    machineNames = result.machineNames || [];

    updateMachineElements();

    [500, 1500, 3000, 5000].forEach(delay => {
      setTimeout(() => {
        updateMachineElements();
      }, delay);
    });

    // After 7.5 seconds, start refreshing machine names every 2 seconds
    setTimeout(() => {
      setInterval(() => {
        chrome.storage.sync.get(['machineNames'], function(result) {
          machineNames = result.machineNames || [];
          updateMachineElements();
        });
      }, 2000);
    }, 7500);
  });
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.machineNames) {
    machineNames = message.machineNames;
    if (!gpuDemandData) {
      fetchGpuDemandData().then(() => updateMachineElements());
    } else {
      updateMachineElements();
    }
  }
});

// Show update banner once per extension update
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

    // Clear flag so banner shows only once
    chrome.storage.local.set({ showReleaseNotes: false });
  }
});

init();

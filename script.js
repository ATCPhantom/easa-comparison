let selectedVersions = [];
let versionMap = {};
let currentCategory = null;
let currentRegulation = null;
let globalNewTopics = [];
let globalChangedTopics = [];
let globalRemovedTopics = [];
let currentMode = 'view' // or 'export'

const titleOverrides = {
  "ERULES-1963177438-9854": "Appendix 1 Signals",
  "ERULES-1963177438-9858": "Appendix 2 Unmanned free balloons",
  "ERULES-1963177438-9865": "Appendix 3 Table of cruising levels",
  "ERULES-1963177438-9866": "Appendix 4 ATS airspace classes — services provided and flight requirements",
  "ERULES-1963177438-9875": "Appendix 5 Technical specifications related to aircraft observations and reports by voice communications",
  "ERULES-1963177438-9879": "Supplement to the ANNEX",
  "ERULES-1963177438-10422": "Table of Contents",
  "ERULES-1963177438-10418": "Commission Implementing Regulation (EU) No 923/2012"
};

const typeColorMap = {
  "IR (Implementing rule);": "#007fc2",
  "CS (Certification specification);": "#222f64",
  "DR (Delegated rule);": "#007fc2",
  "AMC to IR (Acceptable means of compliance to implementing rule);": "#fbbc39",
  "AMC to CS (Acceptable means of compliance to certification specification);": "#fbbc39",
  "GM to IR (Guidance material to implementing rule);": "#16cc7f",
  "GM to CS (Guidance material to certification specification);" : "#16cc7f"
};

const USERS = {
  "YWRtaW4=": "YWRtaW4=",
  "c3Jw": "c3Rva2tlbg==",
  "ZGVtbw==": "MTIz"
};

function handleLogin() {
  const userInput = document.getElementById("username").value;
  const passInput = document.getElementById("password").value;

  const encodedUser = btoa(userInput); // encode input to base64
  const encodedPass = btoa(passInput);

  if (USERS[encodedUser] && USERS[encodedUser] === encodedPass) {
    localStorage.setItem("isLoggedIn", "true");
    showActionScreen();
  } else {
    document.getElementById("login-error").classList.remove("d-none");
  }
}

function showActionScreen() {
  document.getElementById("login-screen").classList.add("d-none");
  document.getElementById("action-screen").classList.remove("d-none");
}

function enterViewChanges() {
  currentMode = 'view';
  document.getElementById("action-screen").classList.add("d-none");
  document.getElementById("app").classList.remove("d-none");

  // Reset buttons
  document.getElementById("compare-btn").classList.remove("d-none");
  document.getElementById("export-matrix-btn").classList.add("d-none");
  document.getElementById("compare-btn").disabled = true;
}

function enterExportMode() {
  currentMode = 'export';
  document.getElementById("action-screen").classList.add("d-none");
  document.getElementById("app").classList.remove("d-none");

  // Reset buttons
  document.getElementById("compare-btn").classList.add("d-none");
  document.getElementById("export-matrix-btn").classList.remove("d-none");
  document.getElementById("export-matrix-btn").disabled = true;
}

/*function showApp() {
  document.getElementById("login-screen").classList.add("d-none");
  document.getElementById("app").classList.remove("d-none");
}*/

function resetPage() {
  // Hide all screens
  document.getElementById("login-screen")?.classList.add("d-none");
  document.getElementById("app")?.classList.add("d-none");
  document.getElementById("action-screen")?.classList.remove("d-none");

  // Optionally reset selection state
  selectedVersions = [];
  currentRegulation = null;

  const versionButtons = document.getElementById('version-buttons');
  if (versionButtons) versionButtons.innerHTML = '';

  const versionSection = document.getElementById('version-selection');
  if (versionSection) versionSection.classList.add('d-none');
}

document.addEventListener('DOMContentLoaded', () => {
  const exportModalEl = document.getElementById('exportModal');

  if (localStorage.getItem("isLoggedIn") === "true") {
    showActionScreen();
  } else {
    // Hide app until login is successful
    document.getElementById("action-screen").classList.add("d-none");
  }
  
  fetch('data/structure.json')
    .then(res => res.json())
    .then(data => {
      versionMap = data;
      renderRegulations(data);
    });

  const colorByType = {
    ALL: "#000000",     // black
    IR: "#007fc2",      // blue
    AMC: "#fbbc39",     // orange
    GM: "#16cc7f"       // green
  };

  ["all", "ir", "amc", "gm"].forEach(t => {
    const btn = document.getElementById(`select-${t}`);
    const color = colorByType[t.toUpperCase()];

    if (btn && color) {
      btn.style.borderColor = color;
      btn.style.color = color;
      btn.style.backgroundColor = "transparent";

      // Add hover effect using a custom class
      btn.classList.add(`hover-${t}`);
    }
  });

  if (exportModalEl) {
    exportModalEl.addEventListener('hide.bs.modal', () => {
      // Delay focus just slightly to ensure modal closes first
      setTimeout(() => {
        const exportBtn = document.getElementById('export-trigger');
        if (exportBtn) {
          exportBtn.focus();
        } else {
          document.body.focus();
        }
      }, 10); // 10ms delay resolves timing with Bootstrap's aria-hidden
    });
  }
});


document.getElementById('exportModal').addEventListener('show.bs.modal', () => {
  ["ALL", "IR", "AMC", "GM"].forEach(type => {
    const btn = document.getElementById(`select-${type.toLowerCase()}`);
    if (btn) btn.textContent = `Select ${type}`;
  });
});

function renderRegulations(structure) {
  const container = document.getElementById('regulation-selection');
  container.innerHTML = '';

  // Create tab headers
  const tabHeader = document.createElement('ul');
  tabHeader.className = 'nav nav-tabs mb-3';
  tabHeader.id = 'category-tabs';

  const tabContent = document.createElement('div');
  tabContent.className = 'tab-content';
  tabContent.id = 'category-tab-content';

  let tabIndex = 0;
  Object.entries(structure).forEach(([category, regs], tabIndex) => {
    const isActive = tabIndex === 0 ? 'active' : '';
    const tabId = `tab-${tabIndex}`;
    const tabClass = `tab-${tabIndex}`; // Add a unique class

    // Tab header
    const li = document.createElement('li');
    li.className = 'nav-item';
    li.innerHTML = `
      <button class="nav-link ${isActive} ${tabClass}" data-bs-toggle="tab" data-bs-target="#${tabId}" type="button">
        ${category}
      </button>
    `;

    const button = li.querySelector('button');
    button.addEventListener('shown.bs.tab', () => {
      document.getElementById('version-selection').classList.add('d-none');
      document.getElementById('version-buttons').innerHTML = '';
      // Reset currentRegulation & currentCategory
      currentRegulation = null;
      currentCategory = null;
    });

    tabHeader.appendChild(li);

    // Tab content: buttons for sub-regulations
    const content = document.createElement('div');
    content.className = `tab-pane fade ${isActive ? 'show active' : ''}`;
    content.id = tabId;

    if (Object.keys(regs).length > 0) {
      const grid = document.createElement('div');
      grid.className = 'regulations-grid';

      Object.entries(regs).forEach(([key, versions]) => {
        const button = document.createElement('button');
        button.textContent = key.toUpperCase();
        button.onclick = () => selectRegulation(key);
        grid.appendChild(button);
      });

      content.appendChild(grid);
    } else {
      content.innerHTML = `<div class="text-muted">No available regulations.</div>`;
    }

    tabContent.appendChild(content);
    tabIndex++;
  });

  container.appendChild(tabHeader);
  container.appendChild(tabContent);
}

function selectRegulation(subfolderKey) {
  globalNewTopics = [];
  globalChangedTopics = [];
  globalRemovedTopics = [];
  selectedVersions = [];
  currentRegulation = subfolderKey;
  currentCategory = null;

  const versionButtons = document.getElementById('version-buttons');
  versionButtons.innerHTML = '';

  let versions = [];

  for (const category in versionMap) {
    if (versionMap[category][subfolderKey]) {
      versions = versionMap[category][subfolderKey];
      currentCategory = category;
      break;
    }
  }

  versions.forEach(filename => {
    const btn = document.createElement('button');
    btn.className = 'btn btn-outline-secondary version-btn';
    btn.innerText = filename.replace('.json', '');
    btn.dataset.version = filename;
    btn.onclick = () => toggleVersion(btn);
    versionButtons.appendChild(btn);
  });

  const titleEl = document.getElementById('version-selection-title');
  if (titleEl) {
    titleEl.textContent = currentMode === 'export' ? 'Select Regulation' : 'Choose Version(s)';
  }

  document.getElementById('compare-btn').disabled = true;
  document.getElementById('export-matrix-btn').disabled = true;
  document.getElementById('version-selection').classList.remove('d-none');
}

function toggleVersion(btn) {
  const version = btn.dataset.version;
  const index = selectedVersions.indexOf(version);

  if (index > -1) {
    selectedVersions.splice(index, 1);
    btn.classList.remove('active');
  } else if (selectedVersions.length < 2) {
    selectedVersions.push(version);
    btn.classList.add('active');
  }

  const exportBtn = document.getElementById('export-matrix-btn');
  const compareBtn = document.getElementById('compare-btn');

  compareBtn.disabled = !(currentMode === 'view' && [1, 2].includes(selectedVersions.length));
  exportBtn.disabled = !(currentMode === 'export' && selectedVersions.length === 1);
}

async function checkSelection(){
  if(selectedVersions.length == 1){
    displaySingle()
  }else{
    compareVersions()
  }
}

async function displaySingle(){
  const file = `json/${currentCategory}/${currentRegulation}/${selectedVersions[0]}`;
  const data = await fetch(file).then(res => res.json());
  
  const map = Object.fromEntries(data.map(t => [t.erulesId, t]));
  
  const changedTopics = [];

  for (const erulesId in map) {
    if (map[erulesId].content?.some(p => p.change === 'added')) {
      changedTopics.push(map[erulesId]);
    }
  }

  globalNewTopics = [];
  globalChangedTopics = changedTopics;
  globalRemovedTopics = [];

  renderResults(false, selectedVersions[0].replace('.json', ''), [], changedTopics, []);
}

async function compareVersions() {
  const [v1, v2] = [...selectedVersions].sort(sortVersionsByDate);
  const fileOld = `json/${currentCategory}/${currentRegulation}/${v1}`;
  const fileNew = `json/${currentCategory}/${currentRegulation}/${v2}`;

  const [oldData, newData] = await Promise.all([
    fetch(fileOld).then(res => res.json()),
    fetch(fileNew).then(res => res.json())
  ]);

  const oldMap = Object.fromEntries(oldData.map(t => [t.erulesId, t]));
  const newMap = Object.fromEntries(newData.map(t => [t.erulesId, t]));

  const newTopics = [];
  const changedTopics = [];
  const removedTopics = [];

  for (const erulesId in newMap) {
    if (!oldMap[erulesId]) {
      newTopics.push(newMap[erulesId]);
    } else if (newMap[erulesId].content?.some(p => p.change === 'added')) {
      changedTopics.push(newMap[erulesId]);
    }
  }

  for (const erulesId in oldMap) {
    if (!newMap[erulesId]) {
      removedTopics.push(oldMap[erulesId]);
    }
  }

  globalNewTopics = newTopics;
  globalChangedTopics = changedTopics;
  globalRemovedTopics = removedTopics;

  renderResults(true, [v1.replace('.json', ''), v2.replace('.json', '')], newTopics, changedTopics, removedTopics);
}

async function startExportMatrix() {
  if (currentMode === "export"){
    if (!selectedVersions.length) return;

    const file = `json/${currentCategory}/${currentRegulation}/${selectedVersions[0]}`;
    const topics = await fetch(file).then(res => res.json());

    // In full matrix export, we treat everything as selected
    globalNewTopics = topics;
  }
  exportToExcel();
}

function darkenColor(hex, amount = 20) {
  const col = hex.replace(/^#/, '');
  const num = parseInt(col, 16);

  let r = (num >> 16) - amount;
  let g = ((num >> 8) & 0x00FF) - amount;
  let b = (num & 0x0000FF) - amount;

  r = Math.max(0, r);
  g = Math.max(0, g);
  b = Math.max(0, b);

  return '#' + (r << 16 | g << 8 | b).toString(16).padStart(6, '0');
}

function renderResults(comparison=false, labels, newTopics=[], changedTopics=[], removedTopics=[]) {
  const card = document.querySelector('.selector-card');
  card.classList.add('wide');

  if (comparison) {
    card.innerHTML = `
      <div class="mb-3 text-center">
        <img src="res/logo_xs.png" class="logo" onclick="location.reload()" />
      </div>
      <h4 class="text-center mb-3 text-dark">Comparison: ${labels[0]} → ${labels[1]}</h4>

      <div class="mb-3 small text-muted">
        <span style="background:#007fc2; color:white; padding:2px 6px; border-radius:4px;">IR / DR</span>
        <span style="background:#222f64; color:white; padding:2px 6px; border-radius:4px;">CS</span>
        <span style="background:#fbbc39; color:white; padding:2px 6px; border-radius:4px;">AMC</span>
        <span style="background:#16cc7f; color:white; padding:2px 6px; border-radius:4px;">GM</span>
        <span style="background:#b3b3cc; color:white; padding:2px 6px; border-radius:4px;">Misc.</span>
      </div>

      <div class="scroll-box mb-4">
        ${renderTopicGroup('🟢 New Topics', newTopics, 'success')}
        ${renderTopicGroup('🟡 Changed Topics', changedTopics, 'warning')}
        ${renderTopicGroup('🔴 Removed Topics', removedTopics, 'danger')}
      </div>
    `;
  } else {
    const hasChanges = changedTopics.length > 0;
    const content = hasChanges
      ? `
        <div class="scroll-box mb-4">
          ${renderTopicGroup('🟡 Changed Topics', changedTopics, 'warning')}
        </div>`
      : `
        <div class="alert alert-info text-center mt-4">
          No changes were found in this version.
        </div>`;

    card.innerHTML = `
      <div class="mb-3 text-center">
        <img src="res/logo_xs.png" class="logo" onclick="location.reload()" />
      </div>

      <h4 class="text-center mb-3 text-dark">
        <span class="text-uppercase">${currentRegulation}</span> - ${labels}:
      </h4>

      <div class="mb-3 small text-muted">
        <span style="background:#007fc2; color:white; padding:2px 6px; border-radius:4px;">IR / DR</span>
        <span style="background:#222f64; color:white; padding:2px 6px; border-radius:4px;">CS</span>
        <span style="background:#fbbc39; color:white; padding:2px 6px; border-radius:4px;">AMC</span>
        <span style="background:#16cc7f; color:white; padding:2px 6px; border-radius:4px;">GM</span>
        <span style="background:#b3b3cc; color:white; padding:2px 6px; border-radius:4px;">Misc.</span>
      </div>

      <div class="text-center mb-2">
        <button id="export-trigger" class="btn btn-success btn-sm" onclick="startExportMatrix()" title="Export Compliance Matrix">
          Export to Excel <i class="bi bi-file-earmark-excel ms-1"></i>
        </button>
      </div>
      ${content}
    `;
  }
}

function renderTopicGroup(title, items, colorClass) {
  if (!items?.length) return '';

  const sectionGroups = {};

  items.forEach(item => {
    const sections = item.sections?.length ? item.sections : ['Uncategorized'];
    const key = JSON.stringify(sections); // preserves order
    if (!sectionGroups[key]) {
      sectionGroups[key] = { items: [], sections };
    }
    sectionGroups[key].items.push(item);
  });

  let html = `<div class="category-header category-${colorClass}">${title} (${items.length})</div>`;

  Object.entries(sectionGroups).forEach(([key, group], idx) => {
    //const sectionId = `section-${idx}`;
    const sectionId = getSectionId(idx, 'view')
    const sectionLines = [...group.sections].reverse().map((sec, i) => {
      // i == 0 → least specific
      // i == group.sections.length - 1 → most specific

      const isMostSpecific = i === group.sections.length - 1;
      const fontWeight = isMostSpecific ? 700 : 600;
      const fontSize = isMostSpecific ? '1.05rem' : '0.9rem';
      const marginLeft = isMostSpecific ? '0px' : `${(group.sections.length - 1 - i) * 16}px`;

      return `<div style="margin-left: ${marginLeft}; font-weight: ${fontWeight}; font-size: ${fontSize};">${sec}</div>`;
    }).join('');

    html += `
      <div class="subject-group">
        <div class="subject-header d-flex justify-content-between align-items-center" onclick="toggleSection(event, '${sectionId}')">
          <div class="flex-grow-1 text-center">
            ${sectionLines}
          </div>
          <span id="${sectionId}-arrow">▾</span>
        </div>
        <div id="${sectionId}" class="subject-topic-list">
          <div class="subject-line">
            <ul class="list-group mb-3">
              ${group.items
                .map((item, idx) => {
                  const erulesId = item.erulesId;
                  const titleText = titleOverrides[erulesId] || item.title || '[Untitled]';
                  const typeColor = typeColorMap[item.type?.trim()] || '#b3b3cc';
                  const borderColor = darkenColor(typeColor, 30);

                  return `
                    <li class="list-group-item text-white text-start p-0 border-1"
                        style="background-color: transparent; border-color: ${borderColor};">
                      <div id="topic-wrapper-${erulesId}-${idx}" 
                           onclick="toggleContent(${idx}, '${erulesId}')" 
                           style="background-color: ${typeColor}; border-radius: 0rem; overflow: hidden; cursor: pointer;">
                        
                        <div id="topic-header-${erulesId}-${idx}" class="p-2">
                          <strong>${titleText}</strong>
                        </div>

                        <div id="topic-${erulesId}-${idx}" class="topic-content d-none">
                          ${renderContent(item.content || [], titleText, title === '🟡 Changed Topics')}
                        </div>

                      </div>
                    </li>
                  `;
                }).join('')}
            </ul>
          </div>
        </div>
      </div>
    `;
  });

  return html;
}

function renderContent(contentArray, titleText, highlightAdded) {
  const filtered = [...contentArray];
  const normalizedTitle = (titleText || '').trim().toLowerCase();
  const headingPattern = /^Heading\d+(IR|AMC|GM)$/;

  if (
    filtered.length &&
    filtered[0].type === 'paragraph' &&
    (
      (filtered[0].text?.trim().toLowerCase() === normalizedTitle) ||
      headingPattern.test(filtered[0].pStyle || '')
    )
  ) {
    filtered.shift(); // Remove paragraph that matches title or heading style
  }

  return filtered.map(p => {
    if (p.type === 'table') {
      return renderTable(p.rows || []);
    }
    
    let level = p.level;

    // If pStyle matches "NormalN", override level
    const normalMatch = /^Normal(\d+)$/.exec(p.pStyle || '');
    if (normalMatch) {
      level = parseInt(normalMatch[1], 10);
    }

    const levelClass = level === -1 ? 'paragraph-level--1' : `paragraph-level-${level}`;

    const marker = p.marker ? `<span class="indent-marker">${p.marker}</span>` : '';
    const changeClass = highlightAdded && p.change === 'added' ? 'added-source' : '';
    const isOrgHeading = /^Heading[1-9]OrgManual$/.test(p.pStyle || '');
    const orgClass = isOrgHeading ? 'org-heading' : '';
    const boldClass = p.pRStyle === 'Bold' ? 'bold-text' : '';
    return `<p class="paragraph ${levelClass} ${changeClass} ${orgClass} ${boldClass}">${marker}<span class="paragraph-text">${p.text}</span></p>`;
  }).join('');
}

function renderTable(rows) {
  function twipsToPx(twips) {
    return Math.round(parseInt(twips, 10) * 0.06);
  }

  return `
    <div class="table-responsive">
      <table class="table table-bordered table-sm table-smaller">
        <tbody>
          ${rows.map(row => `
            <tr>
              ${row.map(cell => {
                // Compose cell content from array of {text, style} objects
                const cellText = Array.isArray(cell.content)
                  ? cell.content.map(part => {
                      if (part.style === "GeneralAviation") {
                        return `<span class="added-source-table">${part.text}</span>`;
                      } else if (part.style === "Bold") {
                        return `<strong>${part.text}</strong>`;
                      } else {
                        return part.text;
                      }
                    }).join(' ')
                  : '';

                const colspan = cell.colspan ? ` colspan="${cell.colspan}"` : '';
                const rowspan = (cell.vMerge && cell.vMerge === 'restart') ? '' : ' rowspan="1"';
                const widthPx = cell.width ? twipsToPx(cell.width) : null;
                const widthStyle = widthPx
                  ? ` style="min-width:${widthPx}px; max-width:${widthPx + 20}px;"`
                  : '';

                return `<td${colspan}${rowspan}${widthStyle}>${cellText}</td>`;
              }).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function toggleContent(idx, erulesId) {
  console.log("toggleContent")
  const contentEl = document.getElementById(`topic-${erulesId}-${idx}`);
  const headerEl = document.getElementById(`topic-header-${erulesId}-${idx}`);

  if (!contentEl || !headerEl) return;

  const isOpen = !contentEl.classList.contains("d-none");

  if (isOpen) {
    contentEl.classList.add("d-none");
    setTimeout(() => {
      headerEl.scrollIntoView({ behavior: "auto", block: "center" });
    }, 0);
  } else {
    contentEl.classList.remove("d-none");
  }
}

function toggleSection(event, sectionId) {
  // Ignore toggle if clicking on checkbox or label inside the header
  const clickedElement = event.target;
  if (clickedElement.closest('input[type="checkbox"]') || clickedElement.closest('label')) {
    return; // Do nothing — let checkbox handle it
  }

  const container = document.getElementById(sectionId);
  const arrow = document.getElementById(`${sectionId}-arrow`);
  if (container) {
    const isHidden = container.classList.toggle('d-none');
    if (arrow) {
      arrow.textContent = isHidden ? '▸' : '▾';
    }
  }
}

function showExportModal(topics) {
  document.getElementById('exportModalBody').innerHTML = '';
  const sectionGroups = {};

  for (const topic of topics) {
    const sections = topic.sections?.length ? topic.sections : ['Uncategorized'];
    const key = JSON.stringify(sections);
    if (!sectionGroups[key]) {
      sectionGroups[key] = { sections, topics: [] };
    }
    sectionGroups[key].topics.push(topic);
  }

  let html = '';

  Object.entries(sectionGroups).forEach(([key, group], groupIndex) => {
    //const sectionId = `export-section-${groupIndex}`;
    const sectionId = getSectionId(groupIndex, 'export')
    const sectionLines = [...group.sections].reverse().map((sec, i, arr) => {
      const isMostSpecific = i === arr.length - 1;
      const fontWeight = isMostSpecific ? 700 : 600;
      const fontSize = isMostSpecific ? '1.05rem' : '0.9rem';

      if (isMostSpecific) {
        return `
          <div class="form-check">
            <input class="form-check-input" type="checkbox" id="${sectionId}-check" onclick="toggleSectionCheckbox('${sectionId}')">
            <label class="form-check-label fw-bold" for="${sectionId}-check" style="font-weight: ${fontWeight}; font-size: ${fontSize};">
              ${sec}
            </label>
          </div>
        `;
      } else {
        return `<div style="font-weight: ${fontWeight}; font-size: ${fontSize};">${sec}</div>`;
      }
    }).join('');

    html += `
      <div class="mb-3">
        <div class="export-section-group">
          <div class="subject-header d-flex justify-content-between align-items-center" onclick="toggleSection(event, '${sectionId}')">
            <div>
              ${sectionLines}
            </div>
            <span id="${sectionId}-arrow">▾</span>
          </div>
          <div id="${sectionId}" class="ms-3">
            ${group.topics.map((t, i) => {
              const id = `${sectionId}-topic-${i}`;
              const title = titleOverrides[t.erulesId] || t.title || '[Untitled]';
              return `
                <div class="form-check">
                  <input class="form-check-input" type="checkbox" style="border: 2px solid #333;" id="${id}" data-erulesid="${t.erulesId}">
                  <label class="form-check-label" for="${id}">${title}</label>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;
  });

  document.getElementById('exportModalBody').innerHTML = html;

  const modal = new bootstrap.Modal(document.getElementById('exportModal'));
  modal.show();
}

function exportToExcel() {
  const topics = [...globalNewTopics, ...globalChangedTopics, ...globalRemovedTopics];
  showExportModal(topics);
}

function toggleSectionCheckbox(sectionId) {
  const groupChecked = document.getElementById(`${sectionId}-check`)?.checked;
  //const checkboxes = document.querySelectorAll(`#${sectionId}-topics input[type="checkbox"]`);
  const checkboxes = document.querySelectorAll(`#${sectionId} input[type="checkbox"]`)
  checkboxes.forEach(cb => cb.checked = groupChecked);
}

function getSectionId(index, mode = 'view') {
  return mode === 'export' ? `export-section-${index}` : `section-${index}`;
}

function handleExportSelection(button) {
  const type = button.dataset.type; // "IR", "AMC", "GM", or "ALL"
  const allCheckboxes = document.querySelectorAll('#exportModalBody input[type="checkbox"][data-erulesid]');

  // Match rules based on full type string
  const matchesType = (topicType) => {
    if (type === "ALL") return true;
    if (type === "IR") return (
      topicType === "IR (Implementing rule);" ||
      topicType === "DR (Delegated rule);" ||
      topicType === "CS (Certification specification);"
    );
    if (type === "AMC") return topicType.startsWith("AMC to ");
    if (type === "GM") return topicType.startsWith("GM to ");
    return false;
  };

  const checkboxesToToggle = Array.from(allCheckboxes).filter(cb => {
    const erulesId = cb.dataset.erulesid;
    const topic = [...globalNewTopics, ...globalChangedTopics, ...globalRemovedTopics]
      .find(t => t.erulesId === erulesId);

    return topic && matchesType(topic.type || "");
  });

  const allChecked = checkboxesToToggle.length > 0 && checkboxesToToggle.every(cb => cb.checked);

  // Toggle
  checkboxesToToggle.forEach(cb => cb.checked = !allChecked);

  // Update button label
  const labelBase = type === "ALL" ? "All" : type;
  button.textContent = (allChecked ? "Select " : "Deselect ") + labelBase;
}

async function exportExcelJS() {
  const selectedIds = Array.from(document.querySelectorAll('#exportModalBody input[type="checkbox"]:checked'))
    .filter(cb => cb.dataset.erulesid)
    .map(cb => cb.dataset.erulesid);

  const allTopics = [...globalNewTopics, ...globalChangedTopics, ...globalRemovedTopics];
  const selectedTopics = allTopics.filter(t => selectedIds.includes(t.erulesId));

  if (!selectedTopics.length) {
    alert("Please select at least one topic to export.");
    return;
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Compliance Matrix");

  sheet.columns = [
    { header: "Regulatory Content", key: 'a', width: 5 },
    { key: 'b', width: 5 },
    { key: 'c', width: 5 },
    { key: 'd', width: 5 },
    { key: 'e', width: 5 },
    { key: 'f', width: 20 },
    { key: 'g', width: 20 },
    { key: 'h', width: 20 },
    { key: 'i', width: 20 },
    { key: 'j', width: 20 },
    { key: 'k', width: 20 },
    { header: "Compliance", key: "l", width: 15 },
    { header: "Reference", key: "m", width: 70 },
    { header: "Comment", key: "n", width: 40 }
  ];
  sheet.mergeCells(`A1:K1`);

  // Style header row
  const headerRow = sheet.getRow(1);
  headerRow.eachCell(cell => {
    cell.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '538dd5' }
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  // Group by full sections array
  const sectionGroups = {};
  for (const topic of selectedTopics) {
    const key = JSON.stringify(topic.sections || ['Uncategorized']);
    if (!sectionGroups[key]) {
      sectionGroups[key] = {
        sections: topic.sections || ['Uncategorized'],
        topics: []
      };
    }
    sectionGroups[key].topics.push(topic);
  }

  const sortedGroups = Object.entries(sectionGroups);

  let rowIndex = 2;

  for (const [key, group]  of sortedGroups) {
    // Combine all sections into one line
    const combinedSections = group.sections.slice().reverse().join('  |  ');

    // Merge and style section header row
    sheet.mergeCells(`A${rowIndex}:N${rowIndex}`);
    const sectionCell = sheet.getCell(`A${rowIndex}`);
    sectionCell.value = `Section: ${combinedSections}`;
    sectionCell.font = { bold: true, size: 12 };
    sectionCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'D9D9D9' }
    };
    sectionCell.border = { 
      top: { style: 'thin', color: { argb: 'FF000000' } }, 
      bottom: { style: 'thick', color: { argb: 'FF000000' } }
    };
    sectionCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    sheet.getRow(rowIndex).height = 32;
    rowIndex++;

    for (const topic of group.topics) {
      const title = titleOverrides[topic.erulesId] || topic.title || '[Untitled]';
      const contentLines = flattenContent(topic.content || []);

      // Merge topic title
      sheet.mergeCells(`A${rowIndex}:N${rowIndex}`);
      const topicCell = sheet.getCell(`A${rowIndex}`);
      topicCell.value = title;

      // Determine the type for color from the subject string
      // Find first key in typeColorMap that matches start of subject
      const topicType = topic.type?.trim();
      const color = typeColorMap[topicType];

      if (color) {
        topicCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color.replace('#', '') }};
        topicCell.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } }; // white text
      } else {
        topicCell.font = { bold: true, size: 12 };
      }

      topicCell.alignment = { vertical: 'middle', horizontal: 'left' };

      sheet.getRow(rowIndex).commit();
      rowIndex++;
      
      // Add content rows
      for (const line of contentLines) {
        const row = sheet.getRow(rowIndex);

        if (line.type === 'table') {
          rowIndex++; // empty row before table

          const rows = line.rows;

          //const numCols = rows[0]?.length || 1;
          const numCols = Math.max(
            ...rows.map(row =>
              row.reduce((sum, cell) => sum + (parseInt(cell.colspan) || 1), 0)
            )
          );
          
          let visualCols;

          if (numCols === 1) {
            visualCols = [
              { start: 2, end: 7 },  // B–G
            ];
          } else if (numCols === 2) {
            visualCols = [
              { start: 2, end: 6 },  // B–F
              { start: 7, end: 8 }  // G–H
            ];
          } else if (numCols === 3) {
            visualCols = [
              { start: 2, end: 6 },  // B–F
              { start: 7, end: 8 },  // G–H
              { start: 9, end: 10 }   // I–J
            ];
          } else if (numCols === 5) {
            visualCols = [
              { start: 2, end: 5 },  // B–E
              { start: 6, end: 7 },  // F–G
              { start: 8, end: 9 },   // H–I
              { start: 10, end: 10 }, // J
              { start: 11, end: 11 } // K
            ];
         } else {
            // default: 7 columns, fixed blocks
            visualCols = [
              { start: 2, end: 5 },  // B–E
              { start: 6, end: 6 },  // F
              { start: 7, end: 7 },  // G
              { start: 8, end: 8 },  // H
              { start: 9, end: 9 },  // I
              { start: 10, end: 10 },// J
              { start: 11, end: 11 } // K
            ];
          }

          const tableCols = Math.min(numCols, visualCols.length);

          rows.forEach((rowCells, tableRowIndex) => {
            const row = sheet.getRow(rowIndex);

            let maxHeight = 20; // min height fallback

            let colIndex = 0; // Index for visualCols
            for (let i = 0; i < rowCells.length && colIndex < visualCols.length; i++) {
              const cellData = rowCells[i] || {};
              const cellParts = cellData.content || [];
              const colspan = parseInt(cellData.colspan) || 1;

              // Determine merge range based on visualCols
              const mergeStart = visualCols[colIndex].start;
              const mergeEnd = visualCols
                .slice(colIndex, colIndex + colspan)
                .at(-1)?.end || visualCols[colIndex].end;

              if (mergeEnd > mergeStart) {
                sheet.mergeCells(rowIndex, mergeStart, rowIndex, mergeEnd);
              }

              const cell = sheet.getCell(rowIndex, mergeStart);

              // Compose rich text
              if (cellParts.length === 1) {
                const part = cellParts[0];
                cell.value = part.text;
                if (part.style === 'GeneralAviation') {
                  cell.font = {
                    color: { argb: '800080' },
                    size: 11
                  };
                }
              } else {
                cell.value = {
                  richText: cellParts.map(part => ({
                    text: part.text + ' ',
                    font: {
                      color: part.style === 'GeneralAviation' ? { argb: '800080' } : undefined,
                      bold: part.style === 'Bold',
                    }
                  }))
                };
              }

              cell.alignment = { wrapText: true, vertical: 'top', horizontal: colspan > 1 ? 'center' : 'left' };

              if (tableRowIndex === 0) {
                cell.font = { ...(cell.font || {}), bold: true };
              }

              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: (rowIndex % 2 === 0 ? 'FFF2F2F2' : 'FFFFFFFF') }
              };

              cell.border = {
                top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
                bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
                left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
                right: { style: 'thin', color: { argb: 'FFD9D9D9' } },
              };

              // Estimate height
              const cellText = cellParts.map(part => part.text).join(' ');
              let colWidth = 0;
              for (let c = mergeStart; c <= mergeEnd; c++) {
                colWidth += sheet.getColumn(c).width || 10;
              }

              const estHeight = estimateRowHeight(cellText, colWidth, 11);
              if (estHeight > maxHeight) maxHeight = estHeight;

              colIndex += colspan; // move forward by colspan visualCols
            }

            row.height = maxHeight;
            row.commit();
            rowIndex++;
          });

          // Add empty row after the table
          rowIndex++;

          continue;
        }

        // Existing marker-based paragraph rendering (leave untouched)
        const indentLevel = Math.min(line.level || 0, 4);
        const markerCol = indentLevel + 1;

        if (line.marker) {
          const markerCell = row.getCell(markerCol);
          markerCell.value = line.marker.toString();
          markerCell.font = { bold: true, size: 10 };
          markerCell.alignment = { vertical: 'top', horizontal: 'center' };
          if (line.color) markerCell.font.color = { argb: line.color };
          markerCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFFFFF' }
          };
          markerCell.border = {
            top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
            bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } }
          };

          const textStart = markerCol + 1;
          const textEnd = 11;
          if (textStart <= textEnd) {
            sheet.mergeCells(rowIndex, textStart, rowIndex, textEnd);
            const textCell = sheet.getCell(rowIndex, textStart);
            textCell.value = line.text;
            textCell.alignment = { wrapText: true, vertical: 'top', horizontal: 'left' };
            textCell.font = {
              bold: line.bold || false,
              italic: line.italic || false,
              underline: line.underline ? 'single' : false
            };
            if (line.color) textCell.font.color = { argb: line.color };

            const colWidth = (textEnd - textStart) * sheet.getColumn(textStart).width + 120;
            const estimatedHeight = estimateRowHeight(line.text, colWidth, 11);
            sheet.getRow(rowIndex).height = estimatedHeight;
          }
        } else {
          const startCol = markerCol;
          const endCol = 11;
          if (startCol <= endCol) {
            sheet.mergeCells(rowIndex, startCol, rowIndex, endCol);
            const textCell = sheet.getCell(rowIndex, startCol);
            textCell.value = line.text;
            textCell.alignment = { wrapText: true, vertical: 'top', horizontal: 'left' };
            textCell.font = {
              bold: line.bold || false,
              italic: line.italic || false,
              underline: line.underline ? 'single' : false
            };
            if (line.color) textCell.font.color = { argb: line.color };
            textCell.border = {
              top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
              bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } }
            };

            const colWidth = (endCol - startCol) * sheet.getColumn(startCol).width + 120;
            const estimatedHeight = estimateRowHeight(line.text, colWidth, 11);
            sheet.getRow(rowIndex).height = estimatedHeight;
          }
        }

        row.commit();
        rowIndex++;
      }
    }
  }

  for (let r = 2; r < rowIndex; r++) {  // adjust row range as needed
    const row = sheet.getRow(r);
    for (let c = 1; c <= 11; c++) { // Columns A(1) to K(11)
      const cell = row.getCell(c);
      if (!cell.value) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFFFFF' }  // white
        };
      }
    }
  }
  // Export workbook to download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
  saveAs(blob, `Compliance_Matrix_${currentRegulation}.xlsx`);
}

function flattenContent(contentArray, title = '') {
  const output = [];
  const headingPattern = /^Heading\d+(IR|AMC|GM)$/;
  const normalizedTitle = title.trim().toLowerCase();
  const filtered = [...contentArray];

  if (
    filtered.length &&
    filtered[0].type === 'paragraph' &&
    (
      (filtered[0].text?.trim().toLowerCase() === normalizedTitle) ||
      headingPattern.test(filtered[0].pStyle || '')
    )
  ) {
    filtered.shift();
  }

  filtered.forEach(p => {
    if (p.type === 'table') {
      const rows = p.rows.map(row =>
        row.map(cell => {
          const content = Array.isArray(cell?.content)
            ? cell.content.map(part => ({
                text: part.text || '',
                style: part.style || null
              }))
            : [];
          return { ...cell, content };
        })
      );

      output.push({
        type: 'table',
        rows,
        columnCount: Math.max(...rows.map(r => r.length))
      });
    } else {
      const text = p.text || '';
      const pRStyle = (p.pRStyle || '').toLowerCase();
      const pStyle = p.pStyle || '';
      const bold = pRStyle.includes('bold') || pStyle.startsWith('Heading');
      const italic = pRStyle.includes('italic');
      const underline = pRStyle.includes('underline');
      const color = p.change === 'added' ? '800080' : null;

      let level = typeof p.level === 'number' ? p.level : 0;
      const normalMatch = /^Normal(\d+)$/.exec(p.pStyle || '');
      if (normalMatch) level = parseInt(normalMatch[1]);
      if (isNaN(level) || level < 0) level = 0;

      output.push({ text, bold, italic, underline, color, level, marker: p.marker || null });
    }
  });

  return output;
}

function estimateRowHeight(text, colWidth, fontSize = 11) {
  
  if (!text) return 16; // default minimum height

  // Approximate max chars per line based on column width (rough estimate)
  // 1 Excel column width unit ~ 7 pixels, 1 char ~ 7 pixels wide (variable font, but close enough)
  const approxCharPerLine = colWidth * 7 / 7; // simplify to colWidth in chars
  const heightMultipler = 1

  // Split text by line breaks
  const lines = text.split('\n');

  // Calculate total number of wrapped lines
  let wrappedLines = 0;
  for (const line of lines) {
    wrappedLines += Math.ceil(line.length / approxCharPerLine);
  }

  const lineHeight = fontSize + 4

  const height = wrappedLines * lineHeight;

  // Minimum height to avoid too small rows
  return Math.max(height, 16);
}

function sortVersionsByDate(v1, v2) {
  const d1 = parseVersionDate(v1);
  const d2 = parseVersionDate(v2);
  return d1 - d2;
}

function parseVersionDate(versionName) {
  const [month, year] = versionName.replace('.json', '').split(' ');
  const monthMap = {
    january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
    july: 7, august: 8, september: 9, october: 10,
    november: 11, december: 12
  };
  const m = monthMap[month.toLowerCase()] || 0;
  const y = parseInt(year);
  return new Date(y, m - 1);
}

// https://www.base64encode.org/
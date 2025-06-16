let selectedVersions = [];
let versionMap = {};
let currentRegulation = null;

const titleOverrides = {
  "ERULES-1963177438-9854": "Appendix 1 Signals",
  "ERULES-1963177438-9858": "Appendix 2 Unmanned free balloons",
  "ERULES-1963177438-9865": "Appendix 3 Table of cruising levels",
  "ERULES-1963177438-9866": "Appendix 4 ATS airspace classes — services provided and flight requirements",
  "ERULES-1963177438-9875": "Appendix 5 Technical specifications related to aircraft observations and reports by voice communications",
  "ERULES-1963177438-9879": "Supplement to the ANNEX"
};

const typeColorMap = {
  "AMC to IR (Acceptable means of compliance to implementing rule);": "#fbbc39",
  "IR (Implementing rule);": "#007fc2",
  "DR (Delegated rule);": "#007fc2",
  "GM to IR (Guidance material to implementing rule);": "#16cc7f",
  "GM to CS (Guidance material to certification specification);" : "#16cc7f"
};

document.addEventListener('DOMContentLoaded', () => {
  fetch('data/structure.json')
    .then(res => res.json())
    .then(data => {
      versionMap = data;
      renderRegulations(data);
    });
});

function renderRegulations(structure) {
  const container = document.getElementById('regulation-selection');
  container.innerHTML = '';

  Object.keys(structure).forEach(reg => {
    const box = document.createElement('div');
    box.className = 'regulation-box';
    box.innerText = reg.toUpperCase();
    box.onclick = () => selectRegulation(reg);
    container.appendChild(box);
  });
}

function selectRegulation(name) {
  currentRegulation = name;
  selectedVersions = [];

  const versionButtons = document.getElementById('version-buttons');
  versionButtons.innerHTML = '';

  const versions = versionMap[name] || [];
  versions.forEach(filename => {
    const btn = document.createElement('button');
    btn.className = 'btn btn-outline-secondary version-btn';
    btn.innerText = filename.replace('.json', '');
    btn.dataset.version = filename;
    btn.onclick = () => toggleVersion(btn);
    versionButtons.appendChild(btn);
  });

  document.getElementById('compare-btn').disabled = true;
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

  document.getElementById('compare-btn').disabled = selectedVersions.length !== 2;
}

async function compareVersions() {
  const [v1, v2] = [...selectedVersions].sort(sortVersionsByDate);
  const fileOld = `xml/${currentRegulation}/${v1}`;
  const fileNew = `xml/${currentRegulation}/${v2}`;

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

  renderResults(v1.replace('.json', ''), v2.replace('.json', ''), newTopics, changedTopics, removedTopics);
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

function renderResults(oldLabel, newLabel, newTopics, changedTopics, removedTopics) {
  const card = document.querySelector('.selector-card');
  card.classList.add('wide');

  card.innerHTML = `
    <div class="mb-3 text-center">
      <img src="res/logo_xs.png" class="logo" onclick="location.reload()" />
    </div>
    <h4 class="text-center mb-3 text-dark">Comparison: ${oldLabel} → ${newLabel}</h4>

    <div class="mb-3 small text-muted">
      <span style="background:#fbbc39; color:white; padding:2px 6px; border-radius:4px;">AMC to IR</span>
      <span style="background:#007fc2; color:white; padding:2px 6px; border-radius:4px;">IR</span>
      <span style="background:#16cc7f; color:white; padding:2px 6px; border-radius:4px;">GM to IR</span>
    </div>

    <div class="scroll-box mb-4">
      ${renderTopicGroup('🟢 New Topics', newTopics, 'success')}
      ${renderTopicGroup('🟡 Changed Topics', changedTopics, 'warning')}
      ${renderTopicGroup('🔴 Removed Topics', removedTopics, 'danger')}
    </div>
  `;
}

function renderTopicGroup(title, items, colorClass) {
  if (!items?.length) return '';

  // Group items by subject
  const subjectGroups = {};
  items.forEach(item => {
    let subject = item.subject?.trim() || 'Uncategorized';

    // Use only the first subject if multiple are listed
    if (subject.includes(';')) {
      subject = subject.split(';')[0].trim();
    }

    // Normalize the title for appendix check
    const title = (titleOverrides[item.erulesId] || item.title || '').trim();
    const type = item.type?.trim();

    const isAppendixIR =
      title.startsWith("Appendix") &&
      type === "IR (Implementing rule);";

    const isAppendixGM =
      /^GM\d+\s+to\s+Appendix/i.test(title) &&
      type === "GM to IR (Guidance material to implementing rule);";

    if (isAppendixIR || isAppendixGM) {
      subject = "Appendix";
    } else if (subject.startsWith("Annex-")) {
      subject = subject.substring(6).trim();
    }

    if (!subjectGroups[subject]) {
      subjectGroups[subject] = [];
    }

    subjectGroups[subject].push(item);
  });

  let html = `<div class="category-header category-${colorClass}">${title} (${items.length})</div>`;

  Object.entries(subjectGroups).forEach(([subject, groupItems], subjectIdx) => {
    const subjectId = `subject-${subjectIdx}`;
    html += `
      <div class="subject-group">
        <div class="subject-header" onclick="toggleSubject('${subjectId}')">
          <strong>${subject}</strong> <span id="${subjectId}-arrow">▾</span>
        </div>
        <div id="${subjectId}" class="subject-topic-list">
          <div class="subject-line">
            <ul class="list-group mb-3">
              ${groupItems
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
    let level = p.level;

    // If pStyle matches "NormalN", override level
    const normalMatch = /^Normal(\d+)$/.exec(p.pStyle || '');
    if (normalMatch) {
      level = parseInt(normalMatch[1], 10);
    }

    const levelClass = level === -1 ? 'paragraph-level--1' : `paragraph-level-${level}`;

    /*const levelClass = p.level === -1 ? 'paragraph-level--1' : `paragraph-level-${p.level}`;*/
    const marker = p.marker ? `<span class="indent-marker">${p.marker}</span>` : '';
    const changeClass = highlightAdded && p.change === 'added' ? 'added-source' : '';
    const isOrgHeading = /^Heading[1-9]OrgManual$/.test(p.pStyle || '');
    const orgClass = isOrgHeading ? 'org-heading' : '';
    const boldClass = p.pRStyle === 'Bold' ? 'bold-text' : '';
    return `<p class="paragraph ${levelClass} ${changeClass} ${orgClass} ${boldClass}">${marker}<span class="paragraph-text">${p.text}</span></p>`;
  }).join('');
}

function toggleContent(idx, erulesId) {
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

function toggleSubject(subjectId) {
  const container = document.getElementById(subjectId);
  const arrow = document.getElementById(`${subjectId}-arrow`);
  if (container) {
    container.classList.toggle('d-none');
    if (arrow) {
      arrow.textContent = container.classList.contains('d-none') ? '▸' : '▾';
    }
  }
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
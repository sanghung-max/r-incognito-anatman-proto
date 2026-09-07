// At the top of js/render.js
window.switchDrawerTab = function(tabId) {
  if (!tabId) return;
  window.currentDrawerTab = tabId;

  // 1. Force the sidebar drawer to be visible if it's currently hidden
  const sidebar = document.getElementById("expert-side-nav");
  if (sidebar && sidebar.classList.contains("side-nav-hidden")) {
    sidebar.classList.remove("side-nav-hidden");
    sidebar.classList.add("side-nav-standard");
  }

  // 2. Update active tab button state
  const drawerTabs = document.getElementById("drawer-tabs");
  if (drawerTabs) {
    const buttons = drawerTabs.querySelectorAll(".tab-btn");
    buttons.forEach(btn => {
      const onclickAttr = btn.getAttribute("onclick") || "";
      const match = onclickAttr.match(/switchDrawerTab\s*\(\s*['"]([^'"]+)['"]\s*\)/i);
      const bKey = match ? match[1] : btn.textContent.toLowerCase().trim();

      if (bKey === tabId.toLowerCase().trim()) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });
  }

  // 3. Render content for tab
  renderDrawerTabContent(tabId);
};

/**
 * Sorts nodes based on display_priority and date.
 * - display_priority: true items come first.
 * - Multiple priority items (or standard items) are sorted reverse-chronologically by node.time.
 * - Items without dates fall back to original array order.
 */
function sortNodesByPriority(nodes) {
  if (!Array.isArray(nodes)) return [];

  return [...nodes].sort((a, b) => {
    const aPriority = Boolean(a.display_priority);
    const bPriority = Boolean(b.display_priority);

    // 1. Move priority items to the front
    if (aPriority && !bPriority) return -1;
    if (!aPriority && bPriority) return 1;

    // 2. If both have same priority status, sort reverse-chronologically by time
    const timeA = a.time ? new Date(a.time).getTime() : 0;
    const timeB = b.time ? new Date(b.time).getTime() : 0;

    if (timeA !== timeB) {
      return timeB - timeA; // Newer dates first
    }

    return 0; // Maintain original order if dates match or are missing
  });
}





// Helper renderer for bilingual titles with accessibility tags
function renderTitle(node) {
  const hasZh = Boolean(node.title_zh);
  const hasEn = Boolean(node.title_en);

  if (!hasZh && !hasEn) {
    return `<h2 class="node-title"><span class="title-en" lang="en">${node.id}</span></h2>`;
  }

  if (hasZh && hasEn) {
    return `
      <h2 class="node-title">
        <span class="title-zh" lang="zh-HK">${node.title_zh}</span>
        <span class="title-sep" aria-hidden="true"> / </span>
        <span class="title-en" lang="en">${node.title_en}</span>
      </h2>
    `;
  }

  if (hasZh) {
    return `<h2 class="node-title"><span class="title-zh" lang="zh-HK">${node.title_zh}</span></h2>`;
  }

  return `<h2 class="node-title"><span class="title-en" lang="en">${node.title_en}</span></h2>`;
}

// Helper renderer for author metadata line
function renderAuthors(node) {
  let authorsList = [];

  if (Array.isArray(node.authors) && node.authors.length > 0) {
    authorsList = node.authors;
  } else if (Array.isArray(node.author) && node.author.length > 0) {
    authorsList = node.author;
  } else if (typeof node.authors === "string" && node.authors.trim()) {
    authorsList = node.authors.split(",").map(a => a.trim());
  } else if (typeof node.author === "string" && node.author.trim()) {
    authorsList = node.author.split(",").map(a => a.trim());
  }

  authorsList = authorsList.filter(Boolean);
  if (authorsList.length === 0) return "";

  return `<div class="node-authors"><span class="author-label">Author: </span><span class="author-names">${authorsList.join(", ")}</span></div>`;
}

// Helper renderer for bilingual descriptions
function renderDescription(node) {
  const hasZh = Boolean(node.description_zh);
  const hasEn = Boolean(node.description_en);

  if (!hasZh && !hasEn) return "";

  let html = `<div class="node-description">`;
  if (hasZh) {
    html += `<p class="desc-zh" lang="zh-HK">${node.description_zh}</p>`;
  }
  if (hasEn) {
    html += `<p class="desc-en" lang="en">${node.description_en}</p>`;
  }
  html += `</div>`;

  return html;
}

/**
 * Keyword mapping for multi-lingual ## H2 headers
 */
const TAB_SECTION_KEYWORDS = {
  "vista": ["觀景", "vista"],
  "text": ["亂語", "text"],
  "epoche": ["懸置", "epoché", "epoche"],
  "wissen": ["理解", "wissen"],
  "interpret": ["詮釋", "interpret"],
  "deconstruct": ["拆建", "deconstruct"],
  "ai-experts": ["評語", "ai expert", "critics", "ai-experts"]
};

/**
 * Extracts normalized tab key directly from element text or inline onclick attribute string
 */
function getTabKeyFromButton(btn) {
  if (!btn) return "";

  // 1. Check direct data attribute or explicit tab attribute
  const dataTab = btn.getAttribute("data-tab");
  if (dataTab) return dataTab.toLowerCase().trim();

  // 2. Extract string from onclick attribute if present (e.g. switchDrawerTab('vista'))
  const onclickAttr = btn.getAttribute("onclick");
  const onclickStr = typeof onclickAttr === "string" ? onclickAttr : (btn.onclick ? btn.onclick.toString() : "");
  const match = onclickStr.match(/switchDrawerTab\s*\(\s*['"]([^'"]+)['"]\s*\)/i);
  if (match && match[1]) return match[1].toLowerCase().trim();

  // 3. Fallback to clean button inner text
  const rawText = btn.textContent.toLowerCase().trim();
  for (const key of Object.keys(TAB_SECTION_KEYWORDS)) {
    if (rawText === key || rawText.includes(key)) return key;
  }

  return rawText;
}

/**
 * Strips markdown header tags (##), punctuation, and extra whitespace for key comparison
 */
function normalizeSectionKey(key) {
  if (!key) return "";
  return key.replace(/^#+\s*/, "").trim().toLowerCase();
}

/**
 * Updates side nav tab buttons with '.has-content' visual indicator badges
 */
function updateTabBadges(node) {
  const drawerTabs = document.getElementById("drawer-tabs");
  if (!drawerTabs) return;

  const buttons = drawerTabs.querySelectorAll(".tab-btn");
  const sectionKeys = (node && node.section_keys) 
    ? node.section_keys 
    : (node && node.content_sections ? Object.keys(node.content_sections) : []);

  buttons.forEach((btn) => {
    const tabKey = getTabKeyFromButton(btn);
    const keywords = TAB_SECTION_KEYWORDS[tabKey] || [tabKey];

    const hasContent = sectionKeys.some((secKey) => {
      const cleanKey = normalizeSectionKey(secKey);
      return keywords.some((kw) => cleanKey.includes(kw.toLowerCase()));
    });

    if (hasContent) {
      btn.classList.add("has-content");
    } else {
      btn.classList.remove("has-content");
    }
  });
}

/**
 * Asynchronously renders tab content, fetching the node's JSON file on demand if needed
 */
async function renderDrawerTabContent(activeTab, tabData) {
  const nodeId = window.appState?.currentNodeId;
  const node = tabData || (nodeId && window.ARCHIVE_DATA ? window.ARCHIVE_DATA[nodeId] : null);

  if (!node) return;

  // 1. Ensure tab buttons bar is visible
  const drawerTabs = document.getElementById("drawer-tabs");
  if (drawerTabs) {
    drawerTabs.style.display = "flex";
  }

  // 2. Target display pane
  const displayPane = document.getElementById("tab-display-pane");
  if (!displayPane) return;

  if (!node.has_content && !node.content_sections) {
    displayPane.innerHTML = `<p class="muted-notice" style="padding: 16px; color: #888; font-style: italic;">No metadata text available for this entry.</p>`;
    return;
  }

  // 3. Fetch decoupled JSON on demand if content_sections isn't loaded yet
  if (!node.content_sections && node.has_content) {
    displayPane.innerHTML = `<p class="muted-notice" style="padding: 16px; color: #888; font-style: italic;">Loading text content...</p>`;
    try {
      const response = await fetch(`assets/data/nodes/${node.id}.json`);
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      
      const fetchedData = await response.json();
      node.content_sections = fetchedData.content_sections; 
    } catch (err) {
      console.error(`Failed to load text content for node ${node.id}:`, err);
      displayPane.innerHTML = `<p class="muted-notice" style="padding: 16px; color: #e57373; font-style: italic;">Failed to load section text.</p>`;
      return;
    }
  }

  // 4. Match clicked tab to section key
  const currentTab = activeTab || window.currentDrawerTab || "vista";
  const sections = node.content_sections || {};
  const keywords = TAB_SECTION_KEYWORDS[currentTab] || [currentTab];

  const sectionKeys = Object.keys(sections);

  let matchedKey = sectionKeys.find((key) => {
    const cleanKey = normalizeSectionKey(key);
    if (cleanKey === currentTab.toLowerCase()) return true;
    return keywords.some((kw) => cleanKey.includes(kw.toLowerCase()));
  });

  if (!matchedKey) {
    matchedKey = sectionKeys.find((key) =>
      keywords.some((kw) => normalizeSectionKey(key).includes(kw.toLowerCase()))
    ) || (sections[currentTab] ? currentTab : sectionKeys[0]);
  }

  const rawText = sections[matchedKey];

  if (!rawText) {
    displayPane.innerHTML = `<p class="muted-notice" style="padding: 16px; color: #888; font-style: italic;">No text found for section: <strong>${currentTab}</strong></p>`;
    return;
  }

  // 5. Parse section text using bilingual Markdown parser
  const parsed = parseBilingualContent(rawText);

  // Step 6 & 7 inside renderDrawerTabContent:
let contentHtml = "";

  if (parsed.isBilingual) {
    contentHtml = `
      <div class="bilingual-container" style="display: flex; gap: 24px; align-items: flex-start;">
        <div class="bilingual-column zh-column" lang="zh-HK" style="flex: 1; min-width: 0;">
          ${parsed.zh || "<em>(無中文內容)</em>"}
        </div>
        <div class="bilingual-column en-column" lang="en" style="flex: 1; min-width: 0;">
          ${parsed.en || "<em>(No English text)</em>"}
        </div>
      </div>
    `;
  } else {
    contentHtml = `
      <div class="single-content-container">
        ${parsed.fullContent}
      </div>
    `;
  }
  
  // 7. Inject output into display pane DOM element
  displayPane.innerHTML = `
    <div class="archive-content-block" style="padding: 16px; color: #ddd; font-size: 14px; line-height: 1.65;">
      <div class="section-sublabel" style="text-transform: uppercase; font-size: 11px; color: #888; margin-bottom: 16px; letter-spacing: 1px;">
        ${matchedKey}
      </div>
      ${contentHtml}
    </div>
  `;
}
  
  

/**
 * Global Drawer & Navigation State
 */
window.currentDrawerTab = window.currentDrawerTab || "vista";

/**
 * Switch active drawer tab and trigger re-render
 */
function switchDrawerTab(tabId) {
  if (!tabId) return;
  window.currentDrawerTab = tabId;

  const drawerTabs = document.getElementById("drawer-tabs");
  if (drawerTabs) {
    const buttons = drawerTabs.querySelectorAll(".tab-btn");
    buttons.forEach(btn => {
      const bKey = getTabKeyFromButton(btn);
      if (bKey === tabId.toLowerCase().trim()) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });
  }

  renderDrawerTabContent(tabId);
}

// Global Event listener fallback to ensure clicks are caught even if inline handlers fail
document.addEventListener("DOMContentLoaded", () => {
  const drawerTabs = document.getElementById("drawer-tabs");
  if (drawerTabs) {
    drawerTabs.addEventListener("click", (evt) => {
      const btn = evt.target.closest(".tab-btn");
      if (!btn) return;

      const tabKey = getTabKeyFromButton(btn);
      if (tabKey) {
        switchDrawerTab(tabKey);
      }
    });
  }
});


/**
 * Parses Markdown syntax into valid HTML elements, preserving headers (# through ######),
 * paragraph breaks (\n\n), and stanza line breaks (\n).
 */

function parseSimpleMarkdown(markdownText) {
  if (!markdownText) return "";

  // 1. Normalize line endings (CRLF -> LF)
  let html = markdownText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // 2. Escape basic HTML special characters
  html = html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // 3. Process Markdown Tables before paragraph splitting
  const tableRegex = /((?:\|[^\n]+\|\n?)+)/g;
  html = html.replace(tableRegex, (match) => {
    const rows = match.trim().split("\n");
    if (rows.length < 2) return match;

    let tableHTML = '<div class="table-container"><table style="width:100%; border-collapse:collapse; margin:16px 0;">';
    rows.forEach((row, index) => {
      if (/^\|[\s-:]+\|/.test(row.trim())) return;

      const cells = row.split("|").slice(1, -1);
      const isHeader = index === 0;
      const cellTag = isHeader ? "th" : "td";

      tableHTML += "<tr>";
      cells.forEach((cell) => {
        tableHTML += `<${cellTag} style="border:1px solid #444; padding:8px; text-align:left;">${cell.trim()}</${cellTag}>`;
      });
      tableHTML += "</tr>";
    });
    tableHTML += "</table></div>";
    return tableHTML;
  });

  // 4. Inline Formatting (*bold*, _italic_, hr, blockquotes)
  html = html
    .replace(/\*\*\*(.*?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/_(.*?)_/g, "<em>$1</em>")
    .replace(/^&gt;\s?(.*)$/gm, "<blockquote>$1</blockquote>")
    .replace(/^---$/gm, "<hr/>");

 // 5. Convert Headers (# through ######) and ensure a blank line follows them
  html = html
    .replace(/^######\s+(.*)$/gm, "<h6>$1</h6>\n")
    .replace(/^#####\s+(.*)$/gm, "<h5>$1</h5>\n")
    .replace(/^####\s+(.*)$/gm, "<h4>$1</h4>\n")
    .replace(/^###\s+(.*)$/gm, "<h3>$1</h3>\n")
    .replace(/^##\s+(.*)$/gm, "<h2>$1</h2>\n")
    .replace(/^#\s+(.*)$/gm, "<h1>$1</h1>\n");

  // 6. Force paragraph separation on double-newlines OR lines ending with quotes/italics
  // Ensures English translation blocks split even if raw file uses mixed line breaks
 // const preProcessed = html.replace(/([._"’])\n([A-Z0-9_\-*"])/g, "$1\n\n$2");
 // const rawBlocks = preProcessed.split(/\n\s*\n/);

 // 6. Split blocks strictly by double newlines (\n\n)
  const rawBlocks = html.split(/\n\s*\n/);

  return rawBlocks
    .map((block) => {
      let trimmed = block.trim();
      if (!trimmed) return "";

      // Skip wrapping structural tags or headers in <p>
      if (/^<(h[1-6]|blockquote|hr|ul|ol|div|table)/i.test(trimmed)) {
        return trimmed;
      }

      // Convert single line breaks (\n) within a paragraph block into <br/>
      const lineBroken = trimmed.replace(/\n/g, "<br/> <br/>");

      return `<p style="margin-top: 0; margin-bottom: 1.25em; line-height: 1.65; display: block;">${lineBroken}</p>`;
    })
    .join("");
}


/**
 * Extracts Chinese and English sub-sections without stripping text.
 */
/**
 * Extracts Chinese and English sub-sections without collapsing paragraph newlines.
 */
 
function parseBilingualContent(rawText) {
  if (!rawText) return { isBilingual: false, fullContent: "" };

  const cleanRaw = rawText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Check for bilingual section markers
  const hasChinese = /(?:^|\n)(?:##\s*Chinese|###\s*Chinese|###\s*中文|###\s*原文)/i.test(cleanRaw);
  const hasEnglish = /(?:^|\n)(?:##\s*English|###\s*English)/i.test(cleanRaw);

  if (hasChinese || hasEnglish) {
    let zhRaw = "";
    let enRaw = "";

    // Split on English / Chinese subheader markers while preserving line breaks
    const sections = cleanRaw.split(/(?=(?:^|\n)(?:##?\s*(?:Chinese|English)|###\s*(?:Chinese|English|中文|原文)))/i);

    sections.forEach((sec) => {
      const trimmed = sec.trim();
      if (!trimmed) return;

      const firstLine = trimmed.split("\n")[0];

      if (/English/i.test(firstLine)) {
        // Strip the English section header line, keeping remaining content intact
        const contentWithoutHeader = trimmed.substring(firstLine.length).trim();
        enRaw += contentWithoutHeader + "\n\n";
      } else if (/(?:Chinese|中文|原文)/i.test(firstLine)) {
        // Strip the Chinese section header line, keeping remaining content intact
        const contentWithoutHeader = trimmed.substring(firstLine.length).trim();
        zhRaw += contentWithoutHeader + "\n\n";
      } else {
        zhRaw += trimmed + "\n\n";
      }
    });

    return {
      isBilingual: true,
      zh: parseSimpleMarkdown(zhRaw.trim()),
      en: parseSimpleMarkdown(enRaw.trim()),
    };
  }

  return {
    isBilingual: false,
    fullContent: parseSimpleMarkdown(cleanRaw.trim()),
  };
}


function setDrawerWidth(mode) {
  const sidebar = document.getElementById("expert-side-nav");
  if (!sidebar) return;

  sidebar.classList.remove(
    "side-nav-hidden",
    "side-nav-standard",
    "side-nav-split",
    "side-nav-expanded",
    "side-nav-full"
  );

  switch (mode) {
    case "split":
      sidebar.classList.add("side-nav-split");
      break;
    case "expanded":
      sidebar.classList.add("side-nav-expanded");
      break;
    case "full":
      sidebar.classList.add("side-nav-full");
      break;
    case "standard":
    default:
      sidebar.classList.add("side-nav-standard");
      break;
  }

  const btnIds = {
    standard: "btn-drawer-standard",
    split: "btn-drawer-split",
    expanded: "btn-drawer-expanded",
    full: "btn-drawer-full"
  };

  Object.keys(btnIds).forEach(key => {
    const btn = document.getElementById(btnIds[key]);
    if (btn) {
      if (key === mode) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    }
  });
}

function toggleSideNavPeek() {
  const sidebar = document.getElementById("expert-side-nav");
  const peekBtn = document.getElementById("side-nav-peek-toggle");
  if (!sidebar) return;

  const isHidden = sidebar.classList.contains("side-nav-hidden");

  if (isHidden) {
    sidebar.classList.remove("side-nav-hidden");
    sidebar.classList.add("side-nav-standard", "side-nav-overlay-peek");
    if (peekBtn) peekBtn.classList.add("active");

    if (typeof renderDrawerTabContent === "function") {
      renderDrawerTabContent(window.currentDrawerTab || "vista");
    }
  } else {
    sidebar.classList.remove("side-nav-standard", "side-nav-overlay-peek");
    sidebar.classList.add("side-nav-hidden");
    if (peekBtn) peekBtn.classList.remove("active");
  }
}

function renderView(nodeId) {
  if (window.appState) {
    window.appState.currentNodeId = nodeId;
  }
  
  const node = window.ARCHIVE_DATA ? window.ARCHIVE_DATA[nodeId] : null;

  if (!node) {
    console.error(`Node not found: ${nodeId}`);
    return;
  }

  const container = document.getElementById("archive-container");
  const sidebar = document.getElementById("expert-side-nav");
  const drawerControls = document.getElementById("drawer-width-controls");
  const peekBtn = document.getElementById("side-nav-peek-toggle");

  const childrenArray = Array.isArray(node.children) ? node.children : [];
  let children = childrenArray
    .map(id => window.ARCHIVE_DATA[id])
    .filter(child => child && child.ui_render !== false);

    children = sortNodesByPriority(children); 
  let html = "";
  const isLeafNode = children.length === 0;

  updateTabBadges(node);

 if (!isLeafNode) {
    if (sidebar) sidebar.className = "side-nav-hidden";
    if (drawerControls) drawerControls.style.display = "none";

    // --- PEEK BUTTON LOGIC FOR BOARDS ---
    if (peekBtn) {
      // 1. Always unhide the peek button on non-leaf board pages
      peekBtn.classList.remove("hidden", "active");

      // 2. Safely evaluate if a content indicator dot should show
      const hasContent = Boolean(
        node && (
          node.has_content ||
          (Array.isArray(node.section_keys) && node.section_keys.length > 0) ||
          (node.content_sections && Object.keys(node.content_sections).length > 0)
        )
      );

      const badgeDot = peekBtn.querySelector(".peek-badge-dot");
      if (badgeDot) {
        badgeDot.style.display = hasContent ? "inline-block" : "none";
      }
    }
    // ------------------------------------

    const isAtomic = children.every(
      c => c.type === "img" || c.type === "asset" || !Array.isArray(c.children) || c.children.length === 0
    );

    const isRoot = (nodeId === "0-0__0000");
    let levelClass = "level-boards";

    if (isRoot) {
      levelClass = "level-boards";
    } else if (isAtomic) {
      levelClass = "level-gallery";
    } else {
      levelClass = "level-mesoscopic";
    }

    if (!isRoot) {
      html += `
        <div class="meso-header-block">
          <button class="back-btn" onclick="goBack()">← RETURN</button>
          ${renderTitle(node)}
          ${renderDescription(node)}
          ${renderAuthors(node)}
        </div>
      `;
    }

    html += `<div class="board-grid ${levelClass}">`;
    children.forEach(child => {
      const imgSrc = child.img_thumb || child.img_color || child.src || "assets/placeholder.webp";
      const childLeafCount = Array.isArray(child.children) ? child.children.length : 0;

      let badgeText = "";
      let badgeHtml = "";
 
      if (child.age) {
        badgeText = String(child.age).trim();
      } else {
        const count = child.leaf_count || childLeafCount;  
        if (count > 0 && typeof ICONS !== "undefined") {
          badgeHtml = `<div class="board-badge folder-badge">${ICONS.folder || ''} <span>(${count})</span></div>`;
        } else if ((child.type === "pdf" || child.type === "audio" || child.type === "video") && typeof ICONS !== "undefined") {
          const mediaIcon = ICONS[child.type] || "";
          if (mediaIcon) {
            badgeHtml = `<div class="board-badge media-badge type-${child.type}">${mediaIcon}</div>`;
          }
        }
      }

      html += `
        <div class="board-tile" ${badgeText ? `data-badge="${badgeText}"` : ''} onclick="navigate('${child.id}')">
          <img src="${imgSrc}" alt="${child.title_en || child.title_zh || child.id}" loading="lazy" decoding="async" />
          ${badgeHtml}
          <div class="tile-overlay">
            <div class="tile-title">
              ${child.title_zh ? `<span class="title-zh" lang="zh-HK">${child.title_zh}</span> ` : ''}
              ${child.title_en ? `<span class="title-en" lang="en">${child.title_en}</span>` : (!child.title_zh ? child.id : '')}
            </div>
            ${child.description_en || child.description_zh ? `
              <div class="tile-desc">
                ${child.description_zh ? `<span lang="zh-HK">${child.description_zh}</span> ` : ''}
                ${child.description_en ? `<span lang="en">${child.description_en}</span>` : ''}
              </div>
            ` : ""}
          </div>
        </div>
      `;
    });
    html += `</div>`;

  } else {
    if (peekBtn) peekBtn.classList.add("hidden");
    if (drawerControls) drawerControls.style.display = "flex";
    if (sidebar) sidebar.classList.remove("side-nav-overlay-peek");

    html += `
      <div class="meso-header-block">
        <button class="back-btn" onclick="goBack()">← RETURN</button>
        ${renderTitle(node)}
        ${renderDescription(node)}
        ${renderAuthors(node)}
      </div>
      <div style="padding: 0 40px 40px 40px;">
        <div id="media-viewport" style="margin-bottom: 24px; min-height: 200px;"></div>
      </div>
    `;

    setDrawerWidth("standard");
    renderDrawerTabContent(window.currentDrawerTab || "vista", node);
  }

  if (container) container.innerHTML = html;
  if (isLeafNode && typeof renderNodeMedia === "function") renderNodeMedia(node);
  if (typeof renderBreadcrumb === "function") renderBreadcrumb(node);
}

function renderFilteredGrid(nodes) {
  const container = document.getElementById("archive-container");
  const sidebar = document.getElementById("expert-side-nav");

  if (sidebar) sidebar.className = "side-nav-hidden";

  if (!nodes || nodes.length === 0) {
    if (container) {
      container.innerHTML = `<div style="padding: 40px; color: rgba(255,255,255,0.5);">No matching entries found.</div>`;
    }
    return;
  }

  let html = `
    <div class="meso-header-block">
      <h2 class="node-title"><span class="title-en">Filtered Results (${nodes.length})</span></h2>
    </div>
    <div class="board-grid level-gallery">
  `;

  nodes.forEach(child => {
    const imgSrc = child.img_color || child.img_mono || child.src || "assets/placeholder.webp";
    html += `
      <div class="board-tile" onclick="navigate('${child.id}')">
        <img src="${imgSrc}" alt="${child.title_en || child.title_zh || child.id}" loading="lazy" decoding="async" />
        <div class="tile-overlay">
          <div class="tile-title">
            ${child.title_zh ? `<span class="title-zh" lang="zh-HK">${child.title_zh}</span> ` : ''}
            ${child.title_en ? `<span class="title-en" lang="en">${child.title_en}</span>` : (!child.title_zh ? child.id : '')}
          </div>
        </div>
      </div>
    `;
  });

  html += `</div>`;
  if (container) container.innerHTML = html;
}

// Attach horizontal wheel scrolling for tabs container
document.addEventListener('wheel', (evt) => {
  const tabsContainer = evt.target.closest('#drawer-tabs, .drawer-tabs, .nav-tabs');
  if (tabsContainer && evt.deltaY !== 0) {
    evt.preventDefault();
    tabsContainer.scrollLeft += evt.deltaY;
  }
}, { passive: false });
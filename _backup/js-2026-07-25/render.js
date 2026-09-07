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

function renderView(nodeId) {
  const node = window.ARCHIVE_DATA ? window.ARCHIVE_DATA[nodeId] : null;

  if (!node) {
    console.error(`Node not found: ${nodeId}`);
    return;
  }

  const container = document.getElementById("archive-container");
  const sidebar = document.getElementById("expert-side-nav");

  const childrenArray = Array.isArray(node.children) ? node.children : [];
  const children = childrenArray
    .map(id => window.ARCHIVE_DATA[id])
    .filter(child => child && child.ui_render !== false);

  let html = "";
  const isLeafNode = children.length === 0;

  if (!isLeafNode) {
    // --- NON-LEAF NODE (BOARDS / GALLERIES) ---
    const isAtomic = children.every(
      c => c.type === "img" || c.type === "asset" || !Array.isArray(c.children) || c.children.length === 0
    );

    const isRoot = (nodeId === "0-0__0000");
    let levelClass = "level-boards";

    if (isRoot) {
      levelClass = "level-boards level-flex";
    } else if (isAtomic) {
      levelClass = "level-gallery";
    } else if (typeof historyStack !== "undefined" && historyStack.length > 1) {
      levelClass = "level-mesoscopic";
    }

    if (!isRoot) {
      html += `
        <div class="meso-header-block">
          <button class="back-btn" onclick="goBack()">← RETURN</button>
          ${typeof renderTitle === "function" ? renderTitle(node) : ''}
          ${typeof renderDescription === "function" ? renderDescription(node) : ''}
        </div>
      `;
    }

    html += `<div class="board-grid ${levelClass}">`;
    children.forEach(child => {
      const imgSrc = child.img_color || child.img_mono || child.src || "assets/placeholder.webp";
      const childLeafCount = Array.isArray(child.children) ? child.children.length : 0;
      
      let badgeText = "";
      if (child.age) {
        badgeText = String(child.age).trim();
      } else if (levelClass.includes("level-mesoscopic")) {
        const count = child.leaf_count || childLeafCount;
        badgeText = count ? `${count} ITEMS` : "";
      }

      html += `
        <div class="board-tile" ${badgeText ? `data-badge="${badgeText}"` : ''} onclick="navigate('${child.id}')">
          <img src="${imgSrc}" alt="${child.title_en || child.title_zh || child.id}" loading="lazy" />
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

    if (sidebar) {
      sidebar.className = isRoot ? "side-nav-compact" : ((levelClass === "level-gallery") ? "side-nav-expanded" : "side-nav-compact");
    }

  } else {
    // --- LEAF NODE (SINGLE MEDIA ENTRY) ---
    html += `
      <div class="meso-header-block">
        <button class="back-btn" onclick="goBack()">← RETURN</button>
        ${typeof renderTitle === "function" ? renderTitle(node) : `<h2 style="color:#fff;">${node.title_en || node.id}</h2>`}
        ${typeof renderDescription === "function" ? renderDescription(node) : ''}
      </div>
      <div style="padding: 0 40px 40px 40px;">
        <div id="media-viewport" style="margin-bottom: 24px; min-height: 200px;"></div>
      </div>
    `;

    if (sidebar) {
      sidebar.className = "side-nav-expanded";
    }
  }

  // CRITICAL STEP: Write HTML to DOM FIRST
  if (container) {
    container.innerHTML = html;
  }

  // NOW trigger media rendering since #media-viewport exists in DOM
  if (isLeafNode && typeof renderNodeMedia === "function") {
    renderNodeMedia(node);
  }

  if (nodeId === "0-0__0000") {
    historyStack = ["0-0__0000"];
  }

  renderBreadcrumb(node);
}
/**
 * Settings & Preference Management
 */

// 1. Font Size Controller
function setFontSize(size) {
  const validSizes = ['small', 'medium', 'large'];
  const targetSize = validSizes.includes(size) ? size : 'medium';
  
  document.body.classList.remove('font-small', 'font-medium', 'font-large');
  document.body.classList.add(`font-${targetSize}`);
  
  localStorage.setItem('archive_font_size', targetSize);
  updateSettingsUI();
}

// 2. Board Visibility Controller
function toggleBoardVisibility(boardId) {
  let hiddenBoards = JSON.parse(localStorage.getItem('archive_hidden_boards') || '[]');
  
  if (hiddenBoards.includes(boardId)) {
    hiddenBoards = hiddenBoards.filter(id => id !== boardId);
  } else {
    hiddenBoards.push(boardId);
  }
  
  localStorage.setItem('archive_hidden_boards', JSON.stringify(hiddenBoards));
  
  // Re-render current view if on root or board level
  if (window.appState && window.appState.currentNodeId) {
    renderView(window.appState.currentNodeId);
  }
}

// Helper to check if a board is visible
function isBoardVisible(boardId) {
  const hiddenBoards = JSON.parse(localStorage.getItem('archive_hidden_boards') || '[]');
  return !hiddenBoards.includes(boardId);
}

// 3. Render Settings Pane Content
function renderSettingsPane() {
  const displayPane = document.getElementById('tab-display-pane');
  if (!displayPane) return;

  const currentSize = localStorage.getItem('archive_font_size') || 'medium';
  const rootNode = window.ARCHIVE_DATA ? window.ARCHIVE_DATA["0-0__0000"] : null;
  const rootChildren = (rootNode && Array.isArray(rootNode.children)) ? rootNode.children : [];

  let boardsHtml = '';
  rootChildren.forEach(childId => {
    const child = window.ARCHIVE_DATA[childId];
    if (!child) return;
    
    const isChecked = isBoardVisible(child.id);
    const title = child.title_zh || child.title_en || child.id;

    boardsHtml += `
      <label style="display: flex; align-items: center; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05); cursor: pointer;">
        <span style="font-size: 13px; color: rgba(255,255,255,0.85);">${title}</span>
        <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="toggleBoardVisibility('${child.id}')" style="accent-color: #64b5f6; cursor: pointer;">
      </label>
    `;
  });

  displayPane.innerHTML = `
    <div style="padding: 16px; color: #ddd; font-size: 14px;">
      <div style="margin-bottom: 24px;">
        <div style="text-transform: uppercase; font-size: 11px; color: #888; letter-spacing: 1px; margin-bottom: 10px;">Font Size (字體大小)</div>
        <div style="display: flex; gap: 8px;">
          <button onclick="setFontSize('small')" class="back-btn ${currentSize === 'small' ? 'active' : ''}" style="flex:1; margin:0;">Small</button>
          <button onclick="setFontSize('medium')" class="back-btn ${currentSize === 'medium' ? 'active' : ''}" style="flex:1; margin:0;">Medium</button>
          <button onclick="setFontSize('large')" class="back-btn ${currentSize === 'large' ? 'active' : ''}" style="flex:1; margin:0;">Large</button>
        </div>
      </div>

      <div style="margin-bottom: 24px;">
        <div style="text-transform: uppercase; font-size: 11px; color: #888; letter-spacing: 1px; margin-bottom: 10px;">Board Visibility (看板顯示)</div>
        <div style="display: flex; flex-direction: column; gap: 2px;">
          ${boardsHtml || '<p style="color:#666; font-style:italic;">No root boards loaded.</p>'}
        </div>
      </div>

      <div style="margin-top: 36px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1);">
        <div style="text-transform: uppercase; font-size: 11px; color: #e57373; letter-spacing: 1px; margin-bottom: 10px;">Danger Zone</div>
        <button onclick="returnToNothingness()" style="width: 100%; background: rgba(229,115,115,0.1); border: 1px solid #e57373; color: #e57373; padding: 8px; font-family: inherit; font-size: 12px; border-radius: 4px; cursor: pointer; transition: all 0.2s;">
          Return to Nothingness (歸無)
        </button>
      </div>
    </div>
  `;
}

// open the side drawer and activate the Settings tab when the gear icon is clicked:
function openSettingsDrawer() {
  const sidebar = document.getElementById("expert-side-nav");
  
  // Show drawer overlay if currently hidden
  if (sidebar && sidebar.classList.contains("side-nav-hidden")) {
    sidebar.classList.remove("side-nav-hidden");
    sidebar.classList.add("side-nav-overlay-peek");
  }

  // Switch tab display to Settings
  if (typeof switchDrawerTab === "function") {
    switchDrawerTab("settings");
  } else if (typeof renderSettingsPane === "function") {
    renderSettingsPane();
  }
}


// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  const savedSize = localStorage.getItem('archive_font_size') || 'medium';
  setFontSize(savedSize);
});
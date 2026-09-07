/**
 * Settings & Preference Management
 */

// 1. Dynamic Font Size Controller
function applyFontSize(size) {
  const numericSize = parseInt(size, 10) || 16;
  
  // Save to global state & local storage
  if (window.appState) {
    window.appState.drawerFontSize = numericSize;
  }
  localStorage.setItem('archive_drawer_font_size', numericSize);

  // 1. Update numeric label in settings drawer (if open)
  const fontSizeVal = document.getElementById('font-size-val');
  if (fontSizeVal) {
    fontSizeVal.textContent = `${numericSize}px`;
  }

  // 2. Set dynamic CSS variable on the side navigation drawer
  const sideNav = document.getElementById('expert-side-nav');
  if (sideNav) {
    sideNav.style.setProperty('--side-nav-font-size', `${numericSize}px`);
  }
}

// 2. Return to Nothingness (歸無)
function returnToNothingness() {
  const confirmed = confirm("Are you sure you want to Return to Nothingness? This will reset all local preferences and return to the root node.");
  if (!confirmed) return;

  localStorage.removeItem('archive_drawer_font_size');
  localStorage.removeItem('archive_hidden_boards');

  // Reset font state to default 16px
  applyFontSize(16);

  toggleSettingsPanel(false);

  if (window.appState) {
    window.appState.currentNodeId = "0-0__0000";
    window.appState.historyStack = ["0-0__0000"];
  }

  if (typeof renderView === "function") {
    renderView("0-0__0000");
  }
}

// 3. Panel Toggle Logic
function toggleSettingsPanel(show) {
  const overlay = document.getElementById("settings-overlay") || document.getElementById("settings-panel");
  if (!overlay) return;

  const isHidden = typeof show === "boolean" ? !show : !overlay.classList.contains("hidden");

  if (!isHidden) {
    overlay.classList.remove("hidden");
    overlay.classList.add("active");
  } else {
    overlay.classList.add("hidden");
    overlay.classList.remove("active");
  }
}

function openSettingsDrawer() { toggleSettingsPanel(true); }
function closeSettingsDrawer() { toggleSettingsPanel(false); }

// DOM Event Listeners for Settings Controls
document.addEventListener('DOMContentLoaded', () => {
  // Initialize dynamic font size from state/storage
  const initialSize = window.appState?.drawerFontSize || 16;
  
  const fontSizeInput = document.getElementById('font-size-slider');
  if (fontSizeInput) {
    fontSizeInput.value = initialSize;
    fontSizeInput.addEventListener('input', (e) => {
      applyFontSize(e.target.value);
    });
  }

  // Apply CSS property on initial page load
  applyFontSize(initialSize);
});

/* 4. Panel Toggle Logic
function toggleSettingsPanel(show) {
  const overlay = document.getElementById("settings-overlay") || document.getElementById("settings-panel");
  if (!overlay) return;

  const isHidden = typeof show === "boolean" ? !show : !overlay.classList.contains("hidden");

  if (!isHidden) {
    renderSettingsPane();
    overlay.classList.remove("hidden");
    overlay.classList.add("active");
  } else {
    overlay.classList.add("hidden");
    overlay.classList.remove("active");
  }
}

function openSettingsDrawer() {
  toggleSettingsPanel(true);
}

function closeSettingsDrawer() {
  toggleSettingsPanel(false);
}

// JavaScript Event Listener Setup
const fontSizeInput = document.getElementById('font-size-slider');
const fontSizeVal = document.getElementById('font-size-val'); // Text element showing '16px'

fontSizeInput.addEventListener('input', (e) => {
  const val = e.target.value;
  const size = `${val}px`;

  // 1. Update the indicator text dynamically
  if (fontSizeVal) {
    fontSizeVal.textContent = size;
  }

  // 2. Set a CSS variable on the side navigation drawer container
  const sideNav = document.getElementById('expert-side-nav');
  if (sideNav) {
    sideNav.style.setProperty('--side-nav-font-size', size);
  }

  // 3. Fallback: Directly apply font-size to side nav content blocks & tabs
  document.querySelectorAll('#expert-side-nav .tab-display-pane, #expert-side-nav .tab-pane, #expert-side-nav .vista-content, #expert-side-nav .text-content, #expert-side-nav .archive-content-block, #expert-side-nav .node-description')
    .forEach(el => {
      el.style.fontSize = size;
    });
});


// Initialize saved font size on startup
document.addEventListener('DOMContentLoaded', () => {
  const savedSize = localStorage.getItem('archive_font_size') || 'medium';
  setFontSize(savedSize);
});  */
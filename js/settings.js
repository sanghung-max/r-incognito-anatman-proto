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

document.getElementById('reset-view-btn').addEventListener('click', () => {
  // Clear selection state and return to top-level view
  if (typeof renderLevel1 === 'function') {
    renderLevel1(); // Or your root state render function
  }
  
  // Close the sidebar/settings panel
  const settingsOverlay = document.querySelector('.settings-overlay');
  if (settingsOverlay) settingsOverlay.classList.add('hidden');
});
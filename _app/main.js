document.addEventListener("DOMContentLoaded", () => {
	
  window.appState = window.appState || {
  currentNodeId: "0-0__0000",
  history: []
  };
  if (window.ARCHIVE_DATA) {
    // Build initial parent lookup map
    getParentMap();
    
    // Populate top Find filter boards dropdown
    if (typeof populateFilterBoards === "function") {
      populateFilterBoards();
    }

    // Render initial root board flex layout

   if (typeof renderView === "function") {
     renderView(window.appState.currentNodeId);
   }
   
  } else {
    console.error("ARCHIVE_DATA failed to load.");
  }
  
  const findBtn = document.getElementById("find-toggle-btn");
  if (findBtn && typeof ICONS !== "undefined" && ICONS.search) {
    findBtn.innerHTML = ICONS.search;
  }

  const peekContainer = document.getElementById("peek-icon-container");
  if (peekContainer && typeof ICONS !== "undefined" && ICONS.peek) {
    peekContainer.innerHTML = ICONS.peek;
  }
  
});
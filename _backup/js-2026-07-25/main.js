document.addEventListener("DOMContentLoaded", () => {
  if (window.ARCHIVE_DATA) {
    // Build initial parent lookup map
    getParentMap();
    
    // Populate top Find filter boards dropdown
    if (typeof populateFilterBoards === "function") {
      populateFilterBoards();
    }

    // Render initial root board flex layout
    renderView("0-0__0000");
  } else {
    console.error("ARCHIVE_DATA failed to load.");
  }
});
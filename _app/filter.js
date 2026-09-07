/**
 * Global Filter State Object (fallback if state.js isn't initialized)
 */
if (typeof filterState === "undefined") {
  window.filterState = {
    language: "all",
    mediaType: "all",
    boardId: "all",
    subCategory: "all"
  };
}

/**
 * Toggles visibility of the Find dropdown overlay panel
 */
function toggleFindDropdown() {
  const panel = document.getElementById("find-dropdown-panel");
  if (panel) {
    panel.classList.toggle("hidden");
  }
}

/**
 * Populates top board options in the filter dropdown dynamically
 */
function populateFilterBoards() {
  const boardSelect = document.getElementById("filter-board");
  if (!boardSelect || !window.ARCHIVE_DATA) return;

  const rootNode = window.ARCHIVE_DATA["0-0__0000"];
  if (!rootNode || !Array.isArray(rootNode.children)) return;

  boardSelect.innerHTML = `<option value="all">All Boards</option>`;
  rootNode.children.forEach(boardId => {
    const board = window.ARCHIVE_DATA[boardId];
    if (board && board.ui_render !== false) {
      const option = document.createElement("option");
      option.value = board.id;
      option.textContent = board.title_en || board.title_zh || board.id;
      boardSelect.appendChild(option);
    }
  });
}

/**
 * Updates Subcategory dropdown options when selected Board changes
 */
function handleBoardFilterChange() {
  const boardSelect = document.getElementById("filter-board");
  const subCatSelect = document.getElementById("filter-subcategory");
  if (!boardSelect || !subCatSelect) return;

  const selectedBoard = boardSelect.value;
  subCatSelect.innerHTML = `<option value="all">All Subcategories</option>`;

  if (selectedBoard !== "all") {
    const subcats = getSubcategoriesForBoard(selectedBoard);
    subcats.forEach(sub => {
      const option = document.createElement("option");
      option.value = sub.id;
      option.textContent = sub.title;
      subCatSelect.appendChild(option);
    });
  }

  handleFilterChange();
}

/**
 * Reads form inputs and updates filterState & grid view
 */
function handleFilterChange() {
  filterState.language = document.getElementById("filter-language")?.value || "all";
  filterState.boardId = document.getElementById("filter-board")?.value || "all";
  filterState.subCategory = document.getElementById("filter-subcategory")?.value || "all";
  filterState.mediaType = document.getElementById("filter-media-type")?.value || "all";
  
  // Check if any active filter is applied
  const isFiltering = Object.values(window.filterState).some(val => val !== "all");
  window.appState.isFilterActive = isFiltering;

  if (isFiltering) {
    const matchedNodes = filterArchiveData(window.filterState);
    renderFilteredGrid(matchedNodes);
  } else {
    // Reset to current navigation node if filters cleared
    renderView(window.appState.currentNodeId);
  }
}

/**
 * Filters ARCHIVE_DATA based on active criteria
 */
function filterArchiveData(state = filterState) {
  if (!window.ARCHIVE_DATA) return [];

  const allNodes = Object.values(window.ARCHIVE_DATA);

  return allNodes.filter(node => {
    if (node.id === "0-0__0000" || node.ui_render === false) return false;

    // LANGUAGE FILTER
    if (state.language !== "all") {
      if (state.language === "zh") {
        const hasZh = Boolean(node.title_zh || node.description_zh);
        if (!hasZh) return false;
      } else if (state.language === "en") {
        const hasEn = Boolean(node.title_en || node.description_en);
        if (!hasEn) return false;
      }
    }

    // MEDIA TYPE FILTER
    if (state.mediaType !== "all") {
      const nodeType = (node.type || "").toLowerCase();
      switch (state.mediaType) {
        case "pdf":
          if (!(nodeType === "pdf" || Array.isArray(node.pdf_manifest) || Boolean(node.page_pattern))) return false;
          break;
        case "image":
          if (!(nodeType === "img" || nodeType === "image" || Boolean(node.img_color || node.img_mono))) return false;
          break;
        case "video":
          if (nodeType !== "video" && !node.video) return false;
          break;
        case "audio":
          if (nodeType !== "audio" && !node.audio) return false;
          break;
      }
    }

    // TOP BOARD FILTER
    if (state.boardId !== "all") {
      const parentMap = typeof getParentMap === "function" ? getParentMap() : {};
      let currId = node.id;
      let matchesBoard = false;
      const visited = new Set();

      while (currId && !visited.has(currId)) {
        visited.add(currId);
        if (currId === state.boardId) {
          matchesBoard = true;
          break;
        }
        currId = parentMap[currId] || (window.ARCHIVE_DATA[currId] && window.ARCHIVE_DATA[currId].parent_node_1);
      }
      if (!matchesBoard) return false;
    }

    // SUBCATEGORY FILTER
    if (state.subCategory !== "all") {
      const parentMap = typeof getParentMap === "function" ? getParentMap() : {};
      const directParent = parentMap[node.id] || node.parent_node_1 || node.parent;
      if (directParent !== state.subCategory && node.category !== state.subCategory) {
        return false;
      }
    }

    return true;
  });
}

function getSubcategoriesForBoard(boardId) {
  if (!window.ARCHIVE_DATA || boardId === "all") return [];
  const boardNode = window.ARCHIVE_DATA[boardId];
  if (!boardNode || !Array.isArray(boardNode.children)) return [];

  return boardNode.children
    .map(childId => window.ARCHIVE_DATA[childId])
    .filter(child => child && child.ui_render !== false)
    .map(child => ({
      id: child.id,
      title: child.title_en || child.title_zh || child.id
    }));
}
// Shared Application State
window.historyStack = ["0-0__0000"];
window._PARENT_MAP = null;

window.filterState = {
  language: "all",
  boardId: "all",
  subCategory: "all",
  mediaType: "all"
};

function getParentMap() {
  if (window._PARENT_MAP) return window._PARENT_MAP;
  const map = {};
  if (!window.ARCHIVE_DATA) return map;

  Object.entries(window.ARCHIVE_DATA).forEach(([id, node]) => {
    const explicitParent = node.parent_node_1 || node.parent || node.parent_id;
    if (explicitParent) map[id] = explicitParent;
    if (Array.isArray(node.children)) {
      node.children.forEach(childId => { map[childId] = id; });
    }
  });

  window._PARENT_MAP = map;
  return map;
}
// 2. Updated renderBreadcrumb using the robust parent map
function renderBreadcrumb(currentNode) {
  const container = document.getElementById('breadcrumb-container');
  if (!container || !currentNode) return;

  const parentMap = getParentMap();
  const rootId = "0-0__0000";
  const trail = [];
  let curr = currentNode;
  const visited = new Set();

  while (curr && !visited.has(curr.id)) {
    visited.add(curr.id);
    trail.unshift(curr);

    // Look up parent ID from map or node property
    const parentId = parentMap[curr.id] || curr.parent_node_1 || curr.parent;

    if (!parentId || parentId === curr.id || parentId === rootId) break;

    // Resolve parent node object
    curr = window.ARCHIVE_DATA[parentId] || null;
  }

// FIXED:
const incognitoIconSvg = ICONS.home;
 
let html = `<nav class="breadcrumb-nav" aria-label="Breadcrumb"><ol class="breadcrumb-list">`;

// Root level icon link (matching variable name):
html += `<li class="breadcrumb-item"><a href="#" class="breadcrumb-link" onclick="event.preventDefault(); navigate('${rootId}');">${incognitoIconSvg}</a></li>`;
  trail.forEach((node, index) => {
    if (node.id === rootId) return; // Skip duplicate root

    html += `<li class="breadcrumb-separator">/</li>`;
    const isLast = index === trail.length - 1;
    const title = node.title_en || node.title_zh || node.id;

    if (isLast) {
      html += `<li class="breadcrumb-item active">${title}</li>`;
    } else {
      html += `<li class="breadcrumb-item"><a href="#" class="breadcrumb-link" onclick="event.preventDefault(); navigate('${node.id}');">${title}</a></li>`;
    }
  });

  html += `</ol></nav>`;
  container.innerHTML = html;
}

function navigate(nodeId) {
  if (typeof historyStack !== "undefined") {
    historyStack.push(nodeId);
  }
  renderView(nodeId);
}

function goBack() {
  if (historyStack.length > 1) {
    historyStack.pop();
    const prevNodeId = historyStack[historyStack.length - 1];
    renderView(prevNodeId);
  }
}
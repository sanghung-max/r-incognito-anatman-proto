function renderNodeMedia(node) {
  const container = document.getElementById("media-viewport");
  if (!container) return;
  container.innerHTML = ""; // Clear existing view

  // 1. AUDIO RENDERER
  if (node.type === "audio" && node.audio) {
    container.innerHTML = `
      <div class="audio-player-wrapper">
        <audio controls src="${node.audio}" style="width: 100%;">
          Your browser does not support the audio element.
        </audio>
      </div>
    `;
    return;
  }

  // 2. VIDEO RENDERER
  if (node.type === "video" && node.video) {
    container.innerHTML = `
      <div class="video-player-wrapper">
        <video controls width="100%" preload="metadata">
          <source src="${node.video}">
          Your browser does not support video playback.
        </video>
      </div>
    `;
    return;
  }

  // 3. STUDENT PUBLICATION (Page Pattern Dynamic Range)
  if (node.page_pattern && node.page_start && node.page_end) {
    let pagesHTML = '<div class="magazine-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px;">';
    for (let p = node.page_start; p <= node.page_end; p++) {
      const pageStr = String(p).padStart(4, '0'); 
      const pdfPath = node.page_pattern.replace("{page}", pageStr);
      const thumbPath = node.page_thumbnail_pattern.replace("{page}", pageStr);

      pagesHTML += `
        <a href="${pdfPath}" target="_blank" class="page-card">
          <img src="${thumbPath}" loading="lazy" decoding="async" alt="Page ${p}" style="width:100%; border-radius:4px;"/>
          <span style="font-size:12px; text-align:center; display:block;">Page ${p}</span>
        </a>
      `;
    }
    pagesHTML += '</div>';
    container.innerHTML = pagesHTML;
    return;
  }

  // 4. PDF DOCUMENTS (Single, Dual, or Grouped Essays)
  if (node.type === "pdf" && Array.isArray(node.pdf_manifest) && node.pdf_manifest.length > 0) {
    let pdfHTML = '<div class="pdf-container" style="display:flex; flex-direction:column; gap:20px;">';
    
    node.pdf_manifest.forEach((item, idx) => {
      pdfHTML += `
        <div class="pdf-item-card" style="border: 1px solid #333; padding: 12px; border-radius: 8px;">
          ${item.thumbnail ? `<img src="${item.thumbnail}" loading="lazy" style="max-width: 200px; display: block; margin-bottom: 8px;" />` : ''}
          <div class="pdf-actions">
            <a href="${item.src}" target="_blank" class="btn">View Document ${node.pdf_manifest.length > 1 ? (idx + 1) : ''} (PDF)</a>
          </div>
          <iframe src="${item.src}" width="100%" height="600px" style="border:none; margin-top:10px;"></iframe>
        </div>
      `;
    });
    
    pdfHTML += '</div>';
    container.innerHTML = pdfHTML;
    return;
  }

  // 5. FALLBACK / IMAGE GALLERY
  if (node.img_color) {
    container.innerHTML = `<img src="${node.img_color}" loading="lazy" style="max-width:100%; height:auto;" />`;
  }
}
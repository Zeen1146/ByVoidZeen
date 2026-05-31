// ================================================================
// PROJECTS.JS — Filter, sort, render project + File Explorer
// ================================================================

let allProjects    = [];
let filteredProjects = [];
let currentFilter  = "all";
let currentSort    = "updated";
let currentSearch  = "";

// State folder terbuka per repo
const explorerState = {};

// ================================================================
// Inisialisasi project
// ================================================================
function initProjects(repos) {
  allProjects = repos.filter(function(r) { return !r.private; });
  applyFiltersAndSort();
}

// ================================================================
// Tentukan kategori repository — FIXED
// ================================================================
function getCategory(repo) {
  var lang   = (repo.language || "").toLowerCase().trim();
  var topics = (repo.topics  || []).map(function(t) { return t.toLowerCase(); });

  var websiteLangs     = ["html", "css", "javascript", "typescript", "vue", "svelte", "astro"];
  var applicationLangs = ["flutter", "kotlin", "java", "swift", "dart"];
  var toolsLangs       = ["python", "go", "rust", "shell", "ruby", "php", "c", "c++", "c#"];

  if (topics.some(function(t) { return ["web","website","frontend","react","vue","nextjs","astro","svelte"].includes(t); })) return "website";
  if (topics.some(function(t) { return ["android","ios","mobile","flutter","app"].includes(t); }))                          return "application";
  if (topics.some(function(t) { return ["cli","tool","script","automation","bot"].includes(t); }))                          return "tools";

  if (websiteLangs.includes(lang))     return "website";
  if (applicationLangs.includes(lang)) return "application";
  if (toolsLangs.includes(lang))       return "tools";

  return "other";
}

// ================================================================
// Cek apakah project adalah "featured"
// ================================================================
function isFeatured(repo) {
  var topics = (repo.topics || []).map(function(t) { return t.toLowerCase(); });
  return siteConfig.featuredTopics.some(function(ft) {
    return topics.includes(ft.toLowerCase());
  });
}

// ================================================================
// Terapkan filter, sort, dan pencarian
// ================================================================
function applyFiltersAndSort() {
  var result = allProjects.slice();

  if (currentFilter !== "all") {
    result = result.filter(function(r) { return getCategory(r) === currentFilter; });
  }

  if (currentSearch.trim()) {
    var q = currentSearch.toLowerCase();
    result = result.filter(function(r) {
      var name   = (r.name        || "").toLowerCase();
      var desc   = (r.description || "").toLowerCase();
      var topics = (r.topics      || []).join(" ").toLowerCase();
      return name.includes(q) || desc.includes(q) || topics.includes(q);
    });
  }

  result.sort(function(a, b) {
    switch (currentSort) {
      case "updated": return new Date(b.updated_at) - new Date(a.updated_at);
      case "oldest":  return new Date(a.created_at) - new Date(b.created_at);
      case "stars":   return (b.stargazers_count || 0) - (a.stargazers_count || 0);
      case "forks":   return (b.forks_count      || 0) - (a.forks_count      || 0);
      case "name":    return a.name.localeCompare(b.name);
      default:        return 0;
    }
  });

  filteredProjects = result;
  renderProjects(result);
  updateProjectCount(result.length, allProjects.length);
}

// ================================================================
// Render daftar project ke grid
// ================================================================
function renderProjects(repos) {
  var grid  = document.getElementById("projects-grid");
  var empty = document.getElementById("empty-state");
  if (!grid) return;

  if (repos.length === 0) {
    grid.innerHTML = "";
    if (empty) empty.classList.remove("hidden");
    return;
  }

  if (empty) empty.classList.add("hidden");

  var html = "";
  var limit = Math.min(repos.length, siteConfig.maxProjects);
  for (var i = 0; i < limit; i++) {
    html += renderProjectCard(repos[i]);
  }
  grid.innerHTML = html;

  // Tombol preview iframe
  grid.querySelectorAll(".btn-preview").forEach(function(btn) {
    btn.addEventListener("click", function() {
      openPreviewModal(btn.dataset.url);
    });
  });

  // Tombol File Explorer
  attachFileExplorerButtons();
}

// ================================================================
// Render satu kartu project (HTML string)
// ================================================================
function renderProjectCard(repo) {
  var lang      = repo.language || "Other";
  var langColor = siteConfig.langColors[lang] || "#8b949e";
  var topics    = (repo.topics || []).slice(0, 3);
  var pagesUrl  = repo.homepage || null;
  var hasDemo   = pagesUrl && pagesUrl.indexOf("http") === 0;
  var category  = getCategory(repo);

  var topicsHtml = topics.map(function(t) {
    return '<span class="topic-tag">' + escapeHtml(t) + '</span>';
  }).join("");

  var demoHtml = hasDemo
    ? '<a href="' + escapeHtml(pagesUrl) + '" target="_blank" rel="noopener" class="project-btn demo">'
      + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12">'
      + '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>'
      + '<polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>'
      + '</svg>Live Demo</a>'
      + '<button class="project-btn btn-preview" data-url="' + escapeHtml(pagesUrl) + '">'
      + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12">'
      + '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>'
      + '<circle cx="8.5" cy="8.5" r="1.5"/>'
      + '<polyline points="21 15 16 10 5 21"/>'
      + '</svg>Preview</button>'
    : "";

  return '<div class="project-card animate-on-scroll" data-category="' + escapeHtml(category) + '">'
    + '<div class="project-header">'
    +   '<div class="project-name">'
    +     '<a href="' + escapeHtml(repo.html_url) + '" target="_blank" rel="noopener">' + escapeHtml(repo.name) + '</a>'
    +   '</div>'
    +   (repo.fork ? '<span class="project-fork-badge">Fork</span>' : '')
    + '</div>'
    + '<p class="project-desc">' + escapeHtml(repo.description || "Tidak ada deskripsi.") + '</p>'
    + (topicsHtml ? '<div class="project-topics">' + topicsHtml + '</div>' : '')
    + '<div class="project-meta">'
    +   '<span class="meta-item">'
    +     '<span class="lang-dot" style="background:' + langColor + '"></span>'
    +     escapeHtml(lang)
    +   '</span>'
    +   '<span class="meta-item">'
    +     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12">'
    +     '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>'
    +     '</svg>'
    +     (repo.stargazers_count || 0)
    +   '</span>'
    +   '<span class="meta-item">'
    +     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12">'
    +     '<circle cx="12" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/>'
    +     '<path d="M18 9v1a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9"/><line x1="12" y1="12" x2="12" y2="15"/>'
    +     '</svg>'
    +     (repo.forks_count || 0)
    +   '</span>'
    +   '<span class="project-updated">' + timeAgo(repo.updated_at) + '</span>'
    + '</div>'
    + '<div class="project-actions">'
    +   '<a href="' + escapeHtml(repo.html_url) + '" target="_blank" rel="noopener" class="project-btn">'
    +     '<svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12">'
    +     '<path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57'
    +     ' 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695'
    +     '-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99'
    +     '.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225'
    +     '-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405'
    +     'c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225'
    +     ' 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3'
    +     ' 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>'
    +     '</svg>Repository'
    +   '</a>'
    +   demoHtml
    + '</div>'
    + '</div>';
}

// ================================================================
// Render featured projects
// ================================================================
function renderFeaturedProjects(repos) {
  var featured = repos.filter(function(r) { return isFeatured(r); });
  var grid    = document.getElementById("featured-grid");
  var section = document.getElementById("featured");
  if (!grid) return;

  if (featured.length === 0) {
    if (section) section.style.display = "none";
    return;
  }

  var html = "";
  var limit = Math.min(featured.length, 6);
  for (var i = 0; i < limit; i++) {
    var repo      = featured[i];
    var lang      = repo.language || "Other";
    var langColor = siteConfig.langColors[lang] || "#8b949e";
    var pagesUrl  = repo.homepage || null;
    var hasDemo   = pagesUrl && pagesUrl.indexOf("http") === 0;

    html += '<div class="featured-card animate-on-scroll">'
      + '<span class="featured-badge">★ Featured</span>'
      + '<div class="project-name" style="margin-bottom:12px;font-size:18px;">'
      +   '<a href="' + escapeHtml(repo.html_url) + '" target="_blank" rel="noopener">' + escapeHtml(repo.name) + '</a>'
      + '</div>'
      + '<p class="project-desc" style="margin-bottom:16px;">' + escapeHtml(repo.description || "Tidak ada deskripsi.") + '</p>'
      + '<div class="project-meta" style="margin-bottom:16px;">'
      +   '<span class="meta-item"><span class="lang-dot" style="background:' + langColor + '"></span>' + escapeHtml(lang) + '</span>'
      +   '<span class="meta-item">★ ' + (repo.stargazers_count || 0) + '</span>'
      + '</div>'
      + '<div class="project-actions">'
      +   '<a href="' + escapeHtml(repo.html_url) + '" target="_blank" rel="noopener" class="btn btn-secondary btn-sm">Repository</a>'
      +   (hasDemo ? '<a href="' + escapeHtml(pagesUrl) + '" target="_blank" rel="noopener" class="btn btn-primary btn-sm">Live Demo ↗</a>' : '')
      + '</div>'
      + '</div>';
  }

  grid.innerHTML = html;
}

// ================================================================
// Update hitungan project
// ================================================================
function updateProjectCount(shown, total) {
  var el1 = document.getElementById("count-shown");
  var el2 = document.getElementById("count-total");
  if (el1) el1.textContent = shown;
  if (el2) el2.textContent = total;
}

// ================================================================
// Buka modal preview iframe
// ================================================================
function openPreviewModal(url) {
  var modal   = document.getElementById("preview-modal");
  var iframe  = document.getElementById("preview-iframe");
  var urlEl   = document.getElementById("preview-url");
  var openBtn = document.getElementById("preview-open");
  if (!modal || !iframe) return;

  iframe.src = url;
  if (urlEl)   urlEl.textContent = url;
  if (openBtn) openBtn.href = url;
  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

// ================================================================
// FILE EXPLORER — Pasang tombol ke kartu project
// ================================================================
function attachFileExplorerButtons() {
  var grid = document.getElementById("projects-grid");
  if (!grid) return;

  grid.querySelectorAll(".project-card:not([data-explorer-attached])").forEach(function(card) {
    var actionsEl = card.querySelector(".project-actions");
    if (!actionsEl) return;

    var repoLink = card.querySelector(".project-name a");
    if (!repoLink) return;

    var href  = repoLink.getAttribute("href") || "";
    var parts = href.split("/");
    var repoName = parts[parts.length - 1];
    if (!repoName) return;

    var btn = document.createElement("button");
    btn.className = "project-btn explorer-trigger-btn";
    btn.title     = "Jelajahi file repository ini";
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12">'
      + '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>'
      + '</svg> Files';

    btn.addEventListener("click", function(e) {
      e.stopPropagation();
      var pathEl = document.getElementById("explorer-path-repo");
      if (pathEl) pathEl.textContent = repoName;
      openFileExplorer(repoName);
    });

    actionsEl.appendChild(btn);
    card.setAttribute("data-explorer-attached", "true");
  });
}

// ================================================================
// FILE EXPLORER — Buka modal
// ================================================================
function openFileExplorer(repoName) {
  ensureExplorerModal();

  var modal     = document.getElementById("file-explorer-modal");
  var titleEl   = document.getElementById("explorer-repo-name");
  var treeEl    = document.getElementById("explorer-tree");
  var loadingEl = document.getElementById("explorer-loading");
  var pathEl    = document.getElementById("explorer-path-repo");
  var footerEl  = document.getElementById("explorer-file-count");

  if (titleEl) titleEl.textContent = repoName;
  if (pathEl)  pathEl.textContent  = repoName;

  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";

  if (treeEl)    treeEl.innerHTML = "";
  if (loadingEl) loadingEl.classList.remove("hidden");
  if (footerEl)  footerEl.innerHTML = "Memuat...";

  if (!explorerState[repoName]) {
    explorerState[repoName] = new Set([""]);
  }

  fetchRepoTree(repoName).then(function(tree) {
    if (loadingEl) loadingEl.classList.add("hidden");

    if (!tree || !tree.children || tree.children.length === 0) {
      if (treeEl) treeEl.innerHTML =
        '<div style="text-align:center;padding:40px;color:var(--text-tertiary);">'
        + '<span style="font-size:32px;">😕</span>'
        + '<p style="margin-top:12px;font-family:var(--font-mono);font-size:13px;">'
        + 'Gagal memuat atau repository kosong.</p></div>';
      return;
    }

    if (treeEl) renderExplorerTree(treeEl, tree, repoName, 0);

    var total = countAllFiles(tree);
    if (footerEl) {
      footerEl.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12">'
        + '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>'
        + '<polyline points="14 2 14 8 20 8"/></svg> '
        + total + ' file';
    }
  });
}

// ================================================================
// FILE EXPLORER — Render pohon file rekursif
// ================================================================
function renderExplorerTree(container, node, repoName, depth) {
  var items = (depth === 0) ? node.children : [node];
  if (!items || items.length === 0) return;

  var ul = document.createElement("ul");
  ul.className         = "explorer-list";
  ul.style.paddingLeft = depth === 0 ? "0" : "18px";

  items.forEach(function(child) {
    var li       = document.createElement("li");
    li.className = "explorer-item";

    var iconInfo = getFileIcon(child.name, child.type);
    var isOpen   = explorerState[repoName] && explorerState[repoName].has(child.path);

    if (child.type === "tree") {
      // ── FOLDER ──
      var folderRow       = document.createElement("div");
      folderRow.className = "explorer-row explorer-folder" + (isOpen ? " open" : "");
      folderRow.dataset.path = child.path;

      var arrowSpan       = document.createElement("span");
      arrowSpan.className   = "explorer-arrow";
      arrowSpan.textContent = isOpen ? "▾" : "▸";

      var iconSpan        = document.createElement("span");
      iconSpan.className    = "explorer-icon";
      iconSpan.textContent  = isOpen ? iconInfo.iconOpen : iconInfo.icon;

      var nameSpan        = document.createElement("span");
      nameSpan.className    = "explorer-name";
      nameSpan.style.color  = iconInfo.color;
      nameSpan.textContent  = child.name;

      var badgeSpan         = document.createElement("span");
      badgeSpan.className   = "explorer-badge";
      badgeSpan.textContent = countFiles(child);

      folderRow.appendChild(arrowSpan);
      folderRow.appendChild(iconSpan);
      folderRow.appendChild(nameSpan);
      folderRow.appendChild(badgeSpan);

      var subContainer          = document.createElement("div");
      subContainer.className    = "explorer-sub";
      subContainer.style.display = isOpen ? "block" : "none";

      if (isOpen) {
        child.children.forEach(function(grandchild) {
          renderExplorerTree(subContainer, grandchild, repoName, depth + 1);
        });
      }

      folderRow.addEventListener("click", function() {
        var opened = explorerState[repoName] && explorerState[repoName].has(child.path);
        if (opened) {
          explorerState[repoName].delete(child.path);
          folderRow.classList.remove("open");
          arrowSpan.textContent      = "▸";
          iconSpan.textContent       = iconInfo.icon;
          subContainer.style.display = "none";
        } else {
          if (!explorerState[repoName]) explorerState[repoName] = new Set();
          explorerState[repoName].add(child.path);
          folderRow.classList.add("open");
          arrowSpan.textContent      = "▾";
          iconSpan.textContent       = iconInfo.iconOpen;
          subContainer.style.display = "block";

          if (!subContainer.hasChildNodes()) {
            child.children.forEach(function(grandchild) {
              renderExplorerTree(subContainer, grandchild, repoName, depth + 1);
            });
          }
        }
      });

      li.appendChild(folderRow);
      li.appendChild(subContainer);

    } else {
      // ── FILE ──
      var fileRow       = document.createElement("div");
      fileRow.className = "explorer-row explorer-file";

      var fArrow          = document.createElement("span");
      fArrow.className    = "explorer-arrow";
      fArrow.style.opacity = "0";
      fArrow.textContent  = "▸";

      var fIcon           = document.createElement("span");
      fIcon.className     = "explorer-icon";
      fIcon.textContent   = iconInfo.icon;

      var targetUrl = child.isWebFile ? child.liveUrl : child.githubUrl;
      var isLive    = child.isWebFile;

      var fLink           = document.createElement("a");
      fLink.href          = targetUrl;
      fLink.target        = "_blank";
      fLink.rel           = "noopener";
      fLink.className     = "explorer-name explorer-file-link" + (isLive ? " explorer-live-link" : "");
      fLink.style.color   = iconInfo.color;
      fLink.title         = isLive
        ? "🌐 Buka Live Preview di GitHub Pages"
        : "📄 Lihat kode di GitHub";
      fLink.textContent   = child.name;

      fileRow.appendChild(fArrow);
      fileRow.appendChild(fIcon);
      fileRow.appendChild(fLink);

      if (isLive) {
        var liveBadge         = document.createElement("span");
        liveBadge.className   = "explorer-live-badge";
        liveBadge.textContent = "LIVE";
        fileRow.appendChild(liveBadge);
      }

      if (child.size > 0) {
        var sizeSpan         = document.createElement("span");
        sizeSpan.className   = "explorer-size";
        sizeSpan.textContent = formatFileSize(child.size);
        fileRow.appendChild(sizeSpan);
      }

      li.appendChild(fileRow);
    }

    ul.appendChild(li);
  });

  container.appendChild(ul);
}

// ================================================================
// Hitung file dalam folder
// ================================================================
function countFiles(node) {
  if (!node.children) return 0;
  var count = 0;
  node.children.forEach(function(child) {
    if (child.type === "blob") count++;
    else count += countFiles(child);
  });
  return count;
}

function countAllFiles(node) {
  return countFiles(node);
}

// ================================================================
// Buat modal File Explorer di DOM (hanya sekali)
// ================================================================
function ensureExplorerModal() {
  if (document.getElementById("file-explorer-modal")) return;

  var modal       = document.createElement("div");
  modal.id        = "file-explorer-modal";
  modal.className = "file-explorer-modal hidden";

  modal.innerHTML =
    '<div class="explorer-overlay"></div>'
    + '<div class="explorer-container">'
    + '<div class="explorer-header">'
    +   '<div class="explorer-header-left">'
    +     '<div class="explorer-dots">'
    +       '<span class="dot dot-red"></span>'
    +       '<span class="dot dot-yellow"></span>'
    +       '<span class="dot dot-green"></span>'
    +     '</div>'
    +     '<span class="explorer-title-icon">📁</span>'
    +     '<span id="explorer-repo-name" class="explorer-title">repository</span>'
    +   '</div>'
    +   '<div class="explorer-header-right">'
    +     '<span class="explorer-subtitle">File Explorer</span>'
    +     '<button class="explorer-close-btn" id="explorer-close" aria-label="Tutup">'
    +       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">'
    +       '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>'
    +       '</svg>'
    +     '</button>'
    +   '</div>'
    + '</div>'
    + '<div class="explorer-path-bar">'
    +   '<span class="path-segment">~</span>'
    +   '<span class="path-sep">/</span>'
    +   '<span class="path-segment" id="explorer-path-repo">...</span>'
    + '</div>'
    + '<div class="explorer-body">'
    +   '<div id="explorer-loading" class="explorer-loading">'
    +     '<div class="explorer-spinner"></div>'
    +     '<span>Memuat struktur file...</span>'
    +   '</div>'
    +   '<div id="explorer-tree" class="explorer-tree"></div>'
    + '</div>'
    + '<div class="explorer-footer">'
    +   '<span id="explorer-file-count" class="explorer-footer-info">'
    +     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12">'
    +     '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>'
    +     '<polyline points="14 2 14 8 20 8"/></svg> Memuat...'
    +   '</span>'
    +   '<span class="explorer-footer-tip">'
    +     '<span class="explorer-live-badge" style="font-size:10px;">LIVE</span>'
    +     ' = GitHub Pages'
    +   '</span>'
    + '</div>'
    + '</div>';

  document.body.appendChild(modal);

  document.getElementById("explorer-close").addEventListener("click", closeFileExplorer);
  modal.querySelector(".explorer-overlay").addEventListener("click", closeFileExplorer);

  document.addEventListener("keydown", function(e) {
    if (e.key === "Escape") {
      var m = document.getElementById("file-explorer-modal");
      if (m && !m.classList.contains("hidden")) closeFileExplorer();
    }
  });
}

// ================================================================
// Tutup modal File Explorer
// ================================================================
function closeFileExplorer() {
  var modal = document.getElementById("file-explorer-modal");
  if (!modal) return;
  modal.classList.add("hidden");
  document.body.style.overflow = "";
}

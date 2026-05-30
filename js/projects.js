// ================================================================
// PROJECTS.JS — Logika filter, sort, dan render project
// ================================================================

let allProjects = [];
let filteredProjects = [];
let currentFilter = "all";
let currentSort = "updated";
let currentSearch = "";

// ================================================================
// Inisialisasi project
// ================================================================
function initProjects(repos) {
  allProjects = repos.filter(r => !r.private);
  applyFiltersAndSort();
}

// ================================================================
// Tentukan kategori repository
// ================================================================
function getCategory(repo) {
  const lang = (repo.language || "").toLowerCase();
  const name = (repo.name || "").toLowerCase();
  const topics = (repo.topics || []).map(t => t.toLowerCase());

  const website = siteConfig.categories.website.map(l => l.toLowerCase());
  const application = siteConfig.categories.application.map(l => l.toLowerCase());
  const tools = siteConfig.categories.tools.map(l => l.toLowerCase());

  // Cek topics dulu
  if (topics.some(t => ["web", "website", "frontend", "react", "vue", "nextjs", "astro"].includes(t))) return "website";
  if (topics.some(t => ["android", "ios", "mobile", "flutter", "app"].includes(t))) return "application";
  if (topics.some(t => ["cli", "tool", "script", "automation", "bot"].includes(t))) return "tools";

  if (website.includes(lang)) return "website";
  if (application.includes(lang)) return "application";
  if (tools.includes(lang)) return "tools";

  return "other";
}

// ================================================================
// Cek apakah project adalah "featured"
// ================================================================
function isFeatured(repo) {
  const topics = (repo.topics || []).map(t => t.toLowerCase());
  return siteConfig.featuredTopics.some(ft => topics.includes(ft.toLowerCase()));
}

// ================================================================
// Terapkan filter, sort, dan pencarian
// ================================================================
function applyFiltersAndSort() {
  let result = [...allProjects];

  // Filter kategori
  if (currentFilter !== "all") {
    result = result.filter(r => getCategory(r) === currentFilter);
  }

  // Pencarian
  if (currentSearch.trim()) {
    const q = currentSearch.toLowerCase();
    result = result.filter(r => {
      const name = (r.name || "").toLowerCase();
      const desc = (r.description || "").toLowerCase();
      const topics = (r.topics || []).join(" ").toLowerCase();
      return name.includes(q) || desc.includes(q) || topics.includes(q);
    });
  }

  // Urutkan
  result.sort((a, b) => {
    switch (currentSort) {
      case "updated": return new Date(b.updated_at) - new Date(a.updated_at);
      case "oldest": return new Date(a.created_at) - new Date(b.created_at);
      case "stars": return (b.stargazers_count || 0) - (a.stargazers_count || 0);
      case "forks": return (b.forks_count || 0) - (a.forks_count || 0);
      case "name": return a.name.localeCompare(b.name);
      default: return 0;
    }
  });

  filteredProjects = result;
  renderProjects(result);
  updateProjectCount(result.length, allProjects.length);
}

// ================================================================
// Render daftar project
// ================================================================
function renderProjects(repos) {
  const grid = document.getElementById("projects-grid");
  const empty = document.getElementById("empty-state");

  if (!grid) return;

  if (repos.length === 0) {
    grid.innerHTML = "";
    empty.classList.remove("hidden");
    return;
  }

  empty.classList.add("hidden");
  grid.innerHTML = repos.slice(0, siteConfig.maxProjects).map(repo => renderProjectCard(repo)).join("");

  // Event listener untuk tombol preview
  grid.querySelectorAll(".btn-preview").forEach(btn => {
    btn.addEventListener("click", () => {
      const url = btn.dataset.url;
      openPreviewModal(url);
    });
  });
}

// ================================================================
// Render satu kartu project
// ================================================================
function renderProjectCard(repo) {
  const lang = repo.language || "Other";
  const langColor = siteConfig.langColors[lang] || "#8b949e";
  const topics = (repo.topics || []).slice(0, 3);
  const pagesUrl = repo.homepage || null;
  const hasDemo = pagesUrl && pagesUrl.startsWith("http");
  const category = getCategory(repo);

  const topicsHtml = topics.map(t =>
    `<span class="topic-tag">${t}</span>`
  ).join("");

  return `
    <div class="project-card animate-on-scroll" data-category="${category}">
      <div class="project-header">
        <div class="project-name">
          <a href="${repo.html_url}" target="_blank" rel="noopener">${escapeHtml(repo.name)}</a>
        </div>
        ${repo.fork ? '<span class="project-fork-badge">Fork</span>' : ''}
      </div>

      <p class="project-desc">${escapeHtml(repo.description || "Tidak ada deskripsi.")}</p>

      ${topicsHtml ? `<div class="project-topics">${topicsHtml}</div>` : ''}

      <div class="project-meta">
        <span class="meta-item">
          <span class="lang-dot" style="background:${langColor}"></span>
          ${escapeHtml(lang)}
        </span>
        <span class="meta-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          ${repo.stargazers_count || 0}
        </span>
        <span class="meta-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12">
            <circle cx="12" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><path d="M18 9v1a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9"/><line x1="12" y1="12" x2="12" y2="15"/>
          </svg>
          ${repo.forks_count || 0}
        </span>
        <span class="project-updated">${timeAgo(repo.updated_at)}</span>
      </div>

      <div class="project-actions">
        <a href="${repo.html_url}" target="_blank" rel="noopener" class="project-btn">
          <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
          </svg>
          Repository
        </a>
        ${hasDemo ? `
          <a href="${escapeHtml(pagesUrl)}" target="_blank" rel="noopener" class="project-btn demo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
            Live Demo
          </a>
          <button class="project-btn btn-preview" data-url="${escapeHtml(pagesUrl)}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
            </svg>
            Preview
          </button>
        ` : ''}
      </div>
    </div>
  `;
}

// ================================================================
// Render featured projects
// ================================================================
function renderFeaturedProjects(repos) {
  const featured = repos.filter(r => isFeatured(r));
  const grid = document.getElementById("featured-grid");
  const section = document.getElementById("featured");

  if (!grid) return;

  if (featured.length === 0) {
    if (section) section.style.display = "none";
    return;
  }

  grid.innerHTML = featured.slice(0, 6).map(repo => {
    const lang = repo.language || "Other";
    const langColor = siteConfig.langColors[lang] || "#8b949e";
    const pagesUrl = repo.homepage || null;
    const hasDemo = pagesUrl && pagesUrl.startsWith("http");

    return `
      <div class="featured-card animate-on-scroll">
        <span class="featured-badge">★ Featured</span>
        <div class="project-name" style="margin-bottom:12px;font-size:18px;">
          <a href="${repo.html_url}" target="_blank" rel="noopener">${escapeHtml(repo.name)}</a>
        </div>
        <p class="project-desc" style="margin-bottom:16px;">${escapeHtml(repo.description || "Tidak ada deskripsi.")}</p>
        <div class="project-meta" style="margin-bottom:16px;">
          <span class="meta-item">
            <span class="lang-dot" style="background:${langColor}"></span>
            ${escapeHtml(lang)}
          </span>
          <span class="meta-item">★ ${repo.stargazers_count || 0}</span>
        </div>
        <div class="project-actions">
          <a href="${repo.html_url}" target="_blank" rel="noopener" class="btn btn-secondary btn-sm">Repository</a>
          ${hasDemo ? `<a href="${escapeHtml(pagesUrl)}" target="_blank" rel="noopener" class="btn btn-primary btn-sm">Live Demo ↗</a>` : ''}
        </div>
      </div>
    `;
  }).join("");
}

// ================================================================
// Update hitungan project
// ================================================================
function updateProjectCount(shown, total) {
  const el1 = document.getElementById("count-shown");
  const el2 = document.getElementById("count-total");
  if (el1) el1.textContent = shown;
  if (el2) el2.textContent = total;
}

// ================================================================
// Buka modal preview
// ================================================================
function openPreviewModal(url) {
  const modal = document.getElementById("preview-modal");
  const iframe = document.getElementById("preview-iframe");
  const urlEl = document.getElementById("preview-url");
  const openBtn = document.getElementById("preview-open");

  if (!modal || !iframe) return;

  iframe.src = url;
  if (urlEl) urlEl.textContent = url;
  if (openBtn) openBtn.href = url;
  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

// ================================================================
// Sanitasi HTML untuk mencegah XSS
// ================================================================
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ================================================================
// FILE EXPLORER — State & Render
// ================================================================

// Simpan state explorer per repo (mana folder yang sedang terbuka)
const explorerState = {};

// ================================================================
// Buka modal File Explorer untuk satu repository
// ================================================================
async function openFileExplorer(repoName, repoUrl) {
  // Buat atau tampilkan modal explorer
  ensureExplorerModal();

  const modal = document.getElementById("file-explorer-modal");
  const titleEl = document.getElementById("explorer-repo-name");
  const treeEl = document.getElementById("explorer-tree");
  const loadingEl = document.getElementById("explorer-loading");

  // Set judul repo
  if (titleEl) titleEl.textContent = repoName;

  // Tampilkan modal dengan state loading
  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";

  if (treeEl) treeEl.innerHTML = "";
  if (loadingEl) loadingEl.classList.remove("hidden");

  // Inisialisasi state folder terbuka untuk repo ini
  if (!explorerState[repoName]) {
    explorerState[repoName] = new Set([""]); // root selalu terbuka
  }

  // Fetch tree
  const tree = await fetchRepoTree(repoName);

  if (loadingEl) loadingEl.classList.add("hidden");

  if (!tree) {
    if (treeEl) treeEl.innerHTML = `
      <div style="text-align:center;padding:40px;color:var(--text-tertiary);">
        <span style="font-size:32px;">😕</span>
        <p style="margin-top:12px;">Gagal memuat struktur file.<br/>Repository mungkin kosong atau private.</p>
      </div>
    `;
    return;
  }

  // Render tree
  renderExplorerTree(treeEl, tree, repoName, repoUrl);
}

// ================================================================
// Render pohon file secara rekursif
// ================================================================
function renderExplorerTree(container, node, repoName, repoUrl, depth = 0) {
  if (!container) return;

  // Render children dari root, atau node itu sendiri jika bukan root
  const items = depth === 0 ? node.children : [node];

  if (!items || items.length === 0) {
    if (depth === 0) {
      container.innerHTML = `
        <div style="text-align:center;padding:32px;color:var(--text-tertiary);">
          <span>Repositori ini kosong.</span>
        </div>
      `;
    }
    return;
  }

  const ul = document.createElement("ul");
  ul.className = "explorer-list";
  ul.style.paddingLeft = depth === 0 ? "0" : "18px";

  items.forEach(child => {
    const li = document.createElement("li");
    li.className = "explorer-item";

    const iconInfo = getFileIcon(child.name, child.type);
    const isOpen = explorerState[repoName]?.has(child.path);

    if (child.type === "tree") {
      // ── FOLDER ──
      const folderRow = document.createElement("div");
      folderRow.className = `explorer-row explorer-folder ${isOpen ? "open" : ""}`;
      folderRow.dataset.path = child.path;
      folderRow.innerHTML = `
        <span class="explorer-arrow">${isOpen ? "▾" : "▸"}</span>
        <span class="explorer-icon">${isOpen ? iconInfo.iconOpen : iconInfo.icon}</span>
        <span class="explorer-name" style="color:${iconInfo.color}">${escapeHtml(child.name)}</span>
        <span class="explorer-badge">${countFiles(child)}</span>
      `;

      const subContainer = document.createElement("div");
      subContainer.className = "explorer-sub";
      subContainer.style.display = isOpen ? "block" : "none";

      folderRow.addEventListener("click", () => {
        const nowOpen = explorerState[repoName]?.has(child.path);
        if (nowOpen) {
          explorerState[repoName].delete(child.path);
          folderRow.classList.remove("open");
          folderRow.querySelector(".explorer-arrow").textContent = "▸";
          folderRow.querySelector(".explorer-icon").textContent = iconInfo.icon;
          subContainer.style.display = "none";
        } else {
          explorerState[repoName] = explorerState[repoName] || new Set();
          explorerState[repoName].add(child.path);
          folderRow.classList.add("open");
          folderRow.querySelector(".explorer-arrow").textContent = "▾";
          folderRow.querySelector(".explorer-icon").textContent = iconInfo.iconOpen;
          subContainer.style.display = "block";

          // Render children jika belum ada
          if (!subContainer.hasChildNodes()) {
            child.children.forEach(grandchild => {
              renderExplorerTree(subContainer, grandchild, repoName, repoUrl, depth + 1);
            });
          }
        }
      });

      // Render isi folder jika sudah terbuka sebelumnya
      if (isOpen) {
        child.children.forEach(grandchild => {
          renderExplorerTree(subContainer, grandchild, repoName, repoUrl, depth + 1);
        });
      }

      li.appendChild(folderRow);
      li.appendChild(subContainer);

    } else {
      // ── FILE ──
      const fileRow = document.createElement("div");
      fileRow.className = "explorer-row explorer-file";

      // Tentukan URL tujuan klik
      const targetUrl = child.isWebFile ? child.liveUrl : child.githubUrl;
      const isLive = child.isWebFile;

      fileRow.innerHTML = `
        <span class="explorer-arrow" style="opacity:0;">▸</span>
        <span class="explorer-icon">${iconInfo.icon}</span>
        <a 
          href="${escapeHtml(targetUrl)}" 
          target="_blank" 
          rel="noopener"
          class="explorer-name explorer-file-link ${isLive ? "explorer-live-link" : ""}"
          style="color:${iconInfo.color}"
          title="${isLive ? '🌐 Buka Live Preview di GitHub Pages' : '📄 Lihat kode di GitHub'}"
        >${escapeHtml(child.name)}</a>
        ${isLive ? '<span class="explorer-live-badge">LIVE</span>' : ''}
        ${child.size > 0 ? `<span class="explorer-size">${formatFileSize(child.size)}</span>` : ''}
      `;

      li.appendChild(fileRow);
    }

    ul.appendChild(li);
  });

  container.appendChild(ul);
}

// ================================================================
// Hitung total file di dalam satu folder (rekursif)
// ================================================================
function countFiles(node) {
  if (!node.children) return 0;
  let count = 0;
  node.children.forEach(child => {
    if (child.type === "blob") count++;
    else count += countFiles(child);
  });
  return count;
}

// ================================================================
// Format ukuran file (bytes → KB/MB)
// ================================================================
function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

// ================================================================
// Buat modal File Explorer jika belum ada di DOM
// ================================================================
function ensureExplorerModal() {
  if (document.getElementById("file-explorer-modal")) return;

  const modal = document.createElement("div");
  modal.id = "file-explorer-modal";
  modal.className = "file-explorer-modal hidden";

  modal.innerHTML = `
    <div class="explorer-overlay"></div>
    <div class="explorer-container">
      
      <!-- Header -->
      <div class="explorer-header">
        <div class="explorer-header-left">
          <div class="explorer-dots">
            <span class="dot dot-red"></span>
            <span class="dot dot-yellow"></span>
            <span class="dot dot-green"></span>
          </div>
          <span class="explorer-title-icon">📁</span>
          <span id="explorer-repo-name" class="explorer-title">repository</span>
        </div>
        <div class="explorer-header-right">
          <span class="explorer-subtitle">File Explorer</span>
          <button class="explorer-close-btn" id="explorer-close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Breadcrumb / Path Bar -->
      <div class="explorer-path-bar">
        <span class="path-segment">~</span>
        <span class="path-sep">/</span>
        <span class="path-segment" id="explorer-path-repo">...</span>
      </div>

      <!-- Konten Tree -->
      <div class="explorer-body">
        <!-- Loading -->
        <div id="explorer-loading" class="explorer-loading">
          <div class="explorer-spinner"></div>
          <span>Memuat struktur file...</span>
        </div>

        <!-- Tree -->
        <div id="explorer-tree" class="explorer-tree"></div>
      </div>

      <!-- Footer -->
      <div class="explorer-footer">
        <span id="explorer-file-count" class="explorer-footer-info">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          Memuat...
        </span>
        <span class="explorer-footer-tip">
          <span class="explorer-live-badge" style="font-size:10px;">LIVE</span>
          = Langsung ke GitHub Pages
        </span>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Event: tutup modal
  document.getElementById("explorer-close")?.addEventListener("click", closeFileExplorer);
  modal.querySelector(".explorer-overlay")?.addEventListener("click", closeFileExplorer);

  // Event: ESC
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.classList.contains("hidden")) {
      closeFileExplorer();
    }
  });
}

// ================================================================
// Tutup modal File Explorer
// ================================================================
function closeFileExplorer() {
  const modal = document.getElementById("file-explorer-modal");
  if (modal) {
    modal.classList.add("hidden");
    document.body.style.overflow = "";
  }
}

// ================================================================
// Tambahkan tombol "File Explorer" ke setiap kartu project
// ================================================================
// Panggil fungsi ini SETELAH renderProjects() selesai
function attachFileExplorerButtons() {
  const grid = document.getElementById("projects-grid");
  if (!grid) return;

  // Cari semua kartu yang belum punya tombol explorer
  grid.querySelectorAll(".project-card:not([data-explorer-attached])").forEach(card => {
    const actionsEl = card.querySelector(".project-actions");
    if (!actionsEl) return;

    // Ambil nama repo dari link GitHub yang ada
    const repoLink = card.querySelector(".project-name a");
    if (!repoLink) return;

    const href = repoLink.getAttribute("href") || "";
    // Format: https://github.com/username/reponame
    const parts = href.split("/");
    const repoName = parts[parts.length - 1];
    if (!repoName) return;

    // Buat tombol explorer
    const explorerBtn = document.createElement("button");
    explorerBtn.className = "project-btn explorer-trigger-btn";
    explorerBtn.title = "Jelajahi file repository ini";
    explorerBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
      </svg>
      Files
    `;

    explorerBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      // Perbarui path bar saat buka
      const pathEl = document.getElementById("explorer-path-repo");
      if (pathEl) pathEl.textContent = repoName;
      openFileExplorer(repoName, href);
    });

    actionsEl.appendChild(explorerBtn);
    card.setAttribute("data-explorer-attached", "true");
  });
}

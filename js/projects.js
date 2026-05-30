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

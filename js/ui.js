// ================================================================
// UI.JS — Orkestrasi utama: render semua komponen
// ================================================================

// ================================================================
// Entry Point — Dipanggil saat DOM siap
// ================================================================
document.addEventListener("DOMContentLoaded", async () => {
  // Inisialisasi tema dari localStorage
  initTheme();

  // Inisialisasi terminal
  initTerminal();

  // Inisialisasi command palette
  initCommandPalette();

  // Inisialisasi event listener UI
  initEventListeners();

  // Inisialisasi visitor counter
  initVisitorCounter();

  // Ambil data GitHub
  const data = await fetchAllGitHubData();

  if (data && data.user) {
    // Render semua komponen
    renderHero(data.user);
    renderAbout(data.user);
    renderStats(data.user, data.totalStars, data.totalForks);
    renderFeaturedProjects(data.repos);
    initProjects(data.repos);
    renderTimeline(data.repos);
    renderContact(data.user);
    updateSEO(data.user);

    // Ambil bahasa secara async (bisa lambat)
    computeLanguages(data.repos).then(langs => {
      githubData.languages = langs;
      renderSkills(langs);
    });

    // Ambil README profil
    fetchProfileReadme().then(html => {
      renderReadme(html);
    });

    // Kontribusi heatmap (dari GitHub Image)
    renderContributionGraph();
  }

  // Sembunyikan loading screen
  hideLoading();

  // Inisialisasi IntersectionObserver untuk animasi scroll
  initScrollAnimations();
});

// ================================================================
// Render Hero Section
// ================================================================
function renderHero(user) {
  // Avatar
  setAttr("hero-avatar", "src", user.avatar_url);
  setAttr("hero-avatar", "alt", user.name || user.login);
  setAttr("nav-avatar", "src", user.avatar_url);
  document.getElementById("hero-avatar")?.classList.remove("skeleton");

  // Nama & Bio
  setText("hero-name", user.name || user.login);
  setText("nav-username", user.login);
  setText("hero-bio", user.bio || "Developer yang bersemangat membangun hal-hal bermanfaat.");
  document.getElementById("hero-bio")?.classList.remove("skeleton-text");
  document.getElementById("hero-name")?.classList.remove("skeleton-text");

  // Lokasi
  setText("hero-location", user.location || "Di mana saja");

  // Statistik
  setText("stat-repos", formatNumber(user.public_repos));
  setText("stat-followers", formatNumber(user.followers));
  setText("stat-following", formatNumber(user.following));

  // Tombol
  const btnGH = document.getElementById("btn-github");
  if (btnGH) btnGH.href = user.html_url;

  const btnCV = document.getElementById("btn-cv");
  if (btnCV) btnCV.href = siteConfig.cvUrl;

  // Favicon dari avatar GitHub
  const favicon = document.getElementById("favicon");
  if (favicon) favicon.href = user.avatar_url;

  // Typing effect
  startTypingEffect([
    "Full Stack Developer",
    "UI/UX Enthusiast",
    "Open Source Contributor",
    user.company ? `@${user.company}` : "Problem Solver",
  ]);
}

// ================================================================
// Typing Effect
// ================================================================
function startTypingEffect(phrases) {
  const el = document.getElementById("typing-text");
  if (!el) return;

  let phraseIdx = 0;
  let charIdx = 0;
  let isDeleting = false;
  let timeout = null;

  function type() {
    const current = phrases[phraseIdx % phrases.length];

    if (!isDeleting) {
      el.textContent = current.substring(0, charIdx + 1);
      charIdx++;
      if (charIdx === current.length) {
        isDeleting = true;
        timeout = setTimeout(type, 1800);
        return;
      }
    } else {
      el.textContent = current.substring(0, charIdx - 1);
      charIdx--;
      if (charIdx === 0) {
        isDeleting = false;
        phraseIdx++;
      }
    }

    timeout = setTimeout(type, isDeleting ? 60 : 90);
  }

  type();
}

// ================================================================
// Render About Section
// ================================================================
function renderAbout(user) {
  const info = document.getElementById("about-info");
  if (!info) return;

  const items = [
    user.name && { icon: userIcon(), text: user.name },
    user.login && { icon: atIcon(), text: `@${user.login}` },
    user.location && { icon: locationIcon(), text: user.location },
    user.company && { icon: companyIcon(), text: user.company },
    user.blog && { icon: linkIcon(), text: user.blog, href: user.blog },
    user.email && { icon: emailIcon(), text: user.email, href: `mailto:${user.email}` },
  ].filter(Boolean);

  info.innerHTML = items.map(item => `
    <div class="about-info-item">
      ${item.icon}
      ${item.href
        ? `<a href="${escapeHtml(item.href)}" target="_blank" rel="noopener">${escapeHtml(item.text)}</a>`
        : `<span>${escapeHtml(item.text)}</span>`
      }
    </div>
  `).join("");
}

// ================================================================
// Render README Profil
// ================================================================
function renderReadme(html) {
  const el = document.getElementById("about-readme");
  if (!el) return;

  if (html) {
    el.innerHTML = html;
  } else {
    el.innerHTML = `<p class="about-placeholder" style="color:var(--text-tertiary);">Buat repository <strong>${githubUsername}/${githubUsername}</strong> dengan README untuk menampilkan informasi profil di sini.</p>`;
  }
}

// ================================================================
// Render Statistik
// ================================================================
function renderStats(user, stars, forks) {
  animateCounter("count-repos", user.public_repos);
  animateCounter("count-stars", stars);
  animateCounter("count-forks", forks);
  animateCounter("count-followers", user.followers);
}

// ================================================================
// Counter Animasi
// ================================================================
function animateCounter(id, target) {
  const el = document.getElementById(id);
  if (!el) return;

  el.dataset.target = target;
  let current = 0;
  const increment = Math.ceil(target / 60);
  const step = () => {
    current = Math.min(current + increment, target);
    el.textContent = formatNumber(current);
    if (current < target) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// ================================================================
// Render Contribution Graph
// ================================================================
function renderContributionGraph() {
  const container = document.getElementById("contribution-graph");
  if (!container) return;

  // Gunakan GitHub Chart API (gambar kontribusi)
  container.innerHTML = `
    <img 
      src="https://ghchart.rshah.org/${escapeHtml(githubUsername)}" 
      alt="GitHub Contribution Graph"
      style="width:100%;max-width:800px;display:block;margin:0 auto;filter:hue-rotate(200deg);"
      loading="lazy"
      onerror="this.parentElement.innerHTML='<p style=\'color:var(--text-tertiary);text-align:center;padding:20px;\'>Grafik kontribusi tidak tersedia.</p>'"
    />
  `;
}

// ================================================================
// Render Skills
// ================================================================
function renderSkills(langs) {
  const wrapper = document.getElementById("skills-wrapper");
  if (!wrapper) return;

  const total = Object.values(langs).reduce((a, b) => a + b, 0);
  if (total === 0) {
    wrapper.innerHTML = "<p style='color:var(--text-tertiary);text-align:center;'>Tidak ada data bahasa ditemukan.</p>";
    return;
  }

  const sorted = Object.entries(langs)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  wrapper.innerHTML = sorted.map(([lang, bytes], i) => {
    const pct = Math.round((bytes / total) * 100);
    const color = siteConfig.langColors[lang] || "#8b949e";
    return `
      <div class="skill-item animate-on-scroll" style="animation-delay:${i * 0.08}s">
        <div class="skill-header">
          <span class="skill-name">
            <span class="skill-dot" style="background:${color}"></span>
            ${escapeHtml(lang)}
          </span>
          <span class="skill-percent">${pct}%</span>
        </div>
        <div class="skill-bar-bg">
          <div class="skill-bar-fill" style="background:${color}" data-width="${pct}"></div>
        </div>
      </div>
    `;
  }).join("");

  // Animasi bar setelah render
  setTimeout(() => {
    wrapper.querySelectorAll(".skill-bar-fill").forEach(bar => {
      bar.style.width = bar.dataset.width + "%";
    });
  }, 200);
}

// ================================================================
// Render Timeline
// ================================================================
function renderTimeline(repos) {
  const list = document.getElementById("timeline-list");
  if (!list) return;

  const events = repos
    .filter(r => !r.fork)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 12)
    .map(repo => ({
      date: new Date(repo.created_at).toLocaleDateString("id-ID", { year: "numeric", month: "long" }),
      title: repo.name,
      desc: repo.description || "Repository baru dibuat",
      url: repo.html_url,
    }));

  if (!events.length) {
    list.innerHTML = "<p style='color:var(--text-tertiary);text-align:center;'>Belum ada riwayat repository.</p>";
    return;
  }

  list.innerHTML = events.map((ev, i) => `
    <div class="timeline-item animate-on-scroll" style="animation-delay:${i * 0.05}s">
      <div class="timeline-dot"></div>
      <div class="timeline-date">${ev.date}</div>
      <div class="timeline-title">
        <a href="${escapeHtml(ev.url)}" target="_blank" rel="noopener">${escapeHtml(ev.title)}</a>
      </div>
      <div class="timeline-desc">${escapeHtml(ev.desc)}</div>
    </div>
  `).join("");
}

// ================================================================
// Render Contact
// ================================================================
function renderContact(user) {
  const links = document.getElementById("contact-links");
  if (!links) return;

  const items = [
    {
      icon: githubIcon(),
      label: "GitHub",
      value: `@${user.login}`,
      href: user.html_url,
    },
    user.blog && {
      icon: webIcon(),
      label: "Website",
      value: user.blog,
      href: user.blog.startsWith("http") ? user.blog : `https://${user.blog}`,
    },
    (user.email || siteConfig.email) && {
      icon: emailIcon(),
      label: "Email",
      value: user.email || siteConfig.email,
      href: `mailto:${user.email || siteConfig.email}`,
    },
    user.twitter_username && {
      icon: twitterIcon(),
      label: "Twitter",
      value: `@${user.twitter_username}`,
      href: `https://twitter.com/${user.twitter_username}`,
    },
  ].filter(Boolean);

  links.innerHTML = items.map(item => `
    <a href="${escapeHtml(item.href)}" target="_blank" rel="noopener" class="contact-link-item">
      ${item.icon}
      <div>
        <div style="font-size:12px;color:var(--text-tertiary);">${item.label}</div>
        <div style="font-weight:500;">${escapeHtml(item.value)}</div>
      </div>
    </a>
  `).join("");

  // Form kontak
  const submitBtn = document.getElementById("form-submit");
  if (submitBtn) {
    submitBtn.addEventListener("click", () => {
      const name = document.getElementById("form-name")?.value || "";
      const email = document.getElementById("form-email")?.value || "";
      const message = document.getElementById("form-message")?.value || "";
      const to = user.email || siteConfig.email || "";

      if (!name || !email || !message) {
        alert("Harap isi semua kolom terlebih dahulu.");
        return;
      }

      const subject = encodeURIComponent(`Portfolio Contact dari ${name}`);
      const body = encodeURIComponent(`Dari: ${name}\nEmail: ${email}\n\n${message}`);
      window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
    });
  }
}

// ================================================================
// Update SEO Meta Tags
// ================================================================
function updateSEO(user) {
  const name = user.name || user.login;
  const bio = user.bio || `Portfolio developer GitHub @${user.login}`;
  const avatar = user.avatar_url;

  document.title = `${name} — Portfolio Developer`;

  const metas = {
    "description": bio,
    "og:title": `${name} — Portfolio Developer`,
    "og:description": bio,
    "og:image": avatar,
    "og:url": window.location.href,
    "twitter:title": `${name} — Portfolio Developer`,
    "twitter:description": bio,
    "twitter:image": avatar,
  };

  Object.entries(metas).forEach(([key, value]) => {
    let el = document.querySelector(`meta[name="${key}"]`) || document.querySelector(`meta[property="${key}"]`);
    if (!el) {
      el = document.createElement("meta");
      if (key.startsWith("og:")) el.setAttribute("property", key);
      else el.setAttribute("name", key);
      document.head.appendChild(el);
    }
    el.setAttribute("content", value);
  });
}

// ================================================================
// Visitor Counter (localStorage sederhana)
// ================================================================
function initVisitorCounter() {
  const key = `visit_${githubUsername}`;
  let count = parseInt(localStorage.getItem(key) || "0") + 1;
  localStorage.setItem(key, count);
  const el = document.getElementById("visitor-count");
  if (el) el.textContent = formatNumber(count);
}

// ================================================================
// Theme Toggle
// ================================================================
function initTheme() {
  const saved = localStorage.getItem("portfolio-theme") || "dark";
  document.documentElement.setAttribute("data-theme", saved);
  updateThemeIcons(saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("portfolio-theme", next);
  updateThemeIcons(next);
}

function updateThemeIcons(theme) {
  const moon = document.querySelector(".icon-moon");
  const sun = document.querySelector(".icon-sun");
  if (!moon || !sun) return;
  if (theme === "dark") {
    moon.classList.remove("hidden");
    sun.classList.add("hidden");
  } else {
    moon.classList.add("hidden");
    sun.classList.remove("hidden");
  }
}

// ================================================================
// Command Palette
// ================================================================
function initCommandPalette() {
  const commands = [
    { label: "🏠 Beranda", action: () => scrollTo("#hero") },
    { label: "👤 Tentang", action: () => scrollTo("#about") },
    { label: "⚡ Skill", action: () => scrollTo("#skills") },
    { label: "📁 Project", action: () => scrollTo("#projects") },
    { label: "✉️ Kontak", action: () => scrollTo("#contact") },
    { label: "🌙 Toggle Dark/Light Mode", action: toggleTheme },
    { label: "💻 Buka Terminal", action: openTerminal },
    { label: "🐙 Buka GitHub", action: () => window.open(`https://github.com/${githubUsername}`, "_blank") },
  ];

  const input = document.getElementById("command-input");
  const list = document.getElementById("command-list");
  const overlay = document.querySelector(".command-overlay");

  function renderCommands(query = "") {
    const filtered = commands.filter(c =>
      c.label.toLowerCase().includes(query.toLowerCase())
    );
    if (!list) return;
    list.innerHTML = filtered.map((cmd, i) => `
      <div class="command-item" data-index="${i}">
        <div class="command-item-icon">→</div>
        ${escapeHtml(cmd.label)}
      </div>
    `).join("");

    list.querySelectorAll(".command-item").forEach((el, i) => {
      el.addEventListener("click", () => {
        filtered[i].action();
        closeCommandPalette();
      });
    });
  }

  if (input) {
    input.addEventListener("input", () => renderCommands(input.value));
  }

  if (overlay) {
    overlay.addEventListener("click", closeCommandPalette);
  }

  renderCommands();
}

function openCommandPalette() {
  const el = document.getElementById("command-palette");
  const input = document.getElementById("command-input");
  if (!el) return;
  el.classList.remove("hidden");
  setTimeout(() => input?.focus(), 50);
}

function closeCommandPalette() {
  const el = document.getElementById("command-palette");
  if (!el) return;
  el.classList.add("hidden");
  const input = document.getElementById("command-input");
  if (input) input.value = "";
}

// ================================================================
// Animasi Scroll
// ================================================================
function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll(".animate-on-scroll").forEach(el => {
    observer.observe(el);
  });
}

// ================================================================
// Semua Event Listener
// ================================================================
function initEventListeners() {
  // Theme toggle
  document.getElementById("theme-toggle")?.addEventListener("click", toggleTheme);

  // Command Palette
  document.getElementById("cmd-trigger")?.addEventListener("click", openCommandPalette);
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "k") {
      e.preventDefault();
      openCommandPalette();
    }
    if (e.key === "Escape") {
      closeCommandPalette();
      closeTerminal();
      const prevModal = document.getElementById("preview-modal");
      if (prevModal) {
        prevModal.classList.add("hidden");
        document.body.style.overflow = "";
      }
    }
  });

  // Mobile hamburger
  document.getElementById("hamburger")?.addEventListener("click", () => {
    const menu = document.getElementById("mobile-menu");
    menu?.classList.toggle("hidden");
  });

  // Tutup mobile menu saat link diklik
  document.querySelectorAll(".mobile-link").forEach(link => {
    link.addEventListener("click", () => {
      document.getElementById("mobile-menu")?.classList.add("hidden");
    });
  });

  // Navbar scroll style
  window.addEventListener("scroll", () => {
    const navbar = document.getElementById("navbar");
    if (navbar) navbar.classList.toggle("scrolled", window.scrollY > 20);
    updateBottomNav();
  });

  // Filter project
  document.getElementById("filter-group")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".filter-btn");
    if (!btn) return;
    document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    applyFiltersAndSort();
  });

  // Sort project
  document.getElementById("sort-select")?.addEventListener("change", (e) => {
    currentSort = e.target.value;
    applyFiltersAndSort();
  });

  // Pencarian project
  const searchInput = document.getElementById("project-search");
  const clearBtn = document.getElementById("search-clear");

  searchInput?.addEventListener("input", (e) => {
    currentSearch = e.target.value;
    clearBtn?.classList.toggle("hidden", !currentSearch);
    applyFiltersAndSort();
  });

  clearBtn?.addEventListener("click", () => {
    if (searchInput) searchInput.value = "";
    currentSearch = "";
    clearBtn.classList.add("hidden");
    applyFiltersAndSort();
  });

  // Deteksi ketik /terminal
  searchInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && searchInput.value.trim() === "/terminal") {
      searchInput.value = "";
      currentSearch = "";
      applyFiltersAndSort();
      openTerminal();
    }
  });

  // Preview modal tutup
  document.getElementById("preview-close")?.addEventListener("click", () => {
    document.getElementById("preview-modal")?.classList.add("hidden");
    const iframe = document.getElementById("preview-iframe");
    if (iframe) iframe.src = "";
    document.body.style.overflow = "";
  });

  document.querySelector(".preview-overlay")?.addEventListener("click", () => {
    document.getElementById("preview-modal")?.classList.add("hidden");
    const iframe = document.getElementById("preview-iframe");
    if (iframe) iframe.src = "";
    document.body.style.overflow = "";
  });

  // Bottom nav active state
  updateBottomNav();
}

// ================================================================
// Sembunyikan Loading Screen
// ================================================================
function hideLoading() {
  const screen = document.getElementById("loading-screen");
  if (!screen) return;
  setTimeout(() => {
    screen.classList.add("fade-out");
    setTimeout(() => screen.remove(), 500);
  }, 800);
}

// ================================================================
// Update Bottom Nav Active State
// ================================================================
function updateBottomNav() {
  const sections = ["hero", "skills", "projects", "contact"];
  const navItems = document.querySelectorAll(".bottom-nav-item");

  let current = "hero";
  sections.forEach(id => {
    const el = document.getElementById(id);
    if (el && window.scrollY >= el.offsetTop - 100) current = id;
  });

  navItems.forEach(item => {
    const href = item.getAttribute("href")?.replace("#", "");
    item.classList.toggle("active", href === current);
  });
}

// ================================================================
// Utility Functions
// ================================================================
function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function setAttr(id, attr, value) {
  const el = document.getElementById(id);
  if (el) el.setAttribute(attr, value);
}

function scrollTo(selector) {
  const el = document.querySelector(selector);
  if (el) el.scrollIntoView({ behavior: "smooth" });
}

// ================================================================
// ICON SVG (inline, agar ringan tanpa library)
// ================================================================
function userIcon() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`; }
function atIcon() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"/></svg>`; }
function locationIcon() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`; }
function companyIcon() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`; }
function linkIcon() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`; }
function emailIcon() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`; }
function githubIcon() { return `<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>`; }
function webIcon() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`; }
function twitterIcon() { return `<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`; }

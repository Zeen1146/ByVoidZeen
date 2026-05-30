// ================================================================
// GITHUB.JS — Mengambil seluruh data dari GitHub API
// Tidak ada backend, murni client-side
// ================================================================

const GH_API = "https://api.github.com";
let githubData = {
  user: null,
  repos: [],
  languages: {},
  totalStars: 0,
  totalForks: 0,
};

// ================================================================
// Fungsi utama: Ambil semua data GitHub
// ================================================================
async function fetchAllGitHubData() {
  try {
    // Ambil data profil pengguna
    const user = await fetchUser();
    if (!user) throw new Error("User tidak ditemukan");
    githubData.user = user;

    // Ambil semua repository
    const repos = await fetchAllRepos();
    githubData.repos = repos;

    // Hitung statistik
    computeStats(repos);

    return githubData;
  } catch (err) {
    console.error("Gagal mengambil data GitHub:", err);
    showError("Gagal mengambil data dari GitHub. Cek username di config.js");
    return null;
  }
}

// ================================================================
// Ambil profil pengguna
// ================================================================
async function fetchUser() {
  const res = await fetch(`${GH_API}/users/${githubUsername}`, {
    headers: { Accept: "application/vnd.github.v3+json" }
  });
  if (!res.ok) return null;
  return res.json();
}

// ================================================================
// Ambil semua repository (handle pagination)
// ================================================================
async function fetchAllRepos() {
  let repos = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const res = await fetch(
      `${GH_API}/users/${githubUsername}/repos?per_page=${perPage}&page=${page}&sort=updated`,
      { headers: { Accept: "application/vnd.github.v3+json" } }
    );
    if (!res.ok) break;
    const data = await res.json();
    repos = repos.concat(data);
    if (data.length < perPage) break;
    page++;
    if (page > 10) break; // Batas maksimal 1000 repo
  }

  return repos;
}

// ================================================================
// Ambil bahasa repository tertentu
// ================================================================
async function fetchRepoLanguages(repoName) {
  try {
    const res = await fetch(
      `${GH_API}/repos/${githubUsername}/${repoName}/languages`,
      { headers: { Accept: "application/vnd.github.v3+json" } }
    );
    if (!res.ok) return {};
    return res.json();
  } catch {
    return {};
  }
}

// ================================================================
// Hitung total bahasa dari semua repo
// ================================================================
async function computeLanguages(repos) {
  const langMap = {};
  const topRepos = repos.filter(r => !r.fork).slice(0, 30);

  const promises = topRepos.map(async (repo) => {
    const langs = await fetchRepoLanguages(repo.name);
    for (const [lang, bytes] of Object.entries(langs)) {
      langMap[lang] = (langMap[lang] || 0) + bytes;
    }
  });

  await Promise.allSettled(promises);
  return langMap;
}

// ================================================================
// Hitung total stars dan forks
// ================================================================
function computeStats(repos) {
  let totalStars = 0;
  let totalForks = 0;

  repos.forEach(repo => {
    if (!repo.fork) {
      totalStars += repo.stargazers_count || 0;
      totalForks += repo.forks_count || 0;
    }
  });

  githubData.totalStars = totalStars;
  githubData.totalForks = totalForks;
}

// ================================================================
// Ambil README dari repo profil (username/username)
// ================================================================
async function fetchProfileReadme() {
  try {
    const res = await fetch(
      `${GH_API}/repos/${githubUsername}/${githubUsername}/readme`,
      {
        headers: {
          Accept: "application/vnd.github.v3.html",
        }
      }
    );
    if (!res.ok) return null;
    return res.text();
  } catch {
    return null;
  }
}

// ================================================================
// Deteksi apakah repository punya GitHub Pages
// ================================================================
async function hasGitHubPages(repoName) {
  try {
    const res = await fetch(
      `${GH_API}/repos/${githubUsername}/${repoName}/pages`,
      { headers: { Accept: "application/vnd.github.v3+json" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.html_url || null;
  } catch {
    return null;
  }
}

// ================================================================
// Format waktu relatif (misalnya: "3 hari lalu")
// ================================================================
function timeAgo(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);

  const units = [
    { label: "tahun", secs: 31536000 },
    { label: "bulan", secs: 2592000 },
    { label: "minggu", secs: 604800 },
    { label: "hari", secs: 86400 },
    { label: "jam", secs: 3600 },
    { label: "menit", secs: 60 },
  ];

  for (const { label, secs } of units) {
    const count = Math.floor(diff / secs);
    if (count >= 1) return `${count} ${label} lalu`;
  }
  return "baru saja";
}

// ================================================================
// Format angka (misalnya: 1200 → 1.2k)
// ================================================================
function formatNumber(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return n.toString();
}

// ================================================================
// Tampilkan pesan error
// ================================================================
function showError(msg) {
  const body = document.body;
  const el = document.createElement("div");
  el.style.cssText = `
    position: fixed; top: 80px; left: 50%; transform: translateX(-50%);
    background: #ef4444; color: white; padding: 12px 24px;
    border-radius: 8px; z-index: 9999; font-size: 14px;
    box-shadow: 0 4px 24px rgba(239,68,68,0.4);
  `;
  el.textContent = msg;
  body.appendChild(el);
  setTimeout(() => el.remove(), 5000);
}

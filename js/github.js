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

// ================================================================
// FILE EXPLORER — Ambil struktur file dari setiap repository
// ================================================================

// Cache agar tidak fetch berulang kali untuk repo yang sama
const repoTreeCache = {};

// ================================================================
// Ambil file tree dari satu repository (recursive)
// ================================================================
async function fetchRepoTree(repoName) {
  // Cek cache dulu
  if (repoTreeCache[repoName]) return repoTreeCache[repoName];

  try {
    // Ambil branch default dulu
    const repoRes = await fetch(
      `${GH_API}/repos/${githubUsername}/${repoName}`,
      { headers: { Accept: "application/vnd.github.v3+json" } }
    );
    if (!repoRes.ok) return null;
    const repoInfo = await repoRes.json();
    const branch = repoInfo.default_branch || "main";

    // Ambil seluruh tree secara rekursif
    const treeRes = await fetch(
      `${GH_API}/repos/${githubUsername}/${repoName}/git/trees/${branch}?recursive=1`,
      { headers: { Accept: "application/vnd.github.v3+json" } }
    );
    if (!treeRes.ok) return null;
    const treeData = await treeRes.json();

    // Susun flat list menjadi struktur folder bersarang
    const structured = buildTreeStructure(treeData.tree || [], repoName, branch);

    repoTreeCache[repoName] = structured;
    return structured;
  } catch (err) {
    console.error(`Gagal fetch tree repo ${repoName}:`, err);
    return null;
  }
}

// ================================================================
// Ubah flat list dari GitHub API menjadi struktur pohon bersarang
// ================================================================
function buildTreeStructure(flatItems, repoName, branch) {
  const root = { name: repoName, type: "tree", children: [], path: "" };

  // Ekstensi yang dianggap sebagai file web (akan dapat live link)
  const webExts = [".html", ".htm", ".svg"];

  flatItems.forEach(item => {
    const parts = item.path.split("/");
    let current = root;

    parts.forEach((part, idx) => {
      const isLast = idx === parts.length - 1;
      const currentPath = parts.slice(0, idx + 1).join("/");

      if (isLast && item.type === "blob") {
        // Ini adalah file
        const ext = part.includes(".") ? "." + part.split(".").pop().toLowerCase() : "";
        const isWebFile = webExts.includes(ext);

        // Buat URL live GitHub Pages jika file web
        const liveUrl = isWebFile
          ? `https://${githubUsername}.github.io/${repoName}/${item.path}`
          : null;

        // URL raw/blob GitHub biasa
        const githubUrl = `https://github.com/${githubUsername}/${repoName}/blob/${branch}/${item.path}`;

        current.children.push({
          name: part,
          type: "blob",
          path: currentPath,
          ext,
          isWebFile,
          liveUrl,
          githubUrl,
          size: item.size || 0,
        });
      } else {
        // Ini adalah folder — cari atau buat node
        let folder = current.children.find(c => c.name === part && c.type === "tree");
        if (!folder) {
          folder = { name: part, type: "tree", children: [], path: currentPath };
          current.children.push(folder);
        }
        current = folder;
      }
    });
  });

  // Urutkan: folder dulu, lalu file, keduanya secara alfabet
  sortTreeNodes(root);
  return root;
}

// ================================================================
// Urutkan node: folder dulu → file, masing-masing alfabet
// ================================================================
function sortTreeNodes(node) {
  if (!node.children) return;
  node.children.sort((a, b) => {
    if (a.type === b.type) return a.name.localeCompare(b.name);
    return a.type === "tree" ? -1 : 1;
  });
  node.children.forEach(child => {
    if (child.type === "tree") sortTreeNodes(child);
  });
}

// ================================================================
// Deteksi ikon berdasarkan ekstensi / nama file
// ================================================================
function getFileIcon(name, type) {
  if (type === "tree") return { icon: "📁", iconOpen: "📂", color: "#e2b96f" };

  const n = name.toLowerCase();
  const ext = n.includes(".") ? "." + n.split(".").pop() : "";

  const map = {
    ".html": { icon: "🌐", color: "#e34c26" },
    ".htm":  { icon: "🌐", color: "#e34c26" },
    ".css":  { icon: "🎨", color: "#563d7c" },
    ".js":   { icon: "⚡", color: "#f7df1e" },
    ".ts":   { icon: "💙", color: "#3178c6" },
    ".jsx":  { icon: "⚛️", color: "#61dafb" },
    ".tsx":  { icon: "⚛️", color: "#61dafb" },
    ".py":   { icon: "🐍", color: "#3572A5" },
    ".go":   { icon: "🐹", color: "#00ADD8" },
    ".rs":   { icon: "🦀", color: "#dea584" },
    ".java": { icon: "☕", color: "#b07219" },
    ".kt":   { icon: "🟣", color: "#A97BFF" },
    ".dart": { icon: "🎯", color: "#00B4AB" },
    ".php":  { icon: "🐘", color: "#4F5D95" },
    ".rb":   { icon: "💎", color: "#701516" },
    ".sh":   { icon: "⚙️", color: "#89e051" },
    ".md":   { icon: "📝", color: "#a1a1aa" },
    ".json": { icon: "📦", color: "#eab308" },
    ".xml":  { icon: "📄", color: "#ff6600" },
    ".yml":  { icon: "⚙️", color: "#6daedb" },
    ".yaml": { icon: "⚙️", color: "#6daedb" },
    ".svg":  { icon: "🖼️", color: "#ffb13b" },
    ".png":  { icon: "🖼️", color: "#22c55e" },
    ".jpg":  { icon: "🖼️", color: "#22c55e" },
    ".jpeg": { icon: "🖼️", color: "#22c55e" },
    ".gif":  { icon: "🖼️", color: "#22c55e" },
    ".webp": { icon: "🖼️", color: "#22c55e" },
    ".pdf":  { icon: "📕", color: "#ef4444" },
    ".zip":  { icon: "🗜️", color: "#a1a1aa" },
    ".env":  { icon: "🔒", color: "#ef4444" },
    ".gitignore": { icon: "👁️", color: "#a1a1aa" },
  };

  // Nama file khusus (tanpa ekstensi)
  const specialNames = {
    "readme":      { icon: "📖", color: "#a1a1aa" },
    "license":     { icon: "⚖️", color: "#a1a1aa" },
    "dockerfile":  { icon: "🐳", color: "#0db7ed" },
    "makefile":    { icon: "🔨", color: "#a1a1aa" },
    "package.json":{ icon: "📦", color: "#eab308" },
  };

  const specialMatch = specialNames[n] || specialNames[n.split(".")[0]];
  if (specialMatch) return specialMatch;

  return map[ext] || { icon: "📄", color: "#71717a" };
}

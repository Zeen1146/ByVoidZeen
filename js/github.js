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

// Cache file tree agar tidak fetch berulang
const repoTreeCache = {};

// ================================================================
// Fungsi utama: Ambil semua data GitHub
// ================================================================
async function fetchAllGitHubData() {
  try {
    const user = await fetchUser();
    if (!user) throw new Error("User tidak ditemukan");
    githubData.user = user;

    const repos = await fetchAllRepos();
    githubData.repos = repos;

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
    if (page > 10) break;
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
// FILE EXPLORER — Ambil struktur file dari setiap repository
// ================================================================
async function fetchRepoTree(repoName) {
  if (repoTreeCache[repoName]) return repoTreeCache[repoName];

  try {
    const repoRes = await fetch(
      `${GH_API}/repos/${githubUsername}/${repoName}`,
      { headers: { Accept: "application/vnd.github.v3+json" } }
    );
    if (!repoRes.ok) return null;
    const repoInfo = await repoRes.json();
    const branch = repoInfo.default_branch || "main";

    const treeRes = await fetch(
      `${GH_API}/repos/${githubUsername}/${repoName}/git/trees/${branch}?recursive=1`,
      { headers: { Accept: "application/vnd.github.v3+json" } }
    );
    if (!treeRes.ok) return null;
    const treeData = await treeRes.json();

    const structured = buildTreeStructure(treeData.tree || [], repoName, branch);
    repoTreeCache[repoName] = structured;
    return structured;
  } catch (err) {
    console.error("Gagal fetch tree repo " + repoName + ":", err);
    return null;
  }
}

// ================================================================
// Ubah flat list menjadi struktur pohon bersarang
// ================================================================
function buildTreeStructure(flatItems, repoName, branch) {
  const root = { name: repoName, type: "tree", children: [], path: "" };
  const webExts = [".html", ".htm", ".svg"];

  flatItems.forEach(function(item) {
    const parts = item.path.split("/");
    let current = root;

    parts.forEach(function(part, idx) {
      const isLast = idx === parts.length - 1;
      const currentPath = parts.slice(0, idx + 1).join("/");

      if (isLast && item.type === "blob") {
        const ext = part.includes(".") ? "." + part.split(".").pop().toLowerCase() : "";
        const isWebFile = webExts.includes(ext);
        const liveUrl = isWebFile
          ? "https://" + githubUsername + ".github.io/" + repoName + "/" + item.path
          : null;
        const githubUrl = "https://github.com/" + githubUsername + "/" + repoName + "/blob/" + branch + "/" + item.path;

        current.children.push({
          name: part,
          type: "blob",
          path: currentPath,
          ext: ext,
          isWebFile: isWebFile,
          liveUrl: liveUrl,
          githubUrl: githubUrl,
          size: item.size || 0,
        });
      } else {
        let folder = null;
        for (let i = 0; i < current.children.length; i++) {
          if (current.children[i].name === part && current.children[i].type === "tree") {
            folder = current.children[i];
            break;
          }
        }
        if (!folder) {
          folder = { name: part, type: "tree", children: [], path: currentPath };
          current.children.push(folder);
        }
        current = folder;
      }
    });
  });

  sortTreeNodes(root);
  return root;
}

// ================================================================
// Urutkan node: folder dulu, lalu file, keduanya alfabet
// ================================================================
function sortTreeNodes(node) {
  if (!node.children) return;
  node.children.sort(function(a, b) {
    if (a.type === b.type) return a.name.localeCompare(b.name);
    return a.type === "tree" ? -1 : 1;
  });
  node.children.forEach(function(child) {
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

  const specialNames = {
    "readme.md":    { icon: "📖", color: "#a1a1aa" },
    "readme":       { icon: "📖", color: "#a1a1aa" },
    "license":      { icon: "⚖️",  color: "#a1a1aa" },
    "license.md":   { icon: "⚖️",  color: "#a1a1aa" },
    "dockerfile":   { icon: "🐳", color: "#0db7ed" },
    "makefile":     { icon: "🔨", color: "#a1a1aa" },
    "package.json": { icon: "📦", color: "#eab308" },
    ".gitignore":   { icon: "👁️",  color: "#a1a1aa" },
    ".env":         { icon: "🔒", color: "#ef4444" },
    ".env.example": { icon: "🔒", color: "#a1a1aa" },
  };

  if (specialNames[n]) return specialNames[n];

  const extMap = {
    ".html": { icon: "🌐", color: "#e34c26" },
    ".htm":  { icon: "🌐", color: "#e34c26" },
    ".css":  { icon: "🎨", color: "#563d7c" },
    ".scss": { icon: "🎨", color: "#c6538c" },
    ".sass": { icon: "🎨", color: "#c6538c" },
    ".js":   { icon: "⚡", color: "#f7df1e" },
    ".mjs":  { icon: "⚡", color: "#f7df1e" },
    ".ts":   { icon: "💙", color: "#3178c6" },
    ".jsx":  { icon: "⚛️",  color: "#61dafb" },
    ".tsx":  { icon: "⚛️",  color: "#61dafb" },
    ".vue":  { icon: "💚", color: "#41b883" },
    ".py":   { icon: "🐍", color: "#3572A5" },
    ".go":   { icon: "🐹", color: "#00ADD8" },
    ".rs":   { icon: "🦀", color: "#dea584" },
    ".java": { icon: "☕", color: "#b07219" },
    ".kt":   { icon: "🟣", color: "#A97BFF" },
    ".dart": { icon: "🎯", color: "#00B4AB" },
    ".php":  { icon: "🐘", color: "#4F5D95" },
    ".rb":   { icon: "💎", color: "#701516" },
    ".sh":   { icon: "⚙️",  color: "#89e051" },
    ".bash": { icon: "⚙️",  color: "#89e051" },
    ".zsh":  { icon: "⚙️",  color: "#89e051" },
    ".md":   { icon: "📝", color: "#a1a1aa" },
    ".mdx":  { icon: "📝", color: "#a1a1aa" },
    ".txt":  { icon: "📄", color: "#a1a1aa" },
    ".json": { icon: "📦", color: "#eab308" },
    ".xml":  { icon: "📄", color: "#ff6600" },
    ".yml":  { icon: "⚙️",  color: "#6daedb" },
    ".yaml": { icon: "⚙️",  color: "#6daedb" },
    ".toml": { icon: "⚙️",  color: "#9c4221" },
    ".svg":  { icon: "🖼️",  color: "#ffb13b" },
    ".png":  { icon: "🖼️",  color: "#22c55e" },
    ".jpg":  { icon: "🖼️",  color: "#22c55e" },
    ".jpeg": { icon: "🖼️",  color: "#22c55e" },
    ".gif":  { icon: "🖼️",  color: "#22c55e" },
    ".webp": { icon: "🖼️",  color: "#22c55e" },
    ".ico":  { icon: "🖼️",  color: "#22c55e" },
    ".pdf":  { icon: "📕", color: "#ef4444" },
    ".zip":  { icon: "🗜️",  color: "#a1a1aa" },
    ".rar":  { icon: "🗜️",  color: "#a1a1aa" },
    ".tar":  { icon: "🗜️",  color: "#a1a1aa" },
    ".sql":  { icon: "🗄️",  color: "#336791" },
    ".lock": { icon: "🔒", color: "#a1a1aa" },
    ".log":  { icon: "📋", color: "#a1a1aa" },
  };

  return extMap[ext] || { icon: "📄", color: "#71717a" };
}

// ================================================================
// Format waktu relatif
// ================================================================
function timeAgo(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);

  const units = [
    { label: "tahun",  secs: 31536000 },
    { label: "bulan",  secs: 2592000  },
    { label: "minggu", secs: 604800   },
    { label: "hari",   secs: 86400    },
    { label: "jam",    secs: 3600     },
    { label: "menit",  secs: 60       },
  ];

  for (let i = 0; i < units.length; i++) {
    const count = Math.floor(diff / units[i].secs);
    if (count >= 1) return count + " " + units[i].label + " lalu";
  }
  return "baru saja";
}

// ================================================================
// Format angka (1200 → 1.2k)
// ================================================================
function formatNumber(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000)    return (n / 1000).toFixed(1) + "k";
  return String(n);
}

// ================================================================
// Format ukuran file
// ================================================================
function formatFileSize(bytes) {
  if (bytes < 1024)             return bytes + "B";
  if (bytes < 1024 * 1024)      return (bytes / 1024).toFixed(1) + "KB";
  return (bytes / (1024 * 1024)).toFixed(1) + "MB";
}

// ================================================================
// Sanitasi HTML — cegah XSS
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
// Tampilkan pesan error
// ================================================================
function showError(msg) {
  const el = document.createElement("div");
  el.style.cssText = [
    "position:fixed",
    "top:80px",
    "left:50%",
    "transform:translateX(-50%)",
    "background:#ef4444",
    "color:white",
    "padding:12px 24px",
    "border-radius:8px",
    "z-index:9999",
    "font-size:14px",
    "box-shadow:0 4px 24px rgba(239,68,68,0.4)",
    "font-family:var(--font-sans)",
  ].join(";");
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(function() { el.remove(); }, 5000);
}

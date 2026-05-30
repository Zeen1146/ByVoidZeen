// ================================================================
// TERMINAL.JS — Mode terminal rahasia (/terminal)
// ================================================================

const terminalCommands = {
  help: () => `
Perintah yang tersedia:
  help      — Tampilkan bantuan
  about     — Informasi tentang developer
  projects  — Daftar project terbaru
  skills    — Bahasa pemrograman utama
  github    — Buka profil GitHub
  stats     — Statistik repository
  clear     — Bersihkan terminal
  exit      — Tutup terminal
  `.trim(),

  about: () => {
    const u = githubData.user;
    if (!u) return "Data belum dimuat.";
    return [
      `Nama    : ${u.name || u.login}`,
      `Username: @${u.login}`,
      `Bio     : ${u.bio || "-"}`,
      `Lokasi  : ${u.location || "-"}`,
      `Web     : ${u.blog || "-"}`,
    ].join("\n");
  },

  projects: () => {
    const repos = githubData.repos.slice(0, 8);
    if (!repos.length) return "Belum ada repository.";
    return repos.map((r, i) => `${i + 1}. ${r.name} — ★${r.stargazers_count}`).join("\n");
  },

  skills: () => {
    const langs = githubData.languages;
    if (!langs || !Object.keys(langs).length) return "Belum ada data bahasa.";
    const total = Object.values(langs).reduce((a, b) => a + b, 0);
    return Object.entries(langs)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([lang, bytes]) => {
        const pct = Math.round((bytes / total) * 100);
        const bar = "█".repeat(Math.round(pct / 5)) + "░".repeat(20 - Math.round(pct / 5));
        return `${lang.padEnd(12)} ${bar} ${pct}%`;
      })
      .join("\n");
  },

  github: () => {
    const u = githubData.user;
    if (!u) return "Data belum dimuat.";
    window.open(u.html_url, "_blank");
    return `Membuka profil GitHub @${u.login}...`;
  },

  stats: () => {
    const u = githubData.user;
    if (!u) return "Data belum dimuat.";
    return [
      `Repository : ${u.public_repos}`,
      `Stars      : ${githubData.totalStars}`,
      `Forks      : ${githubData.totalForks}`,
      `Followers  : ${u.followers}`,
      `Following  : ${u.following}`,
    ].join("\n");
  },

  clear: () => {
    const body = document.getElementById("terminal-body");
    if (body) body.innerHTML = "";
    return null; // null = tidak print output tambahan
  },

  exit: () => {
    closeTerminal();
    return null;
  }
};

// ================================================================
// Tambahkan baris ke terminal
// ================================================================
function terminalPrint(command, output) {
  const body = document.getElementById("terminal-body");
  if (!body) return;

  // Baris perintah
  const cmdLine = document.createElement("div");
  cmdLine.className = "terminal-line";
  cmdLine.innerHTML = `<span class="terminal-prompt">$ </span><span class="terminal-output" style="color:#58a6ff;">${escapeHtml(command)}</span>`;
  body.appendChild(cmdLine);

  // Baris output
  if (output !== null && output !== undefined) {
    output.split("\n").forEach(line => {
      const outLine = document.createElement("div");
      outLine.className = "terminal-line";
      outLine.innerHTML = `<span class="terminal-output">${escapeHtml(line)}</span>`;
      body.appendChild(outLine);
    });
  }

  // Auto-scroll ke bawah
  body.scrollTop = body.scrollHeight;
}

// ================================================================
// Proses perintah terminal
// ================================================================
function processTerminalCommand(cmd) {
  const trimmed = cmd.trim().toLowerCase();
  if (!trimmed) return;

  const handler = terminalCommands[trimmed];
  if (handler) {
    const output = handler();
    if (output !== null) terminalPrint(cmd, output);
  } else {
    terminalPrint(cmd, `Perintah '${trimmed}' tidak dikenal. Ketik 'help' untuk bantuan.`);
  }
}

// ================================================================
// Buka / Tutup terminal
// ================================================================
function openTerminal() {
  const modal = document.getElementById("terminal-modal");
  if (!modal) return;
  modal.classList.remove("hidden");
  setTimeout(() => {
    const input = document.getElementById("terminal-input");
    if (input) input.focus();
  }, 100);
}

function closeTerminal() {
  const modal = document.getElementById("terminal-modal");
  if (modal) modal.classList.add("hidden");
}

// ================================================================
// Event listener terminal
// ================================================================
function initTerminal() {
  const input = document.getElementById("terminal-input");
  const closeBtn = document.getElementById("terminal-close");

  if (input) {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        processTerminalCommand(input.value);
        input.value = "";
      }
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", closeTerminal);
  }

  // Klik luar modal untuk menutup
  const modal = document.getElementById("terminal-modal");
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeTerminal();
    });
  }
}

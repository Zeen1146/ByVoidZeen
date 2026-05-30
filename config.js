// ================================================================
// KONFIGURASI UTAMA — Ganti username GitHub kamu di sini
// Seluruh website akan otomatis menyesuaikan diri
// ================================================================

const githubUsername = "USERNAME"; // ← Ganti ini

const siteConfig = {
  // Informasi personal tambahan (opsional, akan diganti data GitHub)
  cvUrl: "#", // Link download CV kamu
  email: "", // Email kontak (kosongkan jika ingin ambil dari GitHub)
  
  // Konfigurasi tampilan
  maxProjects: 50, // Maksimal project yang ditampilkan
  featuredTopics: ["featured", "portfolio"], // Topic untuk featured project
  
  // Kategori bahasa
  categories: {
    website: ["HTML", "CSS", "JavaScript", "TypeScript", "Vue", "Svelte", "Astro"],
    application: ["Flutter", "Kotlin", "Java", "Swift", "Dart", "React Native"],
    tools: ["Python", "Go", "Rust", "Shell", "Ruby", "PHP", "C", "C++", "C#"],
  },
  
  // Warna tema untuk bahasa pemrograman
  langColors: {
    JavaScript: "#f7df1e",
    TypeScript: "#3178c6",
    Python: "#3572A5",
    HTML: "#e34c26",
    CSS: "#563d7c",
    Vue: "#41b883",
    React: "#61dafb",
    Go: "#00ADD8",
    Rust: "#dea584",
    Kotlin: "#A97BFF",
    Java: "#b07219",
    Flutter: "#54C5F8",
    Dart: "#00B4AB",
    Swift: "#F05138",
    PHP: "#4F5D95",
    Ruby: "#701516",
    Shell: "#89e051",
    "C++": "#f34b7d",
    "C#": "#178600",
    C: "#555555",
  }
};

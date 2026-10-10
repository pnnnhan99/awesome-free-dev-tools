const fs = require("fs");
const axios = require("axios");
const path = require("path");

// NOTE: many sites send very large response headers (e.g. Tricentis). Node's
// default 16 KB header limit then throws HPE_HEADER_OVERFLOW and the tool is
// wrongly reported as Offline. Always run through `npm run build`, or directly:
//   node --max-http-header-size=131072 scripts/build-readme.js

const TOOLS_DIR = path.join(__dirname, "..", "data", "tools");
const README_FILE = path.join(__dirname, "..", "README.md");
const DOCS_DIR = path.join(__dirname, "..", "docs");
const HTML_FILE = path.join(DOCS_DIR, "index.html");

const STATUS_ONLINE = "🟢 Online";
const STATUS_OFFLINE = "🔴 Offline";

const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "Connection": "keep-alive",
};

function slug(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Resolve a tech logo from the tool's domain using Google's public favicon
// service (no API key required). Returns "" when the URL is not parseable.
function faviconUrl(url) {
  try {
    const { hostname } = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
  } catch (err) {
    return "";
  }
}

async function checkTool(tool) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await axios({
      method: "GET",
      url: tool.url,
      timeout: 8000,
      headers: BROWSER_HEADERS,
      validateStatus: () => true,
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.status >= 500) {
      return { status: STATUS_OFFLINE, httpCode: res.status };
    }
    return { status: STATUS_ONLINE, httpCode: res.status };
  } catch (err) {
    return { status: STATUS_OFFLINE, httpCode: "error" };
  }
}

function groupByCategory(toolsWithStatus) {
  const groups = {};
  for (const item of toolsWithStatus) {
    const cat = item.tool.category || "Other";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(item);
  }
  return groups;
}

function generateMarkdown(toolsWithStatus) {
  const total = toolsWithStatus.length;
  const online = toolsWithStatus.filter((t) => t.status === STATUS_ONLINE).length;
  const offline = total - online;
  const groups = groupByCategory(toolsWithStatus);
  const now = new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" });

  let md = `# 🛠️️ Awesome Free Dev Tools

[![Total Tools](https://img.shields.io/badge/Total_Tools-${total}-blue?style=for-the-badge)](https://github.com/pnnnhan99/awesome-free-dev-tools)
[![Online](https://img.shields.io/badge/Online-${online}-brightgreen?style=for-the-badge)](https://github.com/pnnnhan99/awesome-free-dev-tools)
[![Offline](https://img.shields.io/badge/Offline-${offline}-red?style=for-the-badge)](https://github.com/pnnnhan99/awesome-free-dev-tools)
[![Auto Update](https://img.shields.io/badge/Auto_Update-Active-purple?style=for-the-badge&logo=github-actions)](https://github.com/pnnnhan99/awesome-free-dev-tools)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](https://opensource.org/licenses/MIT)

> 🎯 **The best free-tier tools collection** for developers and Vibe Coders. Status is automatically checked every night to keep information accurate.
>
> 🤝 **Want to contribute?** Open a Pull Request or create an Issue to suggest a new tool!

## 📋 Overview

| Metric | Value |
|---|---|
| Total Tools | ${total} |
| 🟢 Online | ${online} |
| 🔴 Offline | ${offline} |
| Last Updated | ${now} (GMT+7) |

---

## 📂 Table of Contents

`;

  for (const category of Object.keys(groups)) {
    md += `- [${category}](#${slug(category)})\n`;
  }

  md += `\n---\n\n`;

  for (const [category, items] of Object.entries(groups)) {
    md += `### ${category}\n\n`;
    md += `<table>\n`;
    md += `  <thead>\n`;
    md += `    <tr>\n`;
    md += `      <th>Tool & Link</th>\n`;
    md += `      <th>Purpose</th>\n`;
    md += `      <th>Pricing</th>\n`;
    md += `      <th>Status</th>\n`;
    md += `    </tr>\n`;
    md += `  </thead>\n`;
    md += `  <tbody>\n`;

    for (const item of items) {
      const pricing = item.tool.pricing || "N/A";
      md += `    <tr>\n`;
      md += `      <td style="vertical-align: middle;"><a href="${item.tool.url}">${item.tool.name}</a></td>\n`;
      md += `      <td style="vertical-align: middle;">${item.tool.purpose}</td>\n`;
      md += `      <td style="text-align: center; vertical-align: middle;">${pricing}</td>\n`;
      md += `      <td style="text-align: right; vertical-align: middle;">${item.status}</td>\n`;
      md += `    </tr>\n`;
    }

    md += `  </tbody>\n`;
    md += `</table>\n\n`;
    md += `---\n\n`;
  }

  md += `## 📝 Notes

- **Status** is automatically checked every night by GitHub Actions.
- 🟢 Online: Server responds (status < 500).
- 🔴 Offline: Timeout, DNS error, or server error (status >= 500).
- All contributions welcome via PR at [GitHub](https://github.com/pnnnhan99/awesome-free-dev-tools).

---

<p align="center">
  Made with 💜 by the <a href="https://github.com/pnnnhan99/awesome-free-dev-tools">Awesome Free Dev Tools</a> community
</p>

<p align="center">
  🕐 Last updated: ${now}
</p>
`;

  return md;
}

function generateHtml(toolsWithStatus) {
  const total = toolsWithStatus.length;
  const online = toolsWithStatus.filter((t) => t.status === STATUS_ONLINE).length;
  const offline = total - online;
  const groups = groupByCategory(toolsWithStatus);
  const now = new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" });

  const toc = Object.keys(groups)
    .map((cat) => `        <li><a href="#${slug(cat)}">${escapeHtml(cat)}</a></li>`)
    .join("\n");

  let sections = "";
  for (const [category, items] of Object.entries(groups)) {
    const rows = items
      .map((item) => {
        const pricing = item.tool.pricing || "N/A";
        const logo = faviconUrl(item.tool.url);
        const logoCell = logo
          ? `<img class="logo" src="${escapeHtml(logo)}" alt="" width="24" height="24" loading="lazy" onerror="this.style.visibility='hidden'">`
          : "";
        return `          <tr>
            <td class="logo-cell">${logoCell}</td>
            <td><a href="${escapeHtml(item.tool.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.tool.name)}</a></td>
            <td>${escapeHtml(item.tool.purpose)}</td>
            <td>${escapeHtml(pricing)}</td>
            <td class="status">${item.status}</td>
          </tr>`;
      })
      .join("\n");

    sections += `      <section class="category">
        <h2 id="${slug(category)}">${escapeHtml(category)} <span class="count">${items.length}</span></h2>
        <table>
          <colgroup>
            <col class="col-logo">
            <col class="col-tool">
            <col class="col-purpose">
            <col class="col-pricing">
            <col class="col-status">
          </colgroup>
          <thead>
            <tr><th><span class="sr-only">Logo</span></th><th>Tool &amp; Link</th><th>Purpose</th><th>Pricing</th><th class=status>Status</th></tr>
          </thead>
          <tbody>
${rows}
          </tbody>
        </table>
      </section>
`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>🛠️ Awesome Free Dev Tools</title>
  <meta name="description" content="The best free-tier tools collection for developers and Vibe Coders">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; }
    .header { background: linear-gradient(135deg, #1e3a5f, #0f172a); padding: 40px 20px; text-align: center; border-bottom: 3px solid #3b82f6; }
    .header h1 { font-size: 2.5rem; margin-bottom: 10px; }
    .header p { font-size: 1.1rem; color: #94a3b8; max-width: 700px; margin: 0 auto; }
    .stats { display: flex; justify-content: center; gap: 30px; margin: 20px auto; flex-wrap: wrap; }
    .stat-card { background: #1e293b; padding: 20px 30px; border-radius: 12px; text-align: center; min-width: 150px; border: 1px solid #334155; }
    .stat-card .number { font-size: 2rem; font-weight: bold; }
    .stat-card .label { font-size: 0.9rem; color: #94a3b8; margin-top: 5px; }
    .stat-card.live .number { color: #22c55e; }
    .stat-card.dead .number { color: #ef4444; }
    .main-container { display: flex; max-width: 1400px; margin: 0 auto; padding: 20px; gap: 30px; }
    .sidebar { flex: 0 0 250px; position: sticky; top: 20px; height: fit-content; max-height: calc(100vh - 40px); overflow-y: auto; }
    .toc { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 20px 25px; }
    .toc h2 { font-size: 1rem; margin-bottom: 12px; color: #94a3b8; text-transform: uppercase; }
    .toc ul { list-style: none; display: flex; flex-direction: column; gap: 8px; }
    .toc a { font-size: 0.95rem; color: #3b82f6; text-decoration: none; padding: 6px 10px; border-radius: 6px; display: block; transition: background 0.2s; }
    .toc a:hover { background: #334155; text-decoration: none; }
    .content { flex: 1; min-width: 0; }
    .category { margin-bottom: 35px; scroll-margin-top: 20px; }
    .category h2 { font-size: 1.5rem; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 2px solid #334155; display: flex; align-items: center; gap: 10px; }
    .category h2 .count { font-size: 0.85rem; font-weight: 600; color: #93c5fd; background: #1e3a5f; border-radius: 999px; padding: 2px 10px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 10px; table-layout: fixed; }
    th, td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #1e293b; vertical-align: middle; overflow-wrap: anywhere; line-height: 1.5; }
    th { background: #1e293b; font-weight: 600; }
    tbody tr:hover { background: #1e293b; }
    .col-logo { width: 6%; }
    .col-tool { width: 19%; }
    .col-purpose { width: 45%; }
    .col-pricing { width: 15%; }
    .col-status { width: 15%; }
    .status { white-space: nowrap; text-align: right; }
    .logo-cell { text-align: center; vertical-align: middle; }
    .logo { width: 24px; height: 24px; border-radius: 6px; object-fit: contain; display: inline-block; vertical-align: middle; background: #fff; padding: 4px; box-shadow: 0 0 0 1px #334155, 0 2px 8px rgba(0,0,0,0.4); }
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
    a { color: #3b82f6; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .footer { text-align: center; padding: 30px; color: #64748b; border-top: 1px solid #1e293b; margin-top: 40px; }
    @media (max-width: 1024px) {
      .main-container { flex-direction: column; }
      .sidebar { flex: none; position: static; max-height: none; overflow-y: visible; width: 100%; }
      .toc ul { flex-direction: row; flex-wrap: wrap; gap: 8px 18px; }
      .toc a { padding: 4px 8px; }
    }
    @media (max-width: 768px) {
      .header h1 { font-size: 1.8rem; }
      table { font-size: 0.85rem; }
      th, td { padding: 8px 10px; }
      .col-logo { width: 12%; }
      .col-tool { width: 28%; }
      .col-purpose { width: 40%; }
      .col-pricing { width: 10%; }
      .col-status { width: 10%; }
      .status { white-space: normal; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🛠️ Awesome Free Dev Tools</h1>
    <p>The best free-tier tools collection for developers and Vibe Coders.</p>
    <div style="margin-top: 15px;">
      <a href="https://github.com/pnnnhan99/awesome-free-dev-tools"><img src="https://img.shields.io/badge/View_on_GitHub-181717?style=for-the-badge&logo=github" alt="GitHub"></a>
      <a href="https://github.com/pnnnhan99/awesome-free-dev-tools"><img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge" alt="License"></a>
    </div>
  </div>
  <div class="stats">
    <div class="stat-card"><div class="number">${total}</div><div class="label">Total Tools</div></div>
    <div class="stat-card live"><div class="number">${online}</div><div class="label">🟢 Online</div></div>
    <div class="stat-card dead"><div class="number">${offline}</div><div class="label">🔴 Offline</div></div>
  </div>
  <div class="main-container">
    <aside class="sidebar">
      <nav class="toc">
        <h2>📂 Table of Contents</h2>
        <ul>
${toc}
        </ul>
      </nav>
    </aside>
    <main class="content">
${sections}    </main>
  </div>
  <div class="footer">
    <p>Made with 💜 by the Awesome Free Dev Tools community</p>
    <p>🕐 Last updated: ${now} (GMT+7)</p>
  </div>
</body>
</html>
`;
}

async function main() {
  console.log("🚀 Starting build-readme.js...");
  console.log(`📂 Reading tools from: ${TOOLS_DIR}`);

  const files = fs.readdirSync(TOOLS_DIR).filter(f => f.endsWith('.json'));
  const tools = [];
  for (const file of files) {
    const filePath = path.join(TOOLS_DIR, file);
    const raw = fs.readFileSync(filePath, "utf-8");
    const categoryTools = JSON.parse(raw);
    tools.push(...categoryTools);
  }
  console.log(`✅ Loaded ${tools.length} tools from ${files.length} category files.`);

  console.log("\n🔍 Checking tool status (timeout: 8s each)...");
  const results = [];

  for (const tool of tools) {
    console.log(`  ⏳ Checking: ${tool.name} (${tool.url})...`);
    const result = await checkTool(tool);
    results.push({ tool, ...result });
    console.log(`  ✅ ${tool.name}: ${result.status} (${result.httpCode})`);
  }

  const onlineCount = results.filter((r) => r.status === STATUS_ONLINE).length;
  console.log(`\n📊 Results: ${onlineCount}/${results.length} tools are online.`);

  console.log("✨ Generating README.md and docs/index.html...");
  const markdown = generateMarkdown(results);
  const html = generateHtml(results);

  const prevReadme = fs.existsSync(README_FILE) ? fs.readFileSync(README_FILE, "utf-8") : "";
  const prevHtml = fs.existsSync(HTML_FILE) ? fs.readFileSync(HTML_FILE, "utf-8") : "";

  fs.writeFileSync(README_FILE, markdown, "utf-8");
  fs.mkdirSync(DOCS_DIR, { recursive: true });
  fs.writeFileSync(HTML_FILE, html, "utf-8");

  console.log(`✅ README.md written successfully to: ${README_FILE}`);
  console.log(`✅ docs/index.html written successfully to: ${HTML_FILE}`);

  if (prevReadme !== markdown || prevHtml !== html) {
    console.log("🔄 Files have been updated.");
  } else {
    console.log("ℹ️  Content unchanged.");
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error("❌ Error:", err);
    process.exit(1);
  });
}

module.exports = {
  slug,
  escapeHtml,
  faviconUrl,
  groupByCategory,
  generateMarkdown,
  generateHtml,
};

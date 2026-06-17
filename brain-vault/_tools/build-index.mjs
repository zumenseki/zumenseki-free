#!/usr/bin/env node
// build-index.mjs — brain-vault の「カード目録（手製の転置インデックス）」を生成する。
//
// 全ノートの frontmatter と「> 要約:」行だけを舐めて 00_INDEX/INDEX.md と
// 00_INDEX/index.json を出力する。エージェントはこの1ファイルを読めば、本文を
// 開かずに「どのノートが必要か」をキーワード一致で判断できる（progressive disclosure）。
//
// 依存ゼロ（Node 標準モジュールのみ）。使い方:  node _tools/build-index.mjs
//
// 設計根拠: RAPTOR collapsed-tree（要約と葉を一面に並べて検索）/ BM25（キーワード
// 一致は固有名詞に強い）/ MemGPT・Mem0（索引→必要分だけページイン）。

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const VAULT = dirname(dirname(fileURLToPath(import.meta.url))); // _tools の親 = vault ルート
const OUT_MD = join(VAULT, "00_INDEX", "INDEX.md");
const OUT_JSON = join(VAULT, "00_INDEX", "index.json");

// 走査から除外するフォルダ/ファイル
const SKIP_DIRS = new Set([".obsidian", ".git", "_tools", "_templates", "90_Archive"]);
// 索引対象は「知識ノート」のみ。運用ファイル（エージェント指示・README・空フォルダ番）は除外。
const SKIP_FILES = new Set(["INDEX.md", "index.json", "AGENTS.md", "CLAUDE.md", "README.md"]);
const isNote = (name) => name.endsWith(".md") && !SKIP_FILES.has(name) && !name.endsWith(".gitkeep.md");

/** ディレクトリを再帰的に走査して .md を集める */
function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (!SKIP_DIRS.has(name)) walk(full, acc);
    } else if (isNote(name)) {
      acc.push(full);
    }
  }
  return acc;
}

/** ごく軽量な frontmatter パーサ（key: value と key: [a, b] のみ対応） */
function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  const fm = {};
  if (!m) return fm;
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([A-Za-z_]+):\s*(.*)$/);
    if (!kv) continue;
    const key = kv[1];
    let val = kv[2].trim();
    if (val.startsWith("[") && val.endsWith("]")) {
      val = val.slice(1, -1).split(",").map((s) => s.trim()).filter(Boolean);
    }
    fm[key] = val;
  }
  return fm;
}

/** 本文最初の「> 要約:」行を抜く */
function extractSummary(text) {
  const m = text.match(/^>\s*要約[:：]\s*(.+)$/m);
  return m ? m[1].trim() : "";
}

/** 最初の H1 をタイトルに。無ければファイル名 */
function extractTitle(text, file) {
  const m = text.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : basename(file, ".md");
}

const records = [];
for (const file of walk(VAULT)) {
  const text = readFileSync(file, "utf8");
  const fm = parseFrontmatter(text);
  const arr = (v) => (Array.isArray(v) ? v : v ? [v] : []);
  records.push({
    path: relative(VAULT, file),
    title: extractTitle(text, file),
    summary: extractSummary(text),
    type: fm.type || "",
    project: fm.project || "",
    status: fm.status || "",
    tags: arr(fm.tags),
    aliases: arr(fm.aliases),
    keywords: arr(fm.keywords),
    updated: fm.updated || "",
  });
}

// 検索性のため project → type の順で安定ソート
records.sort((a, b) =>
  (a.project || "zzz").localeCompare(b.project || "zzz") ||
  a.type.localeCompare(b.type) ||
  a.path.localeCompare(b.path)
);

// --- index.json（機械用）---
writeFileSync(OUT_JSON, JSON.stringify({ generated: new Date().toISOString(), records }, null, 2) + "\n");

// --- INDEX.md（人間＆エージェント用カード目録）---
const esc = (s) => String(s).replace(/\|/g, "\\|");
const kw = (r) => [...r.tags, ...r.aliases, ...r.keywords].join(" ");

let md = `---
type: moc
status: active
tags: [index, generated]
updated: ${new Date().toISOString().slice(0, 10)}
---

> 要約: 全ノートの「パス＋1行要約＋キーワード」を1枚に集約した自動生成インデックス。エージェントはまずここをキーワード検索し、該当ノートだけ開く（本文の全件読みはしない）。

# 🗂️ INDEX — カード目録（自動生成）

**このファイルは \`node _tools/build-index.mjs\` で再生成されます。手で編集しないこと。**

検索手順: ① ここで該当語をキーワード検索 → ② ヒットした \`path\` の葉ノートだけ読む。
横断・多段の質問は \`00_INDEX/MOC_*.md\` の要約から入る。

`;

let curProject = null;
for (const r of records) {
  const proj = r.project || "（プロジェクト無し）";
  if (proj !== curProject) {
    curProject = proj;
    md += `\n## ${proj}\n\n| ノート | 要約 | キーワード |\n|---|---|---|\n`;
  }
  md += `| [${esc(r.title)}](../${r.path}) | ${esc(r.summary)} | ${esc(kw(r))} |\n`;
}

md += `\n---\n\n_${records.length} ノート / 生成日時 ${new Date().toISOString()}_\n`;

writeFileSync(OUT_MD, md);
console.log(`Indexed ${records.length} notes -> 00_INDEX/INDEX.md, 00_INDEX/index.json`);

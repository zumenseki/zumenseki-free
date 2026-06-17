# 🧠 brain-vault

所有者の「第二の脳」。**Obsidian Vault** であり、同時に **Codex / Claude Code の共有メモリ**です。

## 使い方

### 人間（Obsidian）
このフォルダを Obsidian の Vault として「フォルダを Vault として開く」で開く。
グラフビュー・バックリンクで全体を俯瞰できる。

### エージェント（Codex / Claude Code）
このフォルダを作業ディレクトリにして起動する。エージェントは `AGENTS.md` を自動で読み、
そこに書かれたナビゲーション手順（`00_INDEX/HOME.md` → MOC → 必要な原子ノートだけ）に従う。

```bash
cd brain-vault
codex        # OpenAI Codex CLI（AGENTS.md を自動読込）
# または
claude       # Claude Code（CLAUDE.md として AGENTS.md を参照させる設定でも可）
```

## 設計思想

- **無限容量**: ノートは増え続けてよい。古いものは `90_Archive/` へ。
- **最小コンテキスト**: エージェントは「地図（MOC）→ 要約 → 必要な1枚」だけ読む。Vault全文は読まない。
- **1ノート1概念**: 原子化して `[[リンク]]` で繋ぐ。

詳細は `AGENTS.md` を参照。

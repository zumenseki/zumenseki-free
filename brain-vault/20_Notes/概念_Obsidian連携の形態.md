---
type: concept
project: ズメンセキ
status: active
tags: [obsidian, エクスポート, 連携]
aliases: [Obsidian連携, Markdownエクスポート]
keywords: [obsidian://new, frontmatter, URIスキーム, クリップボード, Dataview]
updated: 2026-06-17
---

> 要約: ズメンセキの測定結果をObsidianへ出す方法の比較。クライアント完結ゆえ「ファイル出力」か「URIスキーム起動」の2択。Markdown出力＋obsidian://併用が有力。

# 概念 — ズメンセキの Obsidian 連携の形態

## 前提（制約）
- ズメンセキはクライアント完結（サーバー/DBなし）。VaultのファイルをブラウザからWeb直接読み書きは不可。
- できるのは「ファイルをダウンロード」か「`obsidian://` でObsidianを起動」のみ。

## 候補
| 案 | 内容 | 長所 | 短所 |
|---|---|---|---|
| A | YAMLフロントマター付き `.md` をダウンロード | 軽い/汎用/Dataview集計可 | 手動でVaultへ移動 |
| B | `obsidian://new?vault=...&file=...&content=...` でノート自動生成 | 連携感・ワンクリック | Vault名設定要/URL長制限 |
| C | Markdownをクリップボードへコピー | 最小実装 | 全部手作業 |

## 暫定方針
- **A＋B併用**を1つの「Obsidianに送る」UIにまとめる。通常はB、データ大/未設定ならAにフォールバック。
- 有料機能の候補（[[フリーミアム設計]]）。

## 出力フォーマット案
- frontmatter: `source / scale / total_area / unit / created`
- 本文: 測定一覧テーブル（名称/種別/数値/単位）＋合計。

## 関連
- [[MOC_ズメンセキ]] / [[フリーミアム設計]]

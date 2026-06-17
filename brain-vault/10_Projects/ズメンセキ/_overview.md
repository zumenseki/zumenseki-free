---
type: project
project: ズメンセキ
status: active
tags: [面積測定, pdf, nextjs, freemium]
updated: 2026-06-17
---

> 要約: PDF図面の面積・長さをブラウザ上で測定するクライアント完結型ツール。Next.js+localStorage、サーバーなし。フリーミアムで長さ測定・履歴保存を有料化。

# ズメンセキ — Overview

## 何を解決するか
建築・不動産の図面（PDF）から、面積や長さをその場で測りたい。ソフトのインストールや
アップロード（情報漏洩リスク）なしに、ブラウザだけで完結させる。

## 仕組み
1. PDFをアップロード → `pdfjs-dist` で canvas にレンダリング
2. スケール設定（既知の長さでpx→実寸の換算を決める）
3. canvas上で点をクリック
   - 面積: 多角形を閉じて [[概念_Shoelace公式]] で算出
   - 長さ: 2点間の距離
4. 測定結果（name / type / points / value / unit / color）を一覧表示・localStorageに保持

## 技術スタック
- Next.js 15.2 / React 19 / TypeScript
- UI: Radix UI + Tailwind（shadcn系）
- PDF: pdfjs-dist 4.x（worker はローカルファイルを使用）
- 状態: localStorage（バックエンドなし）

## 収益モデル
[[フリーミアム設計]] を参照。

## 関連
- 地図: [[MOC_ズメンセキ]]
- 検討: [[概念_Obsidian連携の形態]]

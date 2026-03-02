# Phase 1: 基盤構築 (アーカイブ済みタスク)

### 1.1 プロジェクトセットアップ

- [x] pnpmワークスペース + モノレポ構成
  - `packages/core/`, `packages/react/`, `examples/`
  - TypeScript strict mode, ESM, Effect.ts最新版
  - vitest設定、カバレッジ設定
  - biome (lint/format)
  - `effect ^3.16` (最新stable)

### 1.2 EffectResult 型定義

- [x] `EffectResult<A, E>` discriminated union
- [x] exhaustive matchヘルパー
- [x] `Schema.TaggedClass` または `Data.TaggedClass` での定義検討

### 1.3 Subscribable インターフェース

- [x] `useSyncExternalStore`互換の購読インターフェース
- [x] 参照等価性の保証（値が変わらなければ同じオブジェクト参照）

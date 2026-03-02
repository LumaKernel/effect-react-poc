# Phase 1: 基盤構築

## 思想

最初に**フレームワーク非依存のコア**を完成させる。Reactに一切依存しない純粋なEffect.tsの層で、テスタビリティと正しさを最優先にする。TDD（t-wada推奨）で進め、各プリミティブを独立してテストした後、結合する。

## 参考資料

- [Effect Documentation](https://effect.website/docs/)
- [TanStack Query Architecture (DeepWiki)](https://deepwiki.com/TanStack/query/2.1-queryclient-and-querycache)
- [Zustand vanilla.ts](https://github.com/pmndrs/zustand/blob/main/src/vanilla.ts)
- `dev/01-effect-ts-core.md` -- Effect.tsコアアーキテクチャ
- `dev/02-effect-reactive-primitives.md` -- リアクティブプリミティブ
- `dev/05-architecture-design.md` -- 全体設計

## タスク

### 1.1 プロジェクトセットアップ

- [ ] pnpmワークスペース + モノレポ構成
  - `packages/core/`, `packages/react/`, `examples/`
  - TypeScript strict mode, ESM, Effect.ts最新版
  - vitest設定、カバレッジ設定
  - biome (lint/format)
  - `effect ^3.16` (最新stable)

**テスト計画**: セットアップ自体のテストはなし。`vitest --run` が正常終了することを確認。

### 1.2 EffectResult 型定義

- [x] `EffectResult<A, E>` discriminated union
  ```typescript
  type EffectResult<A, E> =
    | { readonly _tag: "Initial" }
    | { readonly _tag: "Pending"; readonly promise: Promise<void> }
    | { readonly _tag: "Success"; readonly value: A }
    | { readonly _tag: "Failure"; readonly cause: Cause<E> }
    | { readonly _tag: "Refreshing"; readonly value: A; readonly promise: Promise<void> }
  ```
- [x] exhaustive matchヘルパー
- [x] `Schema.TaggedClass` または `Data.TaggedClass` での定義検討

**テスト計画**:
- 各状態の生成と型ガード関数のテスト
- exhaustive matchで全分岐をカバー
- `Data.struct`による構造的等値性テスト

**変更時に一緒にすべきこと**: `EffectResult`の状態を追加する場合、exhaustive checkが全消費箇所でコンパイルエラーになることを確認。

### 1.3 Subscribable インターフェース

- [ ] `useSyncExternalStore`互換の購読インターフェース
  ```typescript
  interface Subscribable<A> {
    readonly subscribe: (callback: () => void) => () => void
    readonly getSnapshot: () => A
  }
  ```
- [ ] 参照等価性の保証（値が変わらなければ同じオブジェクト参照）

**テスト計画**:
- subscribe/unsubscribeの正常動作
- 値変更時のコールバック呼び出し
- 値未変更時のスナップショット参照等価性（`Object.is`）
- 複数subscriberの独立性
- unsubscribe後のコールバック非呼び出し

### 1.4 EffectStore コア実装

- [ ] Effect実行結果のキャッシュ管理
- [ ] キーベースのルックアップ
- [ ] `Subscribable`インターフェース実装
- [ ] ManagedRuntime経由のEffect実行
- [ ] Fiber割り込みによるキャンセル
- [ ] GCタイマー（設定可能な猶予期間）

**テスト計画**:
- Effect.succeed → Success状態への遷移
- Effect.fail → Failure状態への遷移
- 非同期Effect → Pending → Success遷移
- Fiber割り込み → Failure(Interrupt)遷移
- 同一キーでの重複実行防止
- GCタイマーの動作（猶予期間後にエントリ削除）
- subscribe中はGCされない
- invalidateでの再実行
- dispose時の全Fiber割り込み

**考慮すべきエッジケース**:
- 実行中のEffectへの再invalidate
- subscribe → unsubscribe → subscribe（猶予期間内）
- 複数キーの並行実行
- dispose中の新規実行要求

### 1.5 EffectObserver 実装

- [ ] 単一のEffectStoreエントリを監視
- [ ] `Subscribable<EffectResult<A, E>>`を実装
- [ ] 最初のsubscribeでEffect実行開始（lazy acquisition）
- [ ] 最後のunsubscribeでクリーンアップ開始

**テスト計画**:
- 最初のsubscribeでeffect実行が開始される
- 2つ目のsubscribeでは再実行されない
- 最後のunsubscribeで猶予タイマー開始
- 猶予期間内のre-subscribeでは再実行されない
- 猶予期間後に実際にクリーンアップされる
- スナップショットの遷移シーケンス: Initial → Pending → Success

**変更時に一緒にすべきこと**: `EffectResult`の状態追加時、Observerのスナップショット生成も更新。

# Phase 4: Examples (完了分)

## 基本Examples

### 4.1 hello-world: 最小構成

- [x] EffectProvider + useEffectQuery の最小例
- [x] Effect.succeed → 即座に値を表示
- [x] Layer不要の最もシンプルな形

**示す概念**: 基本的な使い方、Provider設定

### 4.2 counter: リアクティブ状態

- [x] SubscriptionRefを使ったカウンター
- [x] increment/decrement ボタン
- [x] 複数コンポーネントでの共有状態
- [x] リアルタイム更新

**示す概念**: SubscriptionRef、状態共有、useSyncExternalStore

### 4.3 todo-app: CRUD操作

- [x] Todo追加・削除・更新・一覧
- [x] Schema.TaggedClassでTodo型定義
- [x] Layer経由のStorageService（localStorage）
- [x] テスト用のInMemoryStorageService

**示す概念**: Layer/DI、Schema、CRUD、テスタビリティ

## 非同期・ネットワーク系

### 4.4 data-fetching: 基本的なデータフェッチ

- [x] @effect/platform のHttpClientを使用
- [x] ローディング状態 → データ表示
- [x] Suspense版とnon-Suspense版の比較
- [x] エラー時のErrorBoundary表示

**示す概念**: useEffectQuery、useEffectSuspense、EffectBoundary

### 4.5 infinite-scroll: ページネーション

- [x] cursor-basedページネーション
- [x] Stream.paginateChunkEffect でストリーミング取得
- [x] IntersectionObserver でスクロール検知
- [x] useEffectStream での逐次表示

**示す概念**: Stream、ページネーション、無限スクロール

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

### 4.6 real-time-chat: WebSocket

- [x] WebSocket接続をEffect.async + Stream.asyncで抽象化
- [x] PubSub でメッセージ配信
- [x] 接続切断 → 自動再接続（Schedule.exponential）
- [x] Effect.acquireRelease でWebSocketのライフサイクル管理

**示す概念**: Stream、PubSub、リソース管理、リトライ、非同期I/O

### 4.7 parallel-requests: 並行リクエスト

- [x] 複数APIを並行フェッチ（Effect.all { concurrency: "unbounded" }）
- [x] 一つが失敗しても他は続行（Effect.allSettled相当）
- [x] Race condition: 最初に返ったものを使用（Effect.race）
- [x] セマフォで並行数制限（Effect.makeSemaphore）

**示す概念**: 構造化並行性、セマフォ、race

## エラー処理系

### 4.8 typed-errors: 型付きエラーハンドリング

- [x] Data.TaggedError で複数のエラー型定義
- [x] Effect.catchTag でエラー分岐
- [x] UI上でエラー種別に応じた表示切り替え
- [x] Cause<E>のパターンマッチング

**示す概念**: 型付きエラー、Cause、ErrorBoundary統合

### 4.9 retry-with-fallback: リトライとフォールバック

- [x] プライマリAPI → リトライ → フォールバックAPI → ローカルキャッシュ
- [x] Schedule.compose でリトライ戦略構成
- [x] リトライ進捗の可視化（何回目、次のリトライまで）
- [x] 手動リトライボタン

**示す概念**: Schedule、リトライ、フォールバック、UI状態

## リソース管理系

### 4.10 resource-cleanup: リソースクリーンアップ

- [x] EventListener登録/解除
- [x] setInterval管理
- [x] AbortController統合
- [x] 全てをuseEffectScope内で管理

**示す概念**: Scope、addFinalizer、acquireRelease

### 4.11 database-connection: 接続プール

- [x] IndexedDB接続をEffect.acquireReleaseで管理
- [x] Layer.scopedで接続プールサービス
- [x] コンポーネントライフサイクルと独立したプールライフサイクル

**示す概念**: Layer.scoped、リソースの階層的管理

## 高度なパターン

### 4.12 optimistic-updates: 楽観的更新

- [x] Todoの完了トグルを楽観的に更新
- [x] 失敗時のロールバックアニメーション
- [x] 複数の楽観的更新が同時進行

**示す概念**: 楽観的更新、ロールバック

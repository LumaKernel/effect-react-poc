# Phase 4: Examples

## 思想

examplesは**実装の検証**であり同時に**ドキュメント**。リアルな使用ケースを重視し、単純なtodoリストだけでなく、非同期処理、エラー処理、並行処理、リソース管理の複雑なシナリオを含める。各exampleは独立して動作し、特定の機能やパターンを示す。

## 参考資料

- `dev/05-architecture-design.md`
- [Effect-TS/examples GitHub](https://github.com/Effect-TS/examples)
- effect-atomの[README例](https://github.com/tim-smart/effect-atom)

## 非同期・ネットワーク系

### 4.6 real-time-chat: WebSocket

- [ ] WebSocket接続をEffect.async + Stream.asyncで抽象化
- [ ] PubSub でメッセージ配信
- [ ] 接続切断 → 自動再接続（Schedule.exponential）
- [ ] Effect.acquireRelease でWebSocketのライフサイクル管理

**示す概念**: Stream、PubSub、リソース管理、リトライ、非同期I/O

### 4.7 parallel-requests: 並行リクエスト

- [ ] 複数APIを並行フェッチ（Effect.all { concurrency: "unbounded" }）
- [ ] 一つが失敗しても他は続行（Effect.allSettled相当）
- [ ] Race condition: 最初に返ったものを使用（Effect.race）
- [ ] セマフォで並行数制限（Effect.makeSemaphore）

**示す概念**: 構造化並行性、セマフォ、race

## エラー処理系

### 4.8 typed-errors: 型付きエラーハンドリング

- [ ] Data.TaggedError で複数のエラー型定義
- [ ] Effect.catchTag でエラー分岐
- [ ] UI上でエラー種別に応じた表示切り替え
- [ ] Cause<E>のパターンマッチング

**示す概念**: 型付きエラー、Cause、ErrorBoundary統合

### 4.9 retry-with-fallback: リトライとフォールバック

- [ ] プライマリAPI → リトライ → フォールバックAPI → ローカルキャッシュ
- [ ] Schedule.compose でリトライ戦略構成
- [ ] リトライ進捗の可視化（何回目、次のリトライまで）
- [ ] 手動リトライボタン

**示す概念**: Schedule、リトライ、フォールバック、UI状態

## リソース管理系

### 4.10 resource-cleanup: リソースクリーンアップ

- [ ] EventListener登録/解除
- [ ] setInterval管理
- [ ] AbortController統合
- [ ] 全てをuseEffectScope内で管理

**示す概念**: Scope、addFinalizer、acquireRelease

### 4.11 database-connection: 接続プール

- [ ] IndexedDB接続をEffect.acquireReleaseで管理
- [ ] Layer.scopedで接続プールサービス
- [ ] コンポーネントライフサイクルと独立したプールライフサイクル

**示す概念**: Layer.scoped、リソースの階層的管理

## 高度なパターン

### 4.12 optimistic-updates: 楽観的更新

- [ ] Todoの完了トグルを楽観的に更新
- [ ] 失敗時のロールバックアニメーション
- [ ] 複数の楽観的更新が同時進行

**示す概念**: 楽観的更新、ロールバック

### 4.13 dependent-queries: 依存クエリ

- [ ] ユーザー取得 → ユーザーのプロジェクト取得 → プロジェクトのタスク取得
- [ ] 各段階でのローディング表示
- [ ] 親の変更で子が自動再フェッチ

**示す概念**: 依存クエリ、カスケード再フェッチ

### 4.14 form-with-validation: バリデーション付きフォーム

- [ ] Schema.decodeUnknownEither でフォームバリデーション
- [ ] リアルタイムバリデーション（debounced）
- [ ] サーバーサイドバリデーション統合
- [ ] 送信時の楽観的UIとエラー復帰

**示す概念**: Schema、バリデーション、debounce、mutation

### 4.15 concurrent-tabs: タブ間同期

- [ ] BroadcastChannelをStream.asyncで抽象化
- [ ] 複数タブ間での状態同期
- [ ] リーダー選出（Effect.race）

**示す概念**: BroadcastChannel、タブ間通信、race

### 4.16 auth-flow: 認証フロー

- [ ] ログイン → トークン保存 → 認証付きリクエスト
- [ ] トークンリフレッシュ（自動、透過的）
- [ ] ログアウト → 全キャッシュクリア
- [ ] 認証エラー → ログイン画面リダイレクト
- [ ] Layer経由のAuthService

**示す概念**: Layer/DI、認証、ミドルウェアパターン、キャッシュ無効化

### 4.17 file-upload: ファイルアップロード

- [ ] プログレス追跡（Stream<UploadProgress>）
- [ ] キャンセル可能
- [ ] 並行アップロード（セマフォで制限）
- [ ] リトライ

**示す概念**: Stream、プログレス、キャンセル、セマフォ

### 4.18 ssr-nextjs: Next.js統合

- [ ] App Router + Server Components
- [ ] サーバーでのEffect実行 → RSC Payload
- [ ] クライアントハイドレーション
- [ ] Server ActionsとEffect統合

**示す概念**: SSR、ハイドレーション、Server Components

## テスト計画（examples全体）

各exampleに対して:
1. **E2Eテスト（Playwright）**: 実際のブラウザ動作確認
2. **コンポーネントテスト（RTL）**: レンダリングと状態遷移
3. **Layer差し替えテスト**: テスト用Layerでの動作確認

特に以下のエッジケースを各exampleで確認:
- StrictModeでの二重レンダー
- コンポーネントの急速なmount/unmount
- ネットワークエラー/タイムアウト
- メモリリーク（長時間実行でのFiber/Scope漏れ）

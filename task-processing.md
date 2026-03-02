## 実行中タスク

**ソース**: `tasks/04-examples.md` タスク 4.9

### 4.9 retry-with-fallback: リトライとフォールバック

- [ ] プライマリAPI → リトライ → フォールバックAPI → ローカルキャッシュ
- [ ] Schedule.compose でリトライ戦略構成
- [ ] リトライ進捗の可視化（何回目、次のリトライまで）
- [ ] 手動リトライボタン

**示す概念**: Schedule、リトライ、フォールバック、UI状態

### テスト計画

- examples はカバレッジ対象外（vitest の対象外）
- 品質確認: `pnpm typecheck` + `pnpm --filter retry-with-fallback build` + `pnpm lint`

### ストーリー計画

- **api.ts**: プライマリAPI / フォールバックAPI / ローカルキャッシュの3段フォールバックを Effect で表現
  - `Schedule.exponential + Schedule.recurs` でリトライ戦略
  - `Effect.catchAll` でプライマリ→フォールバック→キャッシュのチェーン
- **RetryProgress.tsx**: `getRetrySubscribable` でリトライ進捗をリアルタイム表示（何回目/何回中）
- **FetchWithRetry.tsx**: useEffectQuery + schedule オプションでリトライ付きフェッチ + 手動リトライボタン（invalidate）
- **FallbackDemo.tsx**: 3段フォールバックチェーンのデモ
- **App.tsx**: EffectProvider + 各デモセクション

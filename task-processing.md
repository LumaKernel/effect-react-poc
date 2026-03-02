## 現在のタスク

**元ファイル:** `tasks/03-advanced-features.md` - タスク 3.3 リトライ・スケジュール統合

### タスク内容
- Effect.tsのScheduleをリトライポリシーとして使用
- `useEffectQuery`にscheduleオプション
- 指数バックオフ、fibonacci等のプリセット
- リトライ状態の可視化（attempt回数、次のリトライまでの時間）

### 設計方針

リトライはcore層（EffectStore）で実装する。`store.run()` にscheduleオプションを渡し、
Effect内部で `Effect.retry(effect, schedule)` を適用する。これにより：
- useEffectQueryだけでなく、EffectObserverやEffectValue等からも利用可能
- リトライ状態（attempt回数）はEffectResultの拡張で表現

#### アーキテクチャ決定

1. **リトライの適用レイヤー**: EffectStore.run にオプションとして schedule を渡す
   - `store.run(key, effect, { schedule })` の形
   - EffectStore内部で `Effect.retry(effect, schedule)` をラップ

2. **リトライ状態の可視化**: EffectResult に `Retrying<E>` 状態を追加
   - `_tag: "Retrying"`, `cause: Cause<E>`, `attempt: number`
   - Failure → Retrying → (成功: Success / 最終失敗: Failure)

3. **useEffectQuery のscheduleオプション**: EffectObserver経由でstore.runに渡す
   - `useEffectQuery(key, effect, { schedule })` の形

### テスト計画

**packages/core/tests/EffectStore.test.ts:**
- `Schedule.recurs(3)` で3回リトライ後に失敗
- `Schedule.exponential("10 millis")` と `Schedule.recurs(2)` の組み合わせ
- リトライ中のキャンセル（dispose / 同一キー再実行）
- リトライ成功時のSuccess遷移（Retrying → Success）
- Retrying状態のattempt回数確認

**packages/core/tests/EffectObserver.test.ts:**
- observer経由でschedule付きrunが動作すること

**packages/react/tests/useEffectQuery.test.tsx:**
- schedule オプション付きの useEffectQuery
- リトライ中の状態遷移がUIに反映されること

### ストーリー計画
UI変更なし（フック・コアのみ）

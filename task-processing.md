## 実行中タスク

**ソース**: `tasks/03-advanced-features.md` - タスク 3.6 SSR / Server Components サポート
**サブタスク**: `getServerSnapshot`の実装

> - [ ] `getServerSnapshot`の実装

### テスト計画

- `packages/react/tests/useEffectQuery.test.tsx`: SSR用 `renderToString` でのテスト追加
  - getServerSnapshot が Initial を返すことを確認
  - renderToString でエラーが出ないことを確認
- `packages/react/tests/useEffectSuspense.test.tsx`: SSR での Suspense 動作確認
- `packages/react/tests/useEffectStream.test.tsx`: SSR での getServerSnapshot テスト
- `packages/react/tests/useEffectMutation.test.tsx`: SSR での getServerSnapshot テスト
- `packages/react/tests/EffectProvider.test.tsx`: SSR での Provider 動作テスト
  - renderToString で children がレンダーされることを確認

### ストーリー計画

- UI変更なし（内部実装のみ）

### 実装計画

1. **Subscribable に getServerSnapshot を追加**
   - `Subscribable<A>` インターフェースに `getServerSnapshot?: () => A` を追加（optional）
   - `createSubscribable` は初期値をそのまま返す getServerSnapshot を生成

2. **EffectObserver に getServerSnapshot を追加**
   - `createEffectObserver` で初期状態（`initial()`）を返す getServerSnapshot を提供

3. **各フックで useSyncExternalStore の第3引数に getServerSnapshot を渡す**
   - `useEffectQuery`: observer.getServerSnapshot
   - `useEffectSuspense`: observer.getServerSnapshot（SSR時は throw しない）
   - `useEffectStream`: subscribable.getServerSnapshot
   - `useEffectMutation`: subscribable.getServerSnapshot

4. **EffectProvider の SSR 対応**
   - SSR 時は children を null ではなくレンダーする必要がある
   - ただし runtime がない状態での子レンダーは別タスク（hydration）の領域
   - 今回は getServerSnapshot の対応のみとし、Provider の SSR は最低限にする

### 周辺情報

- 現在 `useSyncExternalStore` の呼び出しは全4箇所で第3引数（getServerSnapshot）なし
- React の `renderToString` では `useSyncExternalStore` の getServerSnapshot が必須
- `useEffectScope` は `useSyncExternalStore` を使っていないので SSR セーフ

# 実行中タスク

## タスク 3.5: Reactivityサービス統合

**出典**: `tasks/03-advanced-features.md` - セクション 3.5

### タスク内容
- [ ] effect-atomの`Atom.runtime`パターン参考
- [ ] mutationがqueryを自動無効化するReactivityサービス
- [ ] タグベースの依存追跡

### 設計方針

EffectStoreにタグベースの無効化機能を追加する。

#### 変更概要

1. **EffectStore**: `run()` の `RunOptions` に `tags?: readonly string[]` を追加。StoreEntry にタグを保存。`invalidateByTags(tags)` メソッドを追加。
2. **QueryFilter**: `{ type: "tags"; readonly tags: readonly string[] }` を追加。
3. **EffectObserver**: `EffectObserverOptions` に `tags` を追加し、`store.run` にパススルー。
4. **useEffectQuery**: `UseEffectQueryOptions` に `tags` を追加。
5. **useEffectMutation**: `MutationOptions` に `invalidateTags?: readonly string[]` を追加。成功時に `store.invalidateByTags(tags)` を自動呼出。

#### タグの設計
- タグは文字列の配列（`readonly string[]`）
- `invalidateByTags(tags)` は、与えられたタグのうち1つでもマッチするエントリを無効化（OR条件）
- 逆インデックス (`tag → Set<key>`) で O(1) ルックアップ

### テスト計画
- `packages/core/tests/EffectStore.test.ts`:
  - `run` で tags を渡してエントリにタグ付け
  - `invalidateByTags` で指定タグのクエリが再実行される
  - 複数タグのOR条件無効化
  - タグなしクエリは `invalidateByTags` で影響されない
  - `clearCache` でタグインデックスもクリーンアップ
  - `QueryFilter` の `type: "tags"` フィルタ
- `packages/core/tests/EffectObserver.test.ts`:
  - Observer に tags を渡して store に伝播される
- `packages/react/tests/useEffectQuery.test.tsx`:
  - useEffectQuery に tags を渡す
- `packages/react/tests/useEffectMutation.test.tsx`:
  - mutation 成功時に `invalidateTags` で関連クエリが自動再フェッチ
  - mutation 失敗時は無効化されない
  - 無関連クエリは再フェッチされない

### ストーリー計画
- UI変更なし（内部機能のみ）

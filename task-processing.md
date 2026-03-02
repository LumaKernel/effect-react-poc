## 現在のタスク

**ソース**: `tasks/03-advanced-features.md` - タスク 3.1 Layer統合（DI）

### タスク内容

- [ ] ネストされたProviderでのLayer合成
- [ ] テスト用LayerのProvide（テストでサービスをモックに差し替え）

※ 以下は既に実装済み:
- EffectProvider で Layer<R, E, never> を受け取りManagedRuntimeを構築
- Layer変更時のruntime再構築

### 周辺情報

- 現在の EffectProvider は独立した Layer を受け取り、独立した ManagedRuntime を構築する
- ネストされた Provider は親の Layer に子の Layer を合成して新しい ManagedRuntime を構築する必要がある
- `Layer.merge` or `Layer.provideMerge` で合成が可能

### テスト計画

テストファイル: `packages/react/tests/EffectProvider.test.tsx` に追加

1. **ネストProvider - 子が親のLayerにサービスを追加**
   - 親: ServiceA を提供、子: ServiceB を追加提供
   - 子コンポーネントから ServiceA, ServiceB の両方にアクセスできること
2. **ネストProvider - 子が親のサービスをオーバーライド**
   - 親: ServiceA (value=1)、子: ServiceA (value=2)
   - 子コンポーネントからは value=2 が取得できること
3. **テスト用Layerへの差し替え**
   - 本番Layer → テスト用Layerに差し替えてテスト可能であることを示すパターンテスト
4. **ネストProvider - 子のLayer変更時に子のruntime再構築**
   - 子のLayerを変更すると、子のruntimeのみ再構築される
5. **ネストProvider - Layerのリソースクリーンアップ**
   - 子Provider unmount時に子のruntime disposeが実行されること

### ストーリー計画

UI変更なし。

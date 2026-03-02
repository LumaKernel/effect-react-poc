# Phase 3: 高度な機能（アーカイブ済み）

### 3.1 Layer統合（DI）

- [x] EffectProvider で Layer<R, E, never> を受け取りManagedRuntimeを構築
- [x] ネストされたProviderでのLayer合成
- [x] テスト用LayerのProvide（テストでサービスをモックに差し替え）
- [x] Layer変更時のruntime再構築

### 3.2 キャッシュ・無効化（部分完了）

- [x] キーベースのキャッシュ管理
- [x] `invalidateQueries(keyPattern)`（TanStack Query風）
- [x] staleTime / gcTime 設定
- [x] キャッシュの手動クリア

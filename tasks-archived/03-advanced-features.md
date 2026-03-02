# Phase 3: 高度な機能（アーカイブ済み）

### 3.1 Layer統合（DI）

- [x] EffectProvider で Layer<R, E, never> を受け取りManagedRuntimeを構築
- [x] ネストされたProviderでのLayer合成
- [x] テスト用LayerのProvide（テストでサービスをモックに差し替え）
- [x] Layer変更時のruntime再構築

### 3.2 キャッシュ・無効化

- [x] キーベースのキャッシュ管理
- [x] `invalidateQueries(keyPattern)`（TanStack Query風）
- [x] staleTime / gcTime 設定
- [x] キャッシュの手動クリア
- [x] ウィンドウフォーカス時の自動再フェッチ（オプション）

### 3.3 リトライ・スケジュール統合

- [x] Effect.tsのScheduleをリトライポリシーとして使用
- [x] `useEffectQuery`にscheduleオプション
- [x] 指数バックオフ、fibonacci等のプリセット
- [x] リトライ状態の可視化（attempt回数、次のリトライまでの時間）

### 3.4 楽観的更新（Optimistic Updates）

- [x] mutation前に仮の成功値をストアに反映
- [x] mutation成功時はそのまま
- [x] mutation失敗時にロールバック
- [x] ロールバック中の他のmutationとの競合解決

### 3.5 Reactivityサービス統合

- [x] effect-atomの`Atom.runtime`パターン参考
- [x] mutationがqueryを自動無効化するReactivityサービス
- [x] タグベースの依存追跡

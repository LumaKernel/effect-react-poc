# Phase 3: 高度な機能

## 思想

Phase 2までの基盤の上に、実運用で必要な高度な機能を追加する。各機能は独立して実装・テスト可能であるべき。Effect.tsの強みを最大限に活かすことを意識する。

## 参考資料

- [Effect Documentation - Layer](https://effect.website/docs/requirements-management/layers/)
- [Effect Documentation - Schedule](https://effect.website/docs/scheduling/built-in-schedules/)
- [TanStack Query - Cache Invalidation](https://tanstack.com/query/v5/docs/framework/react/guides/query-invalidation)
- `dev/02-effect-reactive-primitives.md`
- `dev/05-architecture-design.md`

## タスク

### 3.2 キャッシュ・無効化（残り）

- [x] ウィンドウフォーカス時の自動再フェッチ（オプション）

### 3.3 リトライ・スケジュール統合

- [ ] Effect.tsのScheduleをリトライポリシーとして使用
- [ ] `useEffectQuery`にscheduleオプション
- [ ] 指数バックオフ、fibonacci等のプリセット
- [ ] リトライ状態の可視化（attempt回数、次のリトライまでの時間）

**テスト計画**:
- `Schedule.recurs(3)` → 3回リトライ後に失敗
- `Schedule.exponential("100 millis")` → バックオフ間隔の確認
- リトライ中のキャンセル（unmount）
- リトライ成功時のSuccess遷移

### 3.4 楽観的更新（Optimistic Updates）

- [ ] mutation前に仮の成功値をストアに反映
- [ ] mutation成功時はそのまま
- [ ] mutation失敗時にロールバック
- [ ] ロールバック中の他のmutationとの競合解決

**テスト計画**:
- 楽観的更新 → Success表示 → mutation成功 → 値維持
- 楽観的更新 → Success表示 → mutation失敗 → ロールバック
- 複数の楽観的更新の順序保証

### 3.5 Reactivityサービス統合

- [ ] effect-atomの`Atom.runtime`パターン参考
- [ ] mutationがqueryを自動無効化するReactivityサービス
- [ ] タグベースの依存追跡

**テスト計画**:
- mutation実行 → 関連queryが自動re-fetch
- 無関連queryは再フェッチされない
- カスタムタグでの無効化スコープ制御

### 3.6 SSR / Server Components サポート

- [ ] `getServerSnapshot`の実装
- [ ] Server ComponentsでのEffect実行
- [ ] ハイドレーション時のデータ引き継ぎ
- [ ] Next.js App Router互換

**テスト計画**:
- `renderToString`での正常動作
- サーバーで取得したデータのクライアントへの引き継ぎ
- ハイドレーションミスマッチがないこと

**参考**: [NextJs Authentication with Effect and React 19 - Sandro Maglione](https://www.sandromaglione.com/articles/next-js-authentication-with-effect-and-react-19)

### 3.7 DevTools

- [ ] 実行中のFiber一覧
- [ ] キャッシュ状態のインスペクション
- [ ] Effect実行タイムライン
- [ ] Layer/Serviceグラフの可視化

**テスト計画**: DevToolsはE2Eテストまたはストーリーブックでの手動確認。

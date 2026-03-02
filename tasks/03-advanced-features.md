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

### 3.6 SSR / Server Components サポート

- [x] `getServerSnapshot`の実装
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

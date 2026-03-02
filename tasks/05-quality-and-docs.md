# Phase 5: 品質保証・ドキュメント

## 思想

品質を最後に追加するのではなく、各フェーズで継続的に維持する。しかしこのフェーズでは、全体を横断する品質向上タスクとドキュメンテーションに集中する。

## タスク

### 5.1 型安全性の強化

- [ ] `as`キーワードの完全排除（CLAUDE.md準拠）
- [ ] exhaustive check を全switch/union分岐に適用
- [ ] `readonly`の網羅的適用
- [ ] strict: true 全パッケージ
- [ ] noUncheckedIndexedAccess: true

**テスト計画**: `tsc --noEmit`が全パッケージでエラーゼロ

### 5.2 テストカバレッジ

- [ ] core パッケージ: 100%カバレッジ目標
- [ ] react パッケージ: 95%以上（UIテスト特有の制約あり）
- [ ] カバレッジ設定: c8/v8
- [ ] CI でのカバレッジゲート設定

**テスト種類の配分**（Testing Trophy）:
- Static: TypeScript strict mode
- Unit: コア型、ヘルパー関数
- Integration: フック統合テスト（主力）
- E2E: examples での全体動作確認

### 5.3 パフォーマンステスト

- [ ] 大量のObserver（1000+）でのメモリ使用量
- [ ] 高頻度更新（60fps）でのレンダーパフォーマンス
- [ ] Fiber生成/割り込みのオーバーヘッド測定
- [ ] バンドルサイズ測定（tree-shaking確認）

**テスト手法**: vitest benchmark + React Profiler API

### 5.4 StrictMode / Concurrent Mode 互換性

- [ ] 全フックがStrictModeで正常動作
- [ ] 二重mount/unmountでリソースリークがない
- [ ] useTransition との互換性テスト
- [ ] useDeferredValue との互換性テスト

**テスト計画**: StrictMode wrapper付きの統合テスト全パス

### 5.5 APIドキュメント

- [ ] TSDoc コメント（全public API）
- [ ] 使用例を含むJSDocコメント
- [ ] typedoc によるAPI reference生成

### 5.6 ガイドドキュメント

- [ ] Getting Started ガイド
- [ ] Migration from effect-atom / effect-rx
- [ ] Architecture Decision Records (ADR)
- [ ] FAQ / Troubleshooting

### 5.7 CI/CD

- [ ] GitHub Actions: typecheck, lint, test, coverage
- [ ] バンドルサイズチェック（size-limit）
- [ ] changesets によるバージョン管理
- [ ] npm publish ワークフロー

# CI セットアップ

## 思想

ローカルの品質チェックをCIで自動化し、PRマージ前に必ず通過させる。GitHub Actionsを使用。

## タスク

### 6.1 基本CIワークフロー

- [ ] GitHub Actions ワークフロー作成 (`.github/workflows/ci.yml`)
  - pnpm install
  - typecheck (`tsc -b`)
  - lint (`eslint . && prettier . --check`)
  - test (`vitest run`)
  - coverage (`vitest run --coverage`)
- [ ] Node.js バージョンマトリクス (22.x)
- [ ] pnpm キャッシュ設定

### 6.2 カバレッジゲート

- [ ] カバレッジレポートのアップロード（Codecov等）
- [ ] PRでのカバレッジ低下チェック

### 6.3 バンドルサイズチェック

- [ ] size-limit 設定
- [ ] PRでのサイズ変化レポート

# 実行中タスク

**ソース:** `tasks/04-examples.md` - タスク 4.10

## タスク内容

### 4.10 resource-cleanup: リソースクリーンアップ

- EventListener登録/解除
- setInterval管理
- AbortController統合
- 全てをuseEffectScope内で管理

**示す概念**: Scope、addFinalizer、acquireRelease

## 計画

### テスト計画

examples はカバレッジ対象外のため、ユニットテストは追加しない。品質基準: `pnpm typecheck` + `pnpm --filter @effect-react-examples/resource-cleanup build` + `pnpm lint` が通ること。

### ストーリー計画

4つのデモセクションを持つシングルページアプリ:

1. **EventListenerDemo**: window resize イベントのリスナー登録/解除。useEffectScope + addFinalizer でクリーンアップ。ウィンドウサイズをリアルタイム表示
2. **IntervalDemo**: setInterval でカウントアップ。useEffectScope + addFinalizer でクリーンアップ。開始/停止で Effect.ts Scope のライフサイクルを可視化
3. **AbortControllerDemo**: AbortController をScope内で管理。fetch リクエストのキャンセルデモ。Effect.acquireRelease パターンで AbortController の作成→abort
4. **CombinedResourceDemo**: 上記3つを組み合わせた総合デモ。単一のuseEffectScope内で複数リソースを管理。マウント/アンマウントですべてのリソースが一斉にクリーンアップされることを可視化

### ファイル構成

```
examples/resource-cleanup/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── EventListenerDemo.tsx
    ├── IntervalDemo.tsx
    ├── AbortControllerDemo.tsx
    └── CombinedResourceDemo.tsx
```

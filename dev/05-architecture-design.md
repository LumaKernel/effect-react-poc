# アーキテクチャ設計方針

## 設計思想

### "Effect.ts ネイティブ"とは何か

目指すのは「Effect.tsの上にReactフックを乗せる」のではなく、**Effect.tsの思想とReactの思想を深いレベルで融合させるランタイム**。

- Effect.tsの構造化並行性、型付きエラー、リソース管理がReactの宣言的UIモデルと自然に統合
- ライフサイクル管理が`useEffect`のクリーンアップではなく、Effect.tsの`Scope`で表現
- 依存性注入がReact Contextのラッパーではなく、Effect.tsのLayer/Tagシステムで駆動
- エラーハンドリングがErrorBoundaryと型付きエラーチャネルの統合

### コア設計原則

1. **Scope = コンポーネントライフサイクル**: mount時にScope開始、unmount時にScope閉鎖
2. **ManagedRuntime = アプリケーションルート**: Layerからランタイム構築、アプリ終了時にdispose
3. **SubscriptionRef = リアクティブ状態橋梁**: Effect側の状態変更をReactに伝達
4. **Fiberの割り込み = レンダーキャンセル**: concurrent modeでのレンダー中止とFiber割り込みの対応
5. **Cause<E> = ErrorBoundary**: typed errorをErrorBoundaryに統合

## 推奨アーキテクチャ: 階層オブザーバモデル

TanStack Queryの階層を参考に:

```
EffectProvider (React Context)
    |
EffectRuntime (ManagedRuntime -- Layer からの構築)
    |
EffectStore (状態キャッシュ + GC)
    |
EffectObserver (React コンポーネントへのブリッジ)
    |
React Hooks (useEffectQuery, useEffectMutation, useEffectStream, etc.)
```

### レイヤー1: コア（フレームワーク非依存）

```typescript
// @effect-react/core

// EffectStore: Effect実行結果のキャッシュと管理
interface EffectStore {
  // 購読インターフェース (useSyncExternalStore互換)
  readonly subscribe: (key: string, callback: () => void) => () => void
  readonly getSnapshot: <A, E>(key: string) => EffectResult<A, E>

  // Effect実行
  readonly run: <A, E, R>(effect: Effect.Effect<A, E, R>, key: string) => void
  readonly invalidate: (key: string) => void

  // ライフサイクル
  readonly dispose: () => Effect.Effect<void>
}

// EffectResult: Loadableパターン
type EffectResult<A, E> =
  | { readonly _tag: "Initial" }
  | { readonly _tag: "Pending"; readonly promise: Promise<void> }
  | { readonly _tag: "Success"; readonly value: A }
  | { readonly _tag: "Failure"; readonly cause: Cause<E> }
  | { readonly _tag: "Refreshing"; readonly value: A; readonly promise: Promise<void> }
```

### レイヤー2: Reactアダプタ

```typescript
// @effect-react/react

// Provider: ManagedRuntimeをReactツリーに提供
const EffectProvider: React.FC<{
  readonly layer: Layer.Layer<R, E, never>
  readonly children: React.ReactNode
}>

// Hooks
const useEffectQuery: <A, E>(effect: Effect.Effect<A, E, R>) => EffectResult<A, E>
const useEffectSuspense: <A, E>(effect: Effect.Effect<A, E, R>) => A
const useEffectMutation: <I, A, E>(fn: (input: I) => Effect.Effect<A, E, R>) => MutationResult<I, A, E>
const useEffectStream: <A, E>(stream: Stream.Stream<A, E, R>) => A | undefined
const useEffectRuntime: () => ManagedRuntime<R, E>
const useEffectScope: () => Scope.Scope
```

## 重要な設計判断

### 1. useSyncExternalStore vs Jotaiスタイル

| アプローチ | メリット | デメリット |
|---|---|---|
| useSyncExternalStore | シンプル、ティアリング防止、標準API | time-slicingからオプトアウト |
| Jotaiスタイル（React内部状態） | concurrent features完全維持 | 複雑、Reactのステート管理に依存 |

**推奨**: まず`useSyncExternalStore`で始める。concurrent featuresが必要になったら段階的にJotaiスタイルに移行可能。

### 2. Suspense API の分離

TanStack Queryに倣い、**Suspense版は別API**にする:

```typescript
// Non-suspense (Loadableパターン)
const result = useEffectQuery(myEffect)
// result: EffectResult<A, E> (ユーザーがloading/error分岐)

// Suspense版 (Promiseを投げる)
const value = useEffectSuspense(myEffect)
// value: A (loadingはSuspense、errorはErrorBoundary)
```

理由: 型保証が異なる（Suspense版では`value`が常にdefined）。

### 3. リソース獲得・解放戦略

```typescript
type AcquisitionStrategy = "eager" | "lazy"  // 作成時 vs 最初の購読時
type ReleaseStrategy =
  | { readonly type: "immediate" }           // 最後のunsubscribeで即中断
  | { readonly type: "grace"; readonly duration: Duration }  // gcTimeのような猶予
  | { readonly type: "keepAlive" }           // 永続
```

**デフォルト**: lazy acquisition + grace release (30秒)

### 4. StrictMode / 二重レンダーへの対応

React StrictModeは開発時に:
- コンポーネントを二重レンダー
- useEffectを二重実行（mount → unmount → mount）

**対応策**:
- Effect実行はレンダーフェーズではなく、useEffect内で行う
- Scope作成とクリーンアップが冪等であること
- grace period releaseで二重mount/unmountに対応（unmount→mount間の猶予）

### 5. エラーハンドリング統合

```typescript
// Suspenseモード: Cause<E>からthrowable errorに変換
if (result._tag === "Failure") {
  throw new EffectError(result.cause) // ErrorBoundaryがキャッチ
}

// Non-Suspenseモード: Cause<E>を直接公開
const result = useEffectQuery(myEffect)
if (result._tag === "Failure") {
  // パターンマッチング可能
  Cause.match(result.cause, { onFail: ..., onDie: ..., onInterrupt: ... })
}
```

### 6. Fiber割り込みとReactレンダーキャンセル

Reactがconcurrent modeでレンダーを中止する場合:
- workInProgressツリーが破棄される
- useEffectのクリーンアップは呼ばれない（コミットされなかったため）

**対応策**:
- Effect実行はコミットフェーズ（useEffect内）で開始
- レンダーフェーズではキャッシュからのスナップショット読み取りのみ
- Fiber割り込みはuseEffectクリーンアップで実行

## パッケージ構成案

```
effect-react/
├── packages/
│   ├── core/           # フレームワーク非依存コア
│   │   ├── src/
│   │   │   ├── Store.ts          # EffectStore実装
│   │   │   ├── Result.ts         # EffectResult型
│   │   │   ├── Observer.ts       # Observer抽象
│   │   │   └── Cache.ts          # キャッシュ・GC
│   │   └── package.json
│   ├── react/          # Reactアダプタ
│   │   ├── src/
│   │   │   ├── Provider.tsx      # EffectProvider
│   │   │   ├── hooks/
│   │   │   │   ├── useEffectQuery.ts
│   │   │   │   ├── useEffectSuspense.ts
│   │   │   │   ├── useEffectMutation.ts
│   │   │   │   ├── useEffectStream.ts
│   │   │   │   ├── useEffectRuntime.ts
│   │   │   │   └── useEffectScope.ts
│   │   │   ├── components/
│   │   │   │   ├── EffectBoundary.tsx
│   │   │   │   └── EffectValue.tsx
│   │   │   └── errors/
│   │   │       └── EffectError.ts
│   │   └── package.json
│   └── devtools/       # 開発ツール（将来）
├── examples/
└── vitest.config.ts
```

## 参考資料

- [TanStack Query Architecture](https://tanstack.com/query/latest/docs/reference/QueryClient)
- [Zustand vanilla.ts](https://github.com/pmndrs/zustand/blob/main/src/vanilla.ts)
- [observable-hooks Suspense](https://observable-hooks.js.org/guide/render-as-you-fetch-suspense.html)
- [React StrictMode](https://react.dev/reference/react/StrictMode)

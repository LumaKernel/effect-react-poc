# 既存ソリューションと先行技術

## Effect.ts + React 既存ライブラリ

### effect-atom (旧 effect-rx) -- Tim Smart

**現在の推奨ライブラリ** (Effect コアコントリビュータ作)

- npm: `@effect-atom/atom-react` (9,025 weekly downloads)
- GitHub: [tim-smart/effect-atom](https://github.com/tim-smart/effect-atom)
- Vue版も存在: `@effect-atom/atom-vue`

主要API:
- `Atom.make`: リアクティブ状態コンテナ作成
- `useAtomValue` / `useAtomSet`: 読み書きフック
- `useAtomSuspense`: Suspense統合
- `Atom.runtime`: Reactivityサービスとの統合
- `AtomRpc`: @effect/rpc との統合

### @effect-ts/react (旧版)

- npm: `@effect-ts/react` v0.3.1 (5年前、レガシー)
- GitHub: [Matechs-Digital/effect-ts-react](https://github.com/Matechs-Digital/effect-ts-react)

### Effect-TS/react (Effect-Community/react)

- GitHub: [Effect-TS/react](https://github.com/Effect-TS/react)
- "React Integration with Query & Effect"

### effect-query (コミュニティ)

- GitHub: [voidhashcom/effect-query](https://github.com/voidhashcom/effect-query)
- TanStack Query + Effect統合

### ManagedRuntime + React パターン (Sandro Maglione)

- [NextJs Authentication with Effect and React 19](https://www.sandromaglione.com/articles/next-js-authentication-with-effect-and-react-19)
- [Create a blog with Effect, NextJs and MDX](https://www.sandromaglione.com/articles/create-blog-with-effect-nextjs-and-mdx)

## 他のリアクティブライブラリのReact統合パターン

### observable-hooks (RxJS)

- `ObservableResource`でSuspense統合（Promise投げパターン）
- 購読ライフサイクルは`useEffect`クリーンアップで管理
- Concurrent mode安全（コミット後に購読開始）
- render-as-you-fetch パターン

### React-RxJS

- `bind(observable$)`でReactフックと共有Observableを返す
- Suspense統合: 同期値がなければPromise投げ
- エラーはErrorBoundaryに伝播
- `<Subscribe>`コンポーネント

### Jotai

- ストアはWeakMapベース（GC互換）
- 依存性追跡は`get`関数経由で自動
- async atom → Suspenseが**デフォルト**
- `loadable`ユーティリティでSuspenseオプトアウト
- `onMount`/`onUnmount`でリソースライフサイクル
- **`useSyncExternalStore`を意図的に不使用**（concurrent features維持）

### TanStack Query

**最も参考になる階層アーキテクチャ:**

```
Framework Adapter (useQuery, useSuspenseQuery)
         |
    QueryObserver (subscription + state derivation)
         |
       Query (data fetching + caching + state machine)
         |
    QueryCache (storage + lookup + garbage collection)
         |
    QueryClient (public API + orchestration)
```

- フレームワーク非依存コア + フレームワークアダプタ
- `Subscribable`ベースクラス
- State machine + Reducerパターン
- GCタイマー（デフォルト5分）
- `useSuspenseQuery`は**別API**（booleanフラグではない）

### Zustand

- バニラストア（フレームワーク非依存）:
  - `subscribe(listener) => unsubscribe`
  - `getState() => snapshot`
  - `getInitialState()`
- React統合: `useSyncExternalStoreWithSelector`

### Legend State

- Proxyベースの自動追跡
- `<Memo>` / `<Computed>` / `<Show>`: 細粒度リアクティビティコンポーネント
- 親の再レンダーなしでリアクティブ領域だけ更新

## 統合パターン比較

### Suspense統合の普遍パターン

1. 非同期操作のステータスを追跡: `{ status: 'pending' | 'success' | 'error', value?, error?, promise? }`
2. **Promiseをキャッシュ** -- 再レンダーで同じPromiseインスタンスを投げる（新Promiseは無限ループ）
3. `pending`時にキャッシュされたPromiseを投げる
4. `error`時にエラーを投げる（ErrorBoundaryがキャッチ）
5. `success`時に値を返す

### リソース獲得・解放比較

| ライブラリ | 獲得 | 解放 | 猶予期間 |
|---|---|---|---|
| TanStack Query | 最初のObserver subscribe | gcTime後（最後のunsubscribe） | 5分デフォルト |
| Jotai | 最初のuseAtom | onUnmount（全subscriber消失） | なし |
| observable-hooks | ObservableResource作成 | Observable完了/unmount | なし |
| Zustand | Store作成（手動） | なし（永続） | N/A |

### フレームワーク非依存コア + アダプタパターン

```
@effect-react/core    -- Effect実行、キャッシュ、状態マシン（Reactなし）
@effect-react/react   -- Reactフック、Suspense統合、useSyncExternalStore
@effect-react/vue     -- (将来) Vueコンポーザブル
```

### effect-query (Effect + TanStack Query)

- GitHub: [voidhashcom/effect-query](https://github.com/voidhashcom/effect-query)
- Effect-TSとTanStack Queryのブリッジ
- `useQuery` / `useMutation`パターンをEffect互換に

### effect-nextjs (Next.js App Router)

- GitHub: [mcrovero/effect-nextjs](https://github.com/mcrovero/effect-nextjs)
- 早期アルファ版
- App Router pages, layouts, server components, server actions用の型付きヘルパー
- Effect版の`redirect`, `notFound`, `permanentRedirect`

### ManagedRuntime + React Query (jimzer gist)

- [Gist](https://gist.github.com/jimzer/5adfb462172a100e7619f9566bc9a46c)
- Effect API clientsからuseQuery/useMutationフックを自動生成

### Effect Micro モジュール

- [ドキュメント](https://effect.website/docs/micro/new-users/)
- フロントエンド/ライブラリ向け軽量版Effect
- **5kb gzipped** から
- Layer, Ref, Queue, Deferred なし -- コアプリミティブのみ
- クライアントはMicro、サーバーはフルEffectという分離も可能

## 重要なコミュニティリソース

### ブログ・チュートリアル

- [Sandro Maglione - NextJs Authentication with Effect and React 19](https://www.sandromaglione.com/articles/next-js-authentication-with-effect-and-react-19) -- ManagedRuntime + cookies + Server Components
- [Titouan CREACH - tRPCをEffect RPCで置き換え Part 1](https://dev.to/titouancreach/how-i-replaced-trpc-with-effect-rpc-in-a-nextjs-app-router-application-4j8p) -- Effect RPC in Next.js App Router
- [Titouan CREACH - Part 2 ストリーミング](https://dev.to/titouancreach/part-2-how-i-replaced-trpc-with-effect-rpc-in-a-nextjs-app-router-application-streaming-responses-566c)
- [Mirone - Use Effect with Jotai and React](https://mirone.me/use-effect-with-jotai-and-react/) -- ManagedRuntime + Jotai atoms
- [From React to Effect (公式ブログ)](https://effect.website/blog/from-react-to-effect/) -- ReactメンタルモデルからEffectへ
- [PaulJPhilp/EffectPatterns](https://github.com/PaulJPhilp/EffectPatterns) -- 81+ patterns

### 現状の課題・限界

1. **公式Reactパッケージなし**: Effect組織は`@effect/react`を出していない。effect-atomが最も近い（Tim Smart個人プロジェクト）
2. **バンドルサイズ**: フルEffectはクライアント向けに大きい。Micro（5kb）は機能制限あり
3. **RSC統合は初期段階**: コミュニティ主導のパターンはあるが公式ガイダンスなし
4. **StrictMode**: effect-atomは対応済み。手作りの`useEffect + Effect.runFork`パターンは注意が必要

## 参考資料

- [effect-atom GitHub](https://github.com/tim-smart/effect-atom)
- [effect-atom docs](https://tim-smart.github.io/effect-atom/)
- [effect-atom interactive examples](https://effect-atom.kitlangton.com/)
- [observable-hooks](https://observable-hooks.js.org/)
- [React-RxJS](https://react-rxjs.org/)
- [Jotai Core Internals](https://jotai.org/docs/guides/core-internals)
- [TanStack Query Architecture (DeepWiki)](https://deepwiki.com/TanStack/query/2.1-queryclient-and-querycache)
- [Legend State](https://legendapp.com/open-source/state/v3/)
- [Effect v4 Beta](https://effect.website/blog/releases/effect/40-beta/)
- [Effect Micro](https://effect.website/docs/micro/new-users/)

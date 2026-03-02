# React 内部アーキテクチャ

## Fiber アーキテクチャ

### Fiberとは

React Fiberは、UIの1単位の作業を表すJavaScriptオブジェクト。各FiberはコンポーネントインスタンスまたはDOMノードに対応。

主要フィールド:
- `type`, `key`: React elementからコピー
- `child`, `sibling`, `return`: リンクドツリー構造（配列ではなくリンクドリスト）
- `alternate`: ダブルバッファリングの対になるFiber
- `memoizedState`: フック連結リスト
- `lanes`: 優先度ビットマスク
- `flags`: 必要な作業（配置、更新、削除等）のビットマスク

### ダブルバッファリング

2つのFiberツリーを同時に保持:
1. **`current`** ツリー: 画面に表示中
2. **`workInProgress`** ツリー: レンダーフェーズで構築中

コミットフェーズ完了後にルートポインタを交換。

### ワークループ

```
// 同期
while (workInProgress !== null) {
  performUnitOfWork(workInProgress);
}

// 並行
while (workInProgress !== null && !shouldYield()) {
  performUnitOfWork(workInProgress);
}
```

並行モードでは`shouldYield()`がブラウザの高優先度作業をチェック。

### レンダーフェーズ vs コミットフェーズ

**レンダーフェーズ（非同期、中断可能）:**
- `beginWork()` / `completeWork()` でFiberツリーを走査
- 変更を計算、エフェクトリストを構築
- **副作用なし**、DOM変更なし
- 中断・中止・再開が可能

**コミットフェーズ（同期、中断不可）:**
- DOM変更を適用
- useLayoutEffect コールバック実行
- useEffect コールバックをスケジュール
- 3サブフェーズ: beforeMutation, mutation, layout

## Lanes（優先度システム）

31ビットのビットマスク:

| Lane | 用途 |
|------|------|
| SyncLane | 最高優先度（click, keypress） |
| InputContinuousLane | 連続操作（scroll, mousemove） |
| DefaultLane | 通常のsetState |
| TransitionLanes (16本) | useTransition / startTransition |
| IdleLane | 最低優先度のバックグラウンド |

## Hooks 内部実装

### フックの保存: Fiber上のリンクドリスト

```
{
  memoizedState: any,     // 現在の値
  baseState: any,         // useReducer用ベース状態
  queue: UpdateQueue,     // ペンディングアクション
  next: Hook | null       // 次のフック → リンクドリスト
}
```

**フックの呼び出し順序が一定でなければならない理由**: Reactはリンクドリストの位置対応でフックを照合する。

### Dispatcher パターン

ReactはフェーズごとにDispatcherを切り替え:
- `HooksDispatcherOnMount`: 初回レンダー（新フックオブジェクト作成）
- `HooksDispatcherOnUpdate`: 再レンダー（既存フックオブジェクト読み取り）

## useSyncExternalStore

### ティアリング問題

並行モードでレンダリングが中断されると、外部ストアが変更され、同一レンダーパス内で異なるコンポーネントが異なるバージョンを読む可能性がある。

### 解決方法

```tsx
const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot?);
```

保証:
1. 同一レンダーパスで全コンポーネントが**同じスナップショット**を参照
2. レンダリング中にストアが変更されると、不整合を検出して**再開**

**トレードオフ**: time-slicingからオプトアウトする。Transitionが`useSyncExternalStore`を読むと中断・再開できない。

- **Jotai**: `useSyncExternalStore`を意図的に使わない（concurrent features維持）
- **Zustand**: `useSyncExternalStore`を使う（シンプルさ優先）

### 実装要件

1. `subscribe(callback)` → unsubscribe関数を返す。ストア変更時に`callback`を同期的に呼ぶ
2. `getSnapshot()` → 不変スナップショット。変更なしなら同じ参照を返す

## Suspense メカニズム

1. コンポーネントが**Promiseを投げる**（React 19では`use(promise)`）
2. 最寄りの`<Suspense>`境界がキャッチ
3. **fallback** UIを表示
4. `.then()`でPromiseを購読
5. 解決時にSuspense境界の子ツリー全体を**再レンダー**
6. 拒否時は最寄りの**ErrorBoundary**に伝播

### React 19の `use()` フック

- `use(promise)`でPromise投げを宣言的に
- 条件分岐やループ内で呼べる（他のフックと異なる）
- レンダー中に作成されたPromiseは不可（外部で作成が必要）

## 代数的エフェクトとの関係

React内部は**代数的エフェクト**の実践的実装:
- `useState` = "State effect"を発生させる
- Suspense = エフェクトハンドラパターン（コンポーネントがdata-needed effectを発生→Suspense境界がhandle）
- Effect.tsも代数的エフェクトシステムであるため、概念的に深い親和性がある

## React Fiber vs Effect Fiber

| 側面 | React Fiber | Effect Fiber |
|------|-------------|--------------|
| 目的 | UI計算単位 | 軽量仮想スレッド |
| スケジューリング | Laneベース優先度 | Effectランタイムスケジューラ |
| キャンセル | レンダー中止・再開 | Scopeによるリソース安全なキャンセル |
| 並行性 | シングルスレッドのタイムスライシング | 協調的マルチFiber |
| 状態 | memoizedState リンクドリスト | FiberRefベース |

## 参考資料

- [React Fiber Architecture - GitHub](https://github.com/acdlite/react-fiber-architecture)
- [Inside Fiber: In-depth Overview](https://medium.com/react-in-depth/inside-fiber-in-depth-overview-of-the-new-reconciliation-algorithm-in-react-e1c04700ef6e)
- [useSyncExternalStore - React Docs](https://react.dev/reference/react/useSyncExternalStore)
- [How React Suspense Works Under the Hood](https://www.epicreact.dev/how-react-suspense-works-under-the-hood-throwing-promises-and-declarative-async-ui-plbrh)
- [Algebraic Effects for the Rest of Us](https://overreacted.io/algebraic-effects-for-the-rest-of-us/)
- [Why useSyncExternalStore Is Not Used in Jotai](https://blog.axlight.com/posts/why-use-sync-external-store-is-not-used-in-jotai/)

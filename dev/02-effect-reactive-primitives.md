# Effect.ts リアクティブプリミティブとReactマッピング

## SubscriptionRef -- 最重要プリミティブ

`SubscriptionRef<A>`は可変参照であり、同時にブロードキャストStreamでもある。`.changes`プロパティが`Stream<A>`を返す。

```typescript
const ref = yield* SubscriptionRef.make(0)

// 購読: 現在の値 + 以降の全更新を受信
const observerFiber = yield* ref.changes.pipe(
  Stream.tap((n) => Effect.log(`Observed: ${n}`)),
  Stream.runDrain,
  Effect.fork
)

// 変更: Refと同じAPI
yield* Ref.set(ref, 42)
```

**React マッピング**: `useSyncExternalStore` + observable store。`.changes`がsubscription、`Ref.get`がsnapshot。

## Ref / SynchronizedRef

**`Ref<A>`**: アトミックなcompare-and-swap。ロックフリー。

**`SynchronizedRef<A>`**: エフェクトフルな更新を直列化。

```typescript
yield* SynchronizedRef.updateEffect(ref, (state) =>
  fetchLatestFromDB().pipe(Effect.map((data) => ({ ...state, data })))
)
```

**React マッピング**: `Ref`はスレッドセーフなバッキングストア。`SynchronizedRef`は非同期状態更新の直列化（fetch-then-updateパターン）。

## PubSub -- ブロードキャスト

各メッセージが**全ての現在の購読者**に配信される:

```typescript
const pubsub = yield* PubSub.bounded<string>(2)
const dequeue1 = yield* PubSub.subscribe(pubsub) // Scoped
const dequeue2 = yield* PubSub.subscribe(pubsub)
yield* PubSub.publish(pubsub, "Hello!")
// dequeue1, dequeue2 両方に配信
```

バックプレッシャーポリシー:
- `bounded`: プロデューサーをブロック
- `dropping`: 新メッセージを破棄
- `sliding`: 古いメッセージを破棄
- `unbounded`: 制限なし

**React マッピング**: イベントバス。`sliding`はリアルタイムUI向き、`bounded`は重要メッセージ向き。

## Queue / Dequeue

ポイントツーポイントのメッセージキュー。`Enqueue<A>`（書き込み専用）と`Dequeue<A>`（読み取り専用）で単方向データフローを型レベルで強制。

**React マッピング**: アクションキュー。イベントハンドラが`offer`、バックグラウンドFiberが`take`して処理。

## Stream

```typescript
type Stream<out A, out E = never, out R = never>
```

遅延・プルベースのストリーム。自動バックプレッシャー。チャンク単位の発行（デフォルト4096要素）。

**React マッピング**: 非同期イベントシーケンス。`flatMap({ switch: true })` = RxJSの`switchMap`。

## FiberRef

Fiberローカル状態。子Fiberに継承される。

**React マッピング**: React Contextに相当。

## ManagedRuntime -- Reactとの統合ポイント

```typescript
const AppRuntime = ManagedRuntime.make(
  Layer.mergeAll(DatabaseService.Live, AuthService.Live)
)

// 実行
await AppRuntime.runPromise(myEffect)

// 破棄（全ファイナライザ実行）
await AppRuntime.dispose()
```

## Reactプリミティブへのマッピング一覧

| Effect プリミティブ | React 対応 | 主な用途 |
|---|---|---|
| SubscriptionRef | useSyncExternalStore + observable | 共有リアクティブ状態 |
| Ref | useRef (mutable) / store backing | 高速可変状態 |
| SynchronizedRef | 直列化された非同期更新 | fetch-then-updateパターン |
| Stream | Observable / async iterator | イベントシーケンス |
| PubSub | イベントエミッタ | マルチコンポーネント通知 |
| Queue | アクションキュー | 直列化されたサイドエフェクト |
| FiberRef | React Context | Fiberローカル設定 |
| ManagedRuntime | Context Provider | アプリ全体のサービスコンテナ |
| Scope | useEffect cleanup | リソースライフサイクル |

## 参考資料

- [Effect Documentation - SubscriptionRef](https://effect.website/docs/state-management/subscriptionref/)
- [Effect Documentation - Ref](https://effect.website/docs/state-management/ref/)
- [Effect Documentation - Stream](https://effect.website/docs/stream/creating/)
- [ManagedRuntime API Docs](https://effect-ts.github.io/effect/effect/ManagedRuntime.ts.html)

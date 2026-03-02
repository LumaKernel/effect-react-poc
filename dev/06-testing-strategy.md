# テスト戦略

## 基本方針

### t-wada推奨のテスト方針

- テストは**仕様**である
- テスト名は日本語で仕様を記述
- Arrange-Act-Assert パターン
- テストの独立性（順序依存なし）
- 過剰なモックを避け、可能な限り本物を使う

### Kent C. Dodds Testing Trophy

```
        /    E2E     \
       /  Integration  \     ← 主力
      /      Unit        \
     /      Static         \
```

- **Static**: TypeScript strict mode + biome lint
- **Unit**: コア型、純粋関数、ヘルパー
- **Integration**: フック + コンポーネントの統合テスト（**最重視**）
- **E2E**: examples での全体動作確認

## テストツール

- **vitest**: テストランナー
- **@testing-library/react**: Reactコンポーネントテスト
- **@effect/vitest**: Effect.ts用テストユーティリティ
- **happy-dom** or **jsdom**: DOM環境
- **Playwright**: E2Eテスト（examples用）

## テストパターン

### Effect.ts テスト

```typescript
import { it } from "@effect/vitest"

it.effect("SubscriptionRefの変更がストリームに伝播する", () =>
  Effect.gen(function* () {
    const ref = yield* SubscriptionRef.make(0)
    const collected = yield* ref.changes.pipe(
      Stream.take(3),
      Stream.runCollect,
      Effect.fork
    )
    yield* Ref.set(ref, 1)
    yield* Ref.set(ref, 2)
    const result = yield* Fiber.join(collected)
    expect(Chunk.toReadonlyArray(result)).toEqual([0, 1, 2])
  })
)
```

### React フックテスト

```typescript
import { renderHook, act, waitFor } from "@testing-library/react"

test("useEffectQueryがloading → success遷移する", async () => {
  const { result } = renderHook(
    () => useEffectQuery(Effect.succeed(42).pipe(Effect.delay("100 millis"))),
    { wrapper: TestProvider }
  )

  expect(result.current._tag).toBe("Pending")

  await waitFor(() => {
    expect(result.current._tag).toBe("Success")
    expect(result.current.value).toBe(42)
  })
})
```

### Suspense テスト

```typescript
import { render, screen, waitFor } from "@testing-library/react"

test("Suspense fallbackが表示された後、データが表示される", async () => {
  const TestComponent = () => {
    const value = useEffectSuspense(
      Effect.succeed("hello").pipe(Effect.delay("100 millis"))
    )
    return <div>{value}</div>
  }

  render(
    <EffectProvider layer={Layer.empty}>
      <Suspense fallback={<div>Loading...</div>}>
        <TestComponent />
      </Suspense>
    </EffectProvider>
  )

  expect(screen.getByText("Loading...")).toBeDefined()

  await waitFor(() => {
    expect(screen.getByText("hello")).toBeDefined()
  })
})
```

### Layer差し替えテスト

```typescript
// テスト用サービス
const TestApiService = Layer.succeed(ApiService, {
  fetchUsers: () => Effect.succeed([
    { id: "1", name: "Test User" }
  ])
})

test("テスト用Layerでモックデータが表示される", async () => {
  render(
    <EffectProvider layer={TestApiService}>
      <UserList />
    </EffectProvider>
  )

  await waitFor(() => {
    expect(screen.getByText("Test User")).toBeDefined()
  })
})
```

## エッジケースチェックリスト

全フックに対して以下を確認:

- [ ] StrictModeでの二重レンダー
- [ ] 急速なmount/unmount（100ms以内のmount→unmount→mount）
- [ ] 同時に100個のObserver
- [ ] Effectが同期的に完了するケース
- [ ] Effectが永遠に完了しないケース（タイムアウト検証）
- [ ] メモリリーク（WeakRefでのGC確認）
- [ ] SSR環境（window undefined）
- [ ] React 18 / React 19 両対応

## 参考資料

- [Testing Library - React](https://testing-library.com/docs/react-testing-library/intro/)
- [@effect/vitest](https://effect-ts.github.io/effect/effect/vitest.ts.html)
- [t-wada テスト駆動開発](https://t-wada.hatenablog.jp/)
- [Kent C. Dodds - Testing Trophy](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications)

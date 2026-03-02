# Effect.ts コアアーキテクチャ

## 思想・設計原則

Effect.tsは TypeScript のための関数型エフェクトシステム。核心的なメンタルモデル: **Effectは計算の不変で遅延的な記述であり、計算そのものではない**。

```typescript
type Effect<Success, Error, Requirements> =
  (context: Context<Requirements>) => Error | Success
```

### 主要設計原則

1. **型システムで全てを追跡**: 成功値だけでなく、エラーとコンテキスト依存も型レベルで追跡
2. **遅延・合成可能な記述**: Effectは作成時に実行されない。宣言的にワークフローを組み立て、準備ができたら実行
3. **不変性**: すべてのEffect値は不変。変換は新しいEffect値を生成
4. **包括的標準ライブラリ**: データ構造、エラー処理、並行性、スケジューリング、リトライ、ストリーミング、キャッシュ、リソース管理を一つの傘下に提供

### Effect vs Promise

| 側面 | Promise | Effect |
|------|---------|--------|
| 実行 | 即時（eager） | 遅延（lazy） |
| エラー型 | unknown | 型付きエラーチャネル `E` |
| 依存性 | なし | `R` チャネルで追跡 |
| キャンセル | AbortController（外部） | Fiber割り込み（組み込み） |
| 並行性 | Promise.all等 | 構造化並行性 |
| リソース管理 | 手動 | Scope/acquireRelease |

## コア型

### Effect<A, E, R>

- **A** (Success): 成功時の値の型
- **E** (Error): 期待されるエラーの型。デフォルト `never`
- **R** (Requirements): コンテキスト依存。デフォルト `never`
- 全3型パラメータは **共変** (`out`)

### Exit<A, E>

```typescript
type Exit<A, E> = Exit.Success<A> | Exit.Failure<E>
```

### Cause<E> -- ロスレスエラー表現

```typescript
type Cause<E> =
  | Cause.Empty        // エラーなし
  | Cause.Fail<E>      // 型付きエラー（expected）
  | Cause.Die          // 予期しない欠陥（defect）
  | Cause.Interrupt     // Fiber割り込み
  | Cause.Sequential<E> // 逐次的に発生した2つのCause
  | Cause.Parallel<E>   // 並行的に発生した2つのCause
```

### Context と Tag

```typescript
class Database extends Context.Tag("Database")<
  Database,
  { readonly query: (sql: string) => Effect.Effect<ReadonlyArray<unknown>> }
>() {}
```

`Context`はサービスの`Map<Tag, Implementation>`。`R`パラメータはTagのunion: `Effect<A, E, Database | Logger>`

### Layer<ROut, E, RIn>

サービスの**構築方法**を記述。依存性`RIn`から出力`ROut`を構築し、`E`で失敗しうる。

### Runtime<R> と ManagedRuntime

`Runtime<R>`はEffect実行に必要な環境を提供:
- `Context<R>`: サービス実装
- `RuntimeFlags`: 実行動作制御
- `FiberRef`マップ: Fiberローカル状態

`ManagedRuntime`はLayerからRuntimeを生成し、ライフサイクル管理（生成・破棄）を行う。**Reactとの主要統合ポイント**。

### Fiber

軽量スレッド。Effectランタイムが管理。

### FiberRef

Fiberローカルストレージ（JavaのThreadLocalに相当、ただし子Fiberに伝播する）。

### Scope

リソースのライフタイムを表現。Scopeがクローズされると、登録された全てのファイナライザが実行される。

## 内部実装

### Effectの内部表現

Effectは内部的に**プリミティブ命令のDiscriminated Union**。各Effectには操作を識別する`_op`フィールドがある。

| Operation | `_op` | 説明 |
|---|---|---|
| Sync | `"Sync"` | 同期サンク `() => A` |
| Async | `"Async"` | 非同期コールバック |
| OnSuccess | `"OnSuccess"` | 成功時の継続 |
| OnFailure | `"OnFailure"` | 失敗時の継続 |
| WithRuntime | `"WithRuntime"` | FiberRuntimeへのアクセス |
| UpdateRuntimeFlags | `"UpdateRuntimeFlags"` | RuntimeFlagsの変更 |
| Tag | `"Tag"` | Contextからのサービスルックアップ |
| Yield | `"Yield"` | 協調的イールド |

### FiberRuntime実行ループ

`FiberRuntime`クラスがEffectの実行の心臓部:

1. 現在のEffect（命令）を受け取る
2. `_op`でパターンマッチして処理を決定
3. 継続（flatMap, catchAll）を**継続スタック**にプッシュ
4. 完了時にスタックをポップして次のEffectを決定
5. `currentOpCount`が閾値を超えるとFiberは**制御を譲る**（cooperative yielding）

### スケジューラ

| スケジューラ | 動作 |
|---|---|
| `defaultScheduler` | 標準（マイクロタスク/setTimeout） |
| `SyncScheduler` | 同期実行（`runSync`用） |
| `MixedScheduler` | 複合スケジューリング |
| `ControlledScheduler` | 外部制御 |

## Effect v4 (effect-smol)

- Fiberランタイムをゼロから書き直し
- メモリオーバーヘッド低減、高速化、シンプルな内部構造
- アグレッシブなtree-shaking: 最小のEffectプログラムで~6.3KB (minified+gzipped)
- 現在ベータ版
- v3はフィーチャーフリーズ（バグ修正とセキュリティパッチのみ）

## 参考資料

- [Effect Documentation](https://effect.website/docs/)
- [Effect-TS/effect GitHub](https://github.com/Effect-TS/effect)
- [Effect-TS/effect-smol GitHub](https://github.com/Effect-TS/effect-smol)
- [DeepWiki - Effect Type and Execution Model](https://deepwiki.com/Effect-TS/effect/2.1-effect-type-and-runtime)
- [DeepWiki - Fibers and Concurrency](https://deepwiki.com/Effect-TS/effect/3.1-fibers)
- [Building an Effect Runtime in TypeScript (DEV Community)](https://dev.to/baldrvivaldelli/building-an-effect-runtime-in-typescript-my-little-detour-into-fibers-and-structured-concurrency-mad)

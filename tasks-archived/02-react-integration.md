# Phase 2: React統合

## 思想

Kent C. Dodds の Testing Trophy に従い、統合テストを中心に据える。個々のフックの単体テストよりも、`renderHook`や`render`を使った統合テストを重視する。React Testing Library + vitest を使用。

## 参考資料

- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [useSyncExternalStore - React Docs](https://react.dev/reference/react/useSyncExternalStore)
- [React Suspense](https://react.dev/reference/react/Suspense)
- `dev/03-react-internals.md` -- React内部アーキテクチャ
- `dev/04-existing-solutions.md` -- 既存ソリューション
- `dev/05-architecture-design.md` -- 全体設計

## タスク

### 2.1 EffectProvider 実装

- [x] React Contextで`ManagedRuntime`をツリーに提供
- [x] Layer prop → ManagedRuntime生成
- [x] unmount時にruntime.dispose()
- [x] 子コンポーネント用のuseEffectRuntime()フック

**テスト計画**:
- Providerなしでフック使用時のエラーメッセージ
- Provider内でruntimeが取得できる
- unmount時にdisposeが呼ばれる（spy/mock）
- Layer変更時のruntime再生成

**テスト手法**: `renderHook` with wrapper component

### 2.2 useEffectQuery フック

- [x] `useSyncExternalStore`でEffectObserverを購読
- [x] `EffectResult<A, E>`を返す（non-suspense）
- [x] Effect参照の安定性（同じEffect → 同じObserver）
- [x] deps変更時の自動再実行

**テスト計画**:
- 初回レンダー: Initial → Pending → Success の遷移
- 失敗: Pending → Failure の遷移
- 依存変更時の再実行（前のEffectがキャンセルされること）
- コンポーネントunmount時のクリーンアップ
- StrictModeでの二重レンダー耐性
- 複数コンポーネントが同じEffectを使用時の共有

**テスト手法**: `renderHook` + `act` + `waitFor`

### 2.3 useEffectSuspense フック

- [x] Suspense統合版
- [x] Pending時にPromiseを投げる
- [x] Failure時にEffectErrorを投げる（ErrorBoundary用）
- [x] Success時に値`A`を直接返す
- [x] Promiseキャッシュ（同じPromiseインスタンスを投げ続ける）

**テスト計画**:
- `<Suspense fallback={...}>`内でfallback表示
- データ解決後にコンポーネント表示
- エラー時にErrorBoundaryがキャッチ
- Promise再投げの安定性（無限ループしないこと）
- StrictMode対応

**テスト手法**: `render` + Suspense/ErrorBoundary wrapper + `waitFor`

### 2.4 useEffectMutation フック

- [x] 手動トリガー型のEffect実行
- [x] `mutate(input)`関数を返す
- [x] mutation状態の追跡（idle, pending, success, failure）
- [x] 前のmutationのキャンセル（オプション）

**テスト計画**:
- mutate呼び出し → pending → success 遷移
- mutate中のreset
- 連続mutate時の前のキャンセル
- エラー時のfailure状態

### 2.5 useEffectStream フック

- [x] Stream<A, E, R>を購読
- [x] 最新の値を返す
- [x] unmount時にStream中断
- [x] バックプレッシャー戦略（sliding/dropping）

**テスト計画**:
- Stream.make(1, 2, 3) → 順次値受信
- Stream.fromEffect(Effect.sleep(...).pipe(Effect.as(42))) → 非同期値
- unmount時のStream中断確認
- エラーStream → Failure状態

### 2.6 useEffectScope フック

- [x] コンポーネントライフサイクルに紐づくScope
- [x] mount時にScope開始
- [x] unmount時にScope閉鎖（全ファイナライザ実行）
- [x] `addFinalizer`で任意のクリーンアップ登録

**テスト計画**:
- mount時にファイナライザが登録可能
- unmount時にファイナライザが逆順で実行
- StrictModeの二重mount/unmountでの正常動作

### 2.7 EffectBoundary コンポーネント

- [x] Suspense + ErrorBoundary の統合コンポーネント
- [x] `fallback` prop（loading中）
- [x] `onError` prop / renderError（エラー表示）
- [x] Cause<E>をパターンマッチ可能な形で公開

**テスト計画**:
- 子のSuspense → fallback表示 → 解決後表示
- 子のエラー → エラー表示
- Cause<E>の型付きエラー情報がアクセス可能
- ネストされたBoundary

### 2.8 EffectValue コンポーネント（細粒度リアクティビティ）

- [x] Legend Stateの`<Memo>`に触発
- [x] 親の再レンダーなしで値だけ更新
- [x] Effect結果のレンダー分離

**テスト計画**:
- 親コンポーネントが再レンダーされないこと
- 値変更時にEffectValue内のみ再レンダー

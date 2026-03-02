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

- [ ] React Contextで`ManagedRuntime`をツリーに提供
- [ ] Layer prop → ManagedRuntime生成
- [ ] unmount時にruntime.dispose()
- [ ] 子コンポーネント用のuseEffectRuntime()フック

**テスト計画**:
- Providerなしでフック使用時のエラーメッセージ
- Provider内でruntimeが取得できる
- unmount時にdisposeが呼ばれる（spy/mock）
- Layer変更時のruntime再生成

**テスト手法**: `renderHook` with wrapper component

### 2.2 useEffectQuery フック

- [ ] `useSyncExternalStore`でEffectObserverを購読
- [ ] `EffectResult<A, E>`を返す（non-suspense）
- [ ] Effect参照の安定性（同じEffect → 同じObserver）
- [ ] deps変更時の自動再実行

**テスト計画**:
- 初回レンダー: Initial → Pending → Success の遷移
- 失敗: Pending → Failure の遷移
- 依存変更時の再実行（前のEffectがキャンセルされること）
- コンポーネントunmount時のクリーンアップ
- StrictModeでの二重レンダー耐性
- 複数コンポーネントが同じEffectを使用時の共有

**テスト手法**: `renderHook` + `act` + `waitFor`

### 2.3 useEffectSuspense フック

- [ ] Suspense統合版
- [ ] Pending時にPromiseを投げる
- [ ] Failure時にEffectErrorを投げる（ErrorBoundary用）
- [ ] Success時に値`A`を直接返す
- [ ] Promiseキャッシュ（同じPromiseインスタンスを投げ続ける）

**テスト計画**:
- `<Suspense fallback={...}>`内でfallback表示
- データ解決後にコンポーネント表示
- エラー時にErrorBoundaryがキャッチ
- Promise再投げの安定性（無限ループしないこと）
- StrictMode対応

**テスト手法**: `render` + Suspense/ErrorBoundary wrapper + `waitFor`

### 2.4 useEffectMutation フック

- [ ] 手動トリガー型のEffect実行
- [ ] `mutate(input)`関数を返す
- [ ] mutation状態の追跡（idle, pending, success, failure）
- [ ] 前のmutationのキャンセル（オプション）

**テスト計画**:
- mutate呼び出し → pending → success 遷移
- mutate中のreset
- 連続mutate時の前のキャンセル
- エラー時のfailure状態

### 2.5 useEffectStream フック

- [ ] Stream<A, E, R>を購読
- [ ] 最新の値を返す
- [ ] unmount時にStream中断
- [ ] バックプレッシャー戦略（sliding/dropping）

**テスト計画**:
- Stream.make(1, 2, 3) → 順次値受信
- Stream.fromEffect(Effect.sleep(...).pipe(Effect.as(42))) → 非同期値
- unmount時のStream中断確認
- エラーStream → Failure状態

### 2.6 useEffectScope フック

- [ ] コンポーネントライフサイクルに紐づくScope
- [ ] mount時にScope開始
- [ ] unmount時にScope閉鎖（全ファイナライザ実行）
- [ ] `addFinalizer`で任意のクリーンアップ登録

**テスト計画**:
- mount時にファイナライザが登録可能
- unmount時にファイナライザが逆順で実行
- StrictModeの二重mount/unmountでの正常動作

### 2.7 EffectBoundary コンポーネント

- [ ] Suspense + ErrorBoundary の統合コンポーネント
- [ ] `fallback` prop（loading中）
- [ ] `onError` prop / renderError（エラー表示）
- [ ] Cause<E>をパターンマッチ可能な形で公開

**テスト計画**:
- 子のSuspense → fallback表示 → 解決後表示
- 子のエラー → エラー表示
- Cause<E>の型付きエラー情報がアクセス可能
- ネストされたBoundary

### 2.8 EffectValue コンポーネント（細粒度リアクティビティ）

- [ ] Legend Stateの`<Memo>`に触発
- [ ] 親の再レンダーなしで値だけ更新
- [ ] Effect結果のレンダー分離

**テスト計画**:
- 親コンポーネントが再レンダーされないこと
- 値変更時にEffectValue内のみ再レンダー

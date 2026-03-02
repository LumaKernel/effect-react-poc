## 実行中タスク

**元ファイル:** `tasks/02-react-integration.md` タスク 2.1

### 2.1 EffectProvider 実装

- [ ] React Contextで`ManagedRuntime`をツリーに提供
- [ ] Layer prop → ManagedRuntime生成
- [ ] unmount時にruntime.dispose()
- [ ] 子コンポーネント用のuseEffectRuntime()フック

### テスト計画

テストファイル: `packages/react/tests/EffectProvider.test.tsx`

1. Providerなしでフック使用時のエラーメッセージ
2. Provider内でruntimeが取得できる
3. unmount時にdisposeが呼ばれる（spy/mock）
4. Layer変更時のruntime再生成

テスト手法: `renderHook` with wrapper component
依存: `@testing-library/react`, `react`, `@types/react`

### ストーリー計画

UIコンポーネントではないため、ストーリーは不要。

### 実装方針

1. react パッケージに react, @types/react を devDependencies に追加
2. @testing-library/react を devDependencies に追加
3. `packages/react/src/EffectProvider.tsx` を作成
   - `EffectRuntimeContext` (React.createContext)
   - `EffectProvider` コンポーネント (Layer → ManagedRuntime)
   - `useEffectRuntime()` フック
4. `packages/react/src/index.ts` から re-export
5. テストを作成

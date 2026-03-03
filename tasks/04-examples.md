# Phase 4: Examples

## 思想

examplesは**実装の検証**であり同時に**ドキュメント**。リアルな使用ケースを重視し、単純なtodoリストだけでなく、非同期処理、エラー処理、並行処理、リソース管理の複雑なシナリオを含める。各exampleは独立して動作し、特定の機能やパターンを示す。

## 参考資料

- `dev/05-architecture-design.md`
- [Effect-TS/examples GitHub](https://github.com/Effect-TS/examples)
- effect-atomの[README例](https://github.com/tim-smart/effect-atom)

## 高度なパターン

### 4.16 auth-flow: 認証フロー

- [ ] ログイン → トークン保存 → 認証付きリクエスト
- [ ] トークンリフレッシュ（自動、透過的）
- [ ] ログアウト → 全キャッシュクリア
- [ ] 認証エラー → ログイン画面リダイレクト
- [ ] Layer経由のAuthService

**示す概念**: Layer/DI、認証、ミドルウェアパターン、キャッシュ無効化

### 4.17 file-upload: ファイルアップロード

- [ ] プログレス追跡（Stream<UploadProgress>）
- [ ] キャンセル可能
- [ ] 並行アップロード（セマフォで制限）
- [ ] リトライ

**示す概念**: Stream、プログレス、キャンセル、セマフォ

### 4.18 ssr-nextjs: Next.js統合

- [ ] App Router + Server Components
- [ ] サーバーでのEffect実行 → RSC Payload
- [ ] クライアントハイドレーション
- [ ] Server ActionsとEffect統合

**示す概念**: SSR、ハイドレーション、Server Components

## テスト計画（examples全体）

各exampleに対して:
1. **E2Eテスト（Playwright）**: 実際のブラウザ動作確認
2. **コンポーネントテスト（RTL）**: レンダリングと状態遷移
3. **Layer差し替えテスト**: テスト用Layerでの動作確認

特に以下のエッジケースを各exampleで確認:
- StrictModeでの二重レンダー
- コンポーネントの急速なmount/unmount
- ネットワークエラー/タイムアウト
- メモリリーク（長時間実行でのFiber/Scope漏れ）

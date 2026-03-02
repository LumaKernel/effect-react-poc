## 実行中タスク

**タスク:** 3.2 キャッシュ・無効化 (from `tasks/03-advanced-features.md`)

**スコープ（このイテレーション）:**
- [x] キーベースのキャッシュ管理 → 既存の EffectStore で実現済み。確認のみ
- [ ] `invalidateQueries(keyPattern)` — TanStack Query風のパターンマッチング無効化
- [ ] staleTime / gcTime 設定
- [ ] キャッシュの手動クリア

**次のイテレーションに回す:**
- ウィンドウフォーカス時の自動再フェッチ（React側のオプション）

---

### テスト計画

テストファイル: `packages/core/tests/EffectStore.test.ts` に追加

#### invalidateQueries テスト
- `invalidateQueries` が指定パターンにマッチする全キーを invalidate する
- 文字列完全一致のパターン
- プレフィックスマッチ（例: `{ prefix: "users/" }`）
- predicate関数によるマッチ
- マッチしないキーは影響を受けない
- Effect未実行のキーはスキップ

#### staleTime テスト
- staleTime 内は再 subscribe で再フェッチしない（キャッシュ済みデータを利用）
- staleTime 経過後は再 subscribe で再フェッチする
- staleTime はキーごとに設定可能（run オプション）

#### gcTime テスト（既存 gcGracePeriodMs のリネーム/拡張）
- gcTime 設定のリネーム確認（後方互換は不要、内部利用のみ）

#### キャッシュ手動クリア テスト
- `clearCache(key)` で特定キーのキャッシュを Initial に戻す
- `clearCache()` で全キャッシュクリア
- 実行中の fiber も interrupt される
- subscriber への通知が発生する

### ストーリー計画
UI変更なし（core パッケージのみ）

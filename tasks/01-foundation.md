# Phase 1: 基盤構築

## 思想

最初に**フレームワーク非依存のコア**を完成させる。Reactに一切依存しない純粋なEffect.tsの層で、テスタビリティと正しさを最優先にする。TDD（t-wada推奨）で進め、各プリミティブを独立してテストした後、結合する。

## 参考資料

- [Effect Documentation](https://effect.website/docs/)
- [TanStack Query Architecture (DeepWiki)](https://deepwiki.com/TanStack/query/2.1-queryclient-and-querycache)
- [Zustand vanilla.ts](https://github.com/pmndrs/zustand/blob/main/src/vanilla.ts)
- `dev/01-effect-ts-core.md` -- Effect.tsコアアーキテクチャ
- `dev/02-effect-reactive-primitives.md` -- リアクティブプリミティブ
- `dev/05-architecture-design.md` -- 全体設計

## タスク

### 1.4 EffectStore コア実装

- [x] Effect実行結果のキャッシュ管理
- [x] キーベースのルックアップ
- [x] `Subscribable`インターフェース実装
- [x] ManagedRuntime経由のEffect実行
- [x] Fiber割り込みによるキャンセル
- [x] GCタイマー（設定可能な猶予期間）

**テスト計画**:
- Effect.succeed → Success状態への遷移
- Effect.fail → Failure状態への遷移
- 非同期Effect → Pending → Success遷移
- Fiber割り込み → Failure(Interrupt)遷移
- 同一キーでの重複実行防止
- GCタイマーの動作（猶予期間後にエントリ削除）
- subscribe中はGCされない
- invalidateでの再実行
- dispose時の全Fiber割り込み

**考慮すべきエッジケース**:
- 実行中のEffectへの再invalidate
- subscribe → unsubscribe → subscribe（猶予期間内）
- 複数キーの並行実行
- dispose中の新規実行要求

### 1.5 EffectObserver 実装

- [x] 単一のEffectStoreエントリを監視
- [x] `Subscribable<EffectResult<A, E>>`を実装
- [x] 最初のsubscribeでEffect実行開始（lazy acquisition）
- [x] 最後のunsubscribeでクリーンアップ開始

**テスト計画**:
- 最初のsubscribeでeffect実行が開始される
- 2つ目のsubscribeでは再実行されない
- 最後のunsubscribeで猶予タイマー開始
- 猶予期間内のre-subscribeでは再実行されない
- 猶予期間後に実際にクリーンアップされる
- スナップショットの遷移シーケンス: Initial → Pending → Success

**変更時に一緒にすべきこと**: `EffectResult`の状態追加時、Observerのスナップショット生成も更新。

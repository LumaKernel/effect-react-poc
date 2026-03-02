- [x] 初期セットアップ
    - [x] lint,prettier,テストとカバレッジは必須。
    - [x] 初期設定をしたあとは、以下を考慮せよ。
          "scripts": {
            "dev": "...", (あれば)
            "_lint:eslint": "eslint .",
            "_lint:prettier": "prettier . --check",
            "lint": "eslint . && prettier . --check",
            "lint-fix": "eslint . --fix && prettier . --write",
            "test": "...",
            "test:run": "...",
            "coverage": "..."
          },
    - [x] "@luma-dev/eslint-plugin-luma-ts" は全部有効化して入れる
- [x] CIのセットアップタスクも用意せよ (別個ファイルの優先タスク群として)
- [x] README.mdやその他、ライブラリとしての十分なドキュメントを用意するタスク群も用意せよ。(別個の優先度の低いタスクファイルとして)

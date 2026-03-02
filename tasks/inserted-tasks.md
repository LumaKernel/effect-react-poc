- [ ] 初期セットアップ
    - [ ] lint,prettier,テストとカバレッジは必須。
    - [ ] 初期設定をしたあとは、以下を考慮せよ。
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
    - [ ] "@luma-dev/eslint-plugin-luma-ts" は全部有効化して入れる


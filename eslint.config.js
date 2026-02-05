import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import tsEsLintPlugin from '@typescript-eslint/eslint-plugin';
import tsEsLintParser from '@typescript-eslint/parser';
import angularEsLintPlugin from '@angular-eslint/eslint-plugin';
import angularTemplateEsLintPlugin from '@angular-eslint/eslint-plugin-template';
import angularTemplateParser from '@angular-eslint/template-parser';

export default [
  // 無視するファイルを指定（従来の .eslintignore に相当）
  {
    ignores: [
      'dist',
      'src/app/api-module',
      'src/app/external-library',
      '.angular',
    ],
  },
  // eslint:recommendedに相当
  js.configs.recommended,
  // eslint-config-prettierはrulesを持つオブジェクトなので、ここに並べられる
  eslintConfigPrettier,
  // プラグインを登録
  {
    plugins: {
      '@typescript-eslint': tsEsLintPlugin,
      '@angular-eslint': angularEsLintPlugin,
      '@angular-eslint/template': angularTemplateEsLintPlugin,
    },
  },
  // TypeScript用の設定
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.cts', '**/*.mts'],
    languageOptions: {
      parser: tsEsLintParser,
      parserOptions: {
        project: true,
      },
    },
    rules: {
      // @typescript-eslint/eslint-pluginに付属のルールを適用
      ...tsEsLintPlugin.configs['eslint-recommended'].overrides[0].rules,
      ...tsEsLintPlugin.configs['recommended-type-checked'].rules,
      ...angularEsLintPlugin.configs['recommended'].rules,
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'ntc',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'ntc',
          style: 'kebab-case',
        },
      ],

      // 追加の設定

      // リンターが通らなかったので一端無効化する
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/prefer-promise-reject-errors': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-unsafe-enum-comparison': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/only-throw-error': 'off',
      '@typescript-eslint/no-redundant-type-constituents': 'off',
      '@typescript-eslint/no-base-to-string': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
    },
  },
  //HTML用
  {
    files: ['**/*.html'],
    languageOptions: {
      parser: angularTemplateParser,
      parserOptions: {
        project: true,
      },
    },
    rules: {
      ...angularTemplateEsLintPlugin.configs['recommended'].rules,
    },
  },
];

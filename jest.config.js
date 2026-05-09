/** @type {import("jest").Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^vscode$': '<rootDir>/test/__mocks__/vscode.ts',
  },
  clearMocks: true,
  transformIgnorePatterns: [
    '/node_modules/(?!(bail|ccount|character-entities|decode-named-character-reference|devlop|estree-util-is-identifier-name|is-plain-obj|longest-streak|mdast-util-from-markdown|mdast-util-to-markdown|mdast-util-to-string|mdast-util-phrasing-content|micromark|micromark-core-commonmark|micromark-extension-mdxjs|micromark-factory-destination|micromark-factory-label|micromark-factory-space|micromark-factory-title|micromark-factory-whitespace|micromark-util-character|micromark-util-chunked|micromark-util-classify-character|micromark-util-combine-extensions|micromark-util-decode-numeric-character-reference|micromark-util-decode-string|micromark-util-encode|micromark-util-html-tag-name|micromark-util-normalize-identifier|micromark-util-resolve-all|micromark-util-sanitize-uri|micromark-util-subtokenize|micromark-util-symbol|micromark-util-types|remark-parse|remark-stringify|trough|unified|unist-util-is|unist-util-position|unist-util-stringify-position|unist-util-visit|unist-util-visit-parents|vfile|vfile-message|zwitch)/)',
  ],
  collectCoverageFrom: ['src/**/*.ts', '!src/extension.ts'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: {
          strict: true,
          esModuleInterop: true,
          moduleResolution: 'node',
        },
      },
    ],
    '^.+\\.js$': 'babel-jest',
  },
};

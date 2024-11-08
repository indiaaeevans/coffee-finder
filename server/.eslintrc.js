// .eslintrc.js
module.exports = {
    env: {
      node: true,
      es2022: true,
    },
    extends: [
      'eslint:recommended',
      'plugin:node/recommended',
      'prettier'
    ],
    rules: {
      'node/exports-style': ['error', 'module.exports'],
      'node/no-unpublished-require': 'off'
    }
  };
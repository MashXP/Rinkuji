module.exports = {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\.js$': 'babel-jest',
  },
  moduleNameMapper: {
    '^@services/api.js$': '<rootDir>/src/services/api.js',
    '^@services/localStorageCacheService.js$': '<rootDir>/src/js/services/localStorageCacheService.js',
    '^@utils/NodeCreator.js$': '<rootDir>/src/js/utils/NodeCreator.js',
    '^@managers/NodeCollapseExpandManager.js$': '<rootDir>/src/js/managers/NodeCollapseExpandManager.js',
    '\.css$': '<rootDir>/__mocks__/styleMock.js',
  },
  collectCoverageFrom: [
    '<rootDir>/src/**/*.{js,jsx,ts,tsx}'
  ]
};
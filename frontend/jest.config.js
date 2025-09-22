module.exports = {
  collectCoverage: false,
  coverageDirectory: "coverage",
  collectCoverageFrom: [
    "<rootDir>/src/js/**/*.js",
    "!<rootDir>/src/js/main.js", // Exclude main.js as it's an entry point
  ],
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
  coverageReporters: ["json", "lcov", "text", "clover"],
  testEnvironment: 'jsdom',
  transform: {
    '^.+\.jsx?$': 'babel-jest',
  },
  moduleNameMapper: {
    '^@services/api.js$': '<rootDir>/src/services/api.js',
    '^@app/services/api.js$': '<rootDir>/src/services/api.js',
    '^@app/services/(.*)$': '<rootDir>/src/js/services/$1',
    '^@services/(.*)$': '<rootDir>/src/js/services/$1',
    '^@app/managers/(.*)$': '<rootDir>/src/js/managers/$1',
    '^@managers/(.*)$': '<rootDir>/src/js/managers/$1',
    '^@app/components/(.*)$': '<rootDir>/src/js/components/$1',
    '^@components/(.*)$': '<rootDir>/src/js/components/$1',
    '^@app/utils/(.*)$': '<rootDir>/src/js/utils/$1',
    '^@utils/(.*)$': '<rootDir>/src/js/utils/$1',
    '\.css$': '<rootDir>/__mocks__/styleMock.js',
    '^NewSearchModal$': '<rootDir>/src/js/components/NewSearchModal.js',
  },
  moduleDirectories: ["node_modules", "<rootDir>/src/js"]
};
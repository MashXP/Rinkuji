module.exports = {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\.js$': 'babel-jest',
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
  collectCoverageFrom: [
    '<rootDir>/src/**/*.{js,jsx,ts,tsx}'
  ],
  moduleDirectories: ["node_modules", "<rootDir>/src/js"]
};

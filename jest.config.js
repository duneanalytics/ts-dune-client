module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.spec.ts'], // Adjust the testMatch pattern as needed
  moduleFileExtensions: ['ts', 'js'],
  testTimeout: 10000
};
export default {
  testEnvironment: "node",
  setupFilesAfterEnv: ["./src/tests/setup.js"],
  transform: {}, // Disable Babel transformation for ESM
};

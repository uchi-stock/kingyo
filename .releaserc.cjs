const { buildReleaseConfig } = require("./release-config.cjs");

module.exports = buildReleaseConfig({
  repositoryUrl: "https://github.com/uchi-stock/kingyo.git",
  gitAssets: ["CHANGELOG.md", "package.json", "package-lock.json"],
});

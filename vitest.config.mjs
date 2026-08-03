import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// The device app imports the `@zos/*` modules the watch provides, which do not
// exist under Node. Point them at the fakes in test/zos so the page - the screen
// flow, the redraws, the gestures - can be driven by a unit test instead of only
// by a thumb on a watch.
function zos(name) {
  return fileURLToPath(new URL(`./test/zos/${name}.js`, import.meta.url));
}

export default defineConfig({
  resolve: {
    alias: {
      "@zos/ui": zos("ui"),
      "@zos/device": zos("device"),
      "@zos/settings": zos("settings"),
      "@zos/interaction": zos("interaction"),
      "@zos/display": zos("display"),
      "@zos/storage": zos("storage"),
    },
  },
  test: {
    include: ["test/**/*.test.mjs"],
  },
});

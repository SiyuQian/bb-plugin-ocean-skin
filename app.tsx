// Ocean Skin frontend: one content script that mounts the skin (skin.ts) in
// every bb window and removes it when the plugin is disabled or reloaded.
import { definePluginApp } from "@get-bb/plugin-sdk/app";
import { BACKGROUNDS, mountSkin } from "./skin.ts";

export default definePluginApp((app) => {
  app.contentScripts.register({
    id: "ocean-skin",
    mount: ({ pluginId }) =>
      mountSkin(BACKGROUNDS.map((name) => `/api/v1/plugins/${pluginId}/http/${name}`)),
  });
});

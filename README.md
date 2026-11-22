# KasraCode for OpenCode V2

This server plugin discovers the models available to your KasraCode account at `https://code.kasracloud.ir/v1/models`. It targets OpenCode 2.3.2.

1. Place this directory next to `opencode.jsonc` and run `bun install --frozen-lockfile` in the plugin directory.
2. Add `"./kasracode"` to the config's `plugins` array:

   ```jsonc
   {
     "$schema": "https://opencode.ai/config.json",
     "plugins": ["./kasracode"]
   }
   ```

3. In OpenCode, select **KasraCode** in `/connect` and enter your API key, or supply `KASRA_API_KEY` in the OpenCode server's environment.
4. Open `/models` and select an available chat model. The reference is `kasracode/<exact model ID>`, including any slashes in the ID.

The plugin refreshes on load, on credential changes, and every five minutes. Each successful response replaces the previous inventory, including when `data` is empty. A temporary failure keeps the last successful inventory for that connection. To troubleshoot an empty list, check the server log for `KasraCode model discovery failed`; HTTP 401/403 indicates the key or its permissions should be checked.

Chat models that advertise the Responses API use OpenCode's Responses runtime. Image and video entries retain their type and are not offered for chat. Entries marked hidden or unsupported by the API are omitted. `/tmp/models.json` is only a development fixture; the plugin does not read it.

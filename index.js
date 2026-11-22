import { Integration, Plugin, Provider } from "@opencode/plugin"
import { baseURL, chatPackage, parseCatalog, providerID } from "./catalog.js"

export default Plugin.define({
  id: "kasracode",
  async setup(ctx) {
    const integrationID = Integration.ID.make(providerID)
    await ctx.integration.transform(editor => {
      editor.update(integrationID, integration => { integration.name = "KasraCode" })
      editor.method.update({ integrationID, method: { type: "key", label: "KasraCode API key" } })
      editor.method.update({ integrationID, method: { type: "env", names: ["KASRA_API_KEY"] } })
    })

    const info = { ...Provider.Info.empty(providerID), integrationID, name: "KasraCode", package: chatPackage, settings: { baseURL } }
    let inventory = { models: [] }
    await ctx.provider.transform(editor => editor.add({ info, ...inventory }))

    // Only the latest refresh may publish. Never persist keys or put them in the registry.
    const lifetime = new AbortController()
    let pending
    const refresh = async () => {
      pending?.abort()
      const controller = new AbortController()
      pending = controller
      const signal = AbortSignal.any([controller.signal, lifetime.signal, AbortSignal.timeout(15000)])
      let status
      try {
        const connection = await ctx.integration.connection.active(integrationID)
        const credential = connection && await ctx.integration.connection.resolve(connection)
        let models = []
        if (credential?.type === "key") {
          const response = await fetch(`${baseURL}/models`, {
            headers: { Authorization: `Bearer ${credential.key}` }, redirect: "error", signal,
          })
          status = response.status
          if (!response.ok) throw new Error("Discovery failed")
          models = parseCatalog(await response.json())
        }
        if (signal.aborted) return
        inventory = { models, sourceConnection: connection }
        await ctx.provider.reload()
      } catch {
        if (controller.signal.aborted || lifetime.signal.aborted) return
        console.warn(`KasraCode model discovery failed${status ? ` (HTTP ${status})` : ""}; check the connection and API key.`)
      }
    }

    const events = ctx.event.subscribe({ types: ["credential.updated", "credential.switched"], signal: lifetime.signal })
    void (async () => {
      for await (const event of events) if (event.data.integrationID === integrationID) void refresh()
    })().catch(() => { if (!lifetime.signal.aborted) console.warn("KasraCode credential watcher stopped; periodic refresh remains active.") })
    void refresh()
    const timer = setInterval(refresh, 5 * 60000)
    return () => { clearInterval(timer); lifetime.abort() }
  },
})

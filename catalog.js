import { Model, Provider } from "@opencode/plugin"

export const providerID = Provider.ID.make("kasracode")
export const baseURL = "https://code.kasracloud.ir/v1"
export const chatPackage = "@opencode/ai/providers/openai-compatible"

const positive = n => Number.isSafeInteger(n) && n > 0
const strings = xs => Array.isArray(xs) ? xs.filter(x => typeof x === "string" && x.length) : []
const price = n => Number.isFinite(n) && n >= 0

export function parseCatalog(payload) {
  if (!Array.isArray(payload?.data)) throw new Error("Missing model list")
  const models = new Map()
  for (const row of payload.data) {
    if (typeof row?.id !== "string" || !row.id.trim() || row.id.includes("#")) continue
    if (row.supported_in_api === false || row.visibility === "hide") continue
    const model = Model.Info.default(providerID, Model.ID.make(row.id))
    const caps = row.capabilities ?? {}
    model.type = row.type ?? "chat"
    model.name = row.name || row.id
    if (row.family) model.family = row.family
    const released = Date.parse(row.release_date)
    if (Number.isFinite(released)) model.time = { released }
    model.package = row.api_format === "responses" || row.supported_endpoints?.includes("responses")
      ? `${chatPackage}/responses` : chatPackage
    model.capabilities = {
      tools: caps.tool_calling === true,
      input: row.input_modalities ? strings(row.input_modalities) : ["text"],
      output: row.output_modalities ? strings(row.output_modalities) : ["text"],
      ...(typeof caps.temperature === "boolean" && { temperature: caps.temperature }),
    }
    model.variants = strings(caps.effort_tiers).filter(e => e !== "default")
      .map(id => ({ id, settings: { reasoningEffort: id } }))
    if (positive(row.max_input_tokens)) model.limit.input = row.max_input_tokens
    if (positive(row.context_length ?? row.max_input_tokens)) model.limit.context = row.context_length ?? row.max_input_tokens
    if (positive(row.max_output_tokens)) model.limit.output = row.max_output_tokens
    const p = row.pricing
    if (price(p?.input) && price(p?.output)) {
      model.cost = [{ input: p.input, output: p.output, cache: { read: p.cached ?? 0, write: p.cache_creation ?? 0 } }]
    }
    models.set(row.id, model)
  }
  return [...models.values()]
}

import { Plugin } from "@opencode/plugin"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

/**
 * Scope guard.
 *
 * The kit's rule is "only the targets you were given". This plugin turns that
 * into a check for `shell` and `webfetch`: every host found in a command or
 * URL must appear in .opencode/targets.json, with an authorization note.
 *
 * It is deliberately conservative and deliberately incomplete:
 *   - commands with no detectable host are allowed (it cannot see intent);
 *   - a tunnel to an allowed host can still reach anything that host can;
 *   - loopback is allowed by default (local services), disable with
 *     "allow_loopback": false.
 *
 * A target's stated policy about agents is NOT checked here. That is a human
 * decision: the harness surfaces the wording and stops (see AGENTS.md).
 */

const LOOPBACK = new Set(["localhost", "127.0.0.1", "::1", "[::1]"])

function loadTargets(root) {
  const candidates = [
    join(root, ".opencode", "targets.json"),
    join(root, "targets.json"),
  ]
  for (const path of candidates) {
    if (!existsSync(path)) continue
    try {
      const parsed = JSON.parse(readFileSync(path, "utf8"))
      return {
        allow: Array.isArray(parsed.allow) ? parsed.allow : [],
        allow_loopback: parsed.allow_loopback !== false,
      }
    } catch (error) {
      return { allow: [], allow_loopback: false, error: String(error) }
    }
  }
  // No allowlist file: fail closed, nothing remote is permitted.
  return { allow: [], allow_loopback: true }
}

function hostAllowed(entry, host, port) {
  const h = String(host).toLowerCase()
  const pattern = String(entry.host || "").toLowerCase()
  if (!pattern) return false
  const matched = pattern.startsWith("*.")
    ? h === pattern.slice(2) || h.endsWith(pattern.slice(1))
    : h === pattern
  if (!matched) return false
  if (!Array.isArray(entry.ports) || entry.ports.length === 0) return true
  if (port == null) return true // host-level trust; ports refine nothing
  return entry.ports.map(Number).includes(Number(port))
}

function hostsFromUrl(resource) {
  try {
    const url = new URL(resource)
    const port = url.port ? Number(url.port) : url.protocol === "https:" ? 443 : 80
    return [{ host: url.hostname, port }]
  } catch {
    return []
  }
}

// Commands networks: `nc host port`, `ssh user@host -p N`, `curl https://host`.
// Heuristic on purpose: unknown shapes fall through to "allowed".
function hostsFromCommand(command) {
  const found = []

  for (const m of command.matchAll(/(?:https?|ftp):\/\/([^\s'"\/:?#]+)(?::(\d+))?/gi)) {
    found.push({ host: m[1], port: m[2] ? Number(m[2]) : null })
  }

  const tools = /\b(nc|ncat|netcat|ssh|scp|telnet|redis-cli|mysql)\b([^\n|;&]*)/gi
  for (const m of command.matchAll(tools)) {
    const tool = m[1].toLowerCase()
    const args = m[2].trim().split(/\s+/).filter(Boolean)
    for (let i = 0; i < args.length; i++) {
      const arg = args[i]
      if (arg.startsWith("-")) {
        if ((arg === "-p" || arg === "-P") && args[i + 1]) {
          // port for the previous host; handled below
        }
        continue
      }
      const hp = arg.match(/^(?:[^@]+@)?(\[[^\]]+\]|[A-Za-z0-9_.-]+)(?::(\d+))?$/)
      if (!hp) continue
      const host = hp[1].replace(/^\[|\]$/g, "")
      const looksLikeHost =
        /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(".") || LOOPBACK.has(host.toLowerCase())
      if (!looksLikeHost) continue
      let port = hp[2] ? Number(hp[2]) : null
      if (port == null && /^\d+$/.test(args[i + 1] || "")) port = Number(args[i + 1])
      const pIdx = args.indexOf("-p", i + 1)
      if (port == null && pIdx !== -1 && /^\d+$/.test(args[pIdx + 1] || "")) port = Number(args[pIdx + 1])
      found.push({ host, port })
      break
    }
    void tool
  }

  return found
}

export default Plugin.define({
  id: "workshop.scope-guard",
  async setup(ctx) {
    const root = ctx.location.directory

    await ctx.permission.hook("evaluate", async (event) => {
      if (event.action !== "shell" && event.action !== "webfetch") return

      const targets = loadTargets(root)
      const loopback = targets.allow_loopback

      for (const resource of event.resources) {
        const hosts =
          event.action === "webfetch"
            ? hostsFromUrl(resource)
            : hostsFromCommand(String(resource))

        for (const { host, port } of hosts) {
          if (loopback && LOOPBACK.has(String(host).toLowerCase())) continue
          const ok = targets.allow.some((entry) => hostAllowed(entry, host, port))
          if (!ok) {
            event.effect = "deny"
            event.message =
              `scope-guard: ${host}${port ? ":" + port : ""} is not in ` +
              ".opencode/targets.json. Add it (with an authorization note) " +
              "only if you are allowed to test it."
            return
          }
        }
      }
    })
  },
})

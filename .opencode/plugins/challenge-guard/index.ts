import { Plugin } from "@opencode/plugin"

/**
 * Challenge guard.
 *
 * OpenCode is started inside a challenge folder, so ctx.location.directory is
 * that folder. This plugin turns the workshop convention into a real check:
 *
 *   - `edit`/`write`/`patch` targets must stay under the start directory
 *   - `files/` is read-only input; work on copies in `work/`
 *
 * Permission resources may be absolute or relative to the location, so paths
 * are normalized before comparison. It only evaluates `edit` actions; reads,
 * shell and the rest are untouched. If a session is started at the repo root,
 * the whole repo is writable, which keeps kit maintenance working.
 */

function normalize(input: string, root: string): string {
  const absolute = input.startsWith("/") ? input : `${root}/${input}`
  const parts: string[] = []
  for (const part of absolute.split("/")) {
    if (part === "" || part === ".") continue
    if (part === "..") {
      parts.pop()
      continue
    }
    parts.push(part)
  }
  return `/${parts.join("/")}`
}

export default Plugin.define({
  id: "workshop.challenge-guard",
  async setup(ctx) {
    const root = normalize(ctx.location.directory, "/")

    await ctx.permission.hook("evaluate", async (event) => {
      if (event.action !== "edit") return

      for (const resource of event.resources) {
        const target = normalize(resource, root)

        if (target !== root && !target.startsWith(`${root}/`)) {
          event.effect = "deny"
          event.message =
            `Writes are limited to the current folder (${root}). ` +
            "Put artifacts in work/ and results in solution/."
          continue
        }

        if (target === `${root}/files` || target.startsWith(`${root}/files/`)) {
          event.effect = "deny"
          event.message =
            "files/ is read-only input. Copy the challenge file into work/ and modify the copy."
        }
      }
    })
  },
})

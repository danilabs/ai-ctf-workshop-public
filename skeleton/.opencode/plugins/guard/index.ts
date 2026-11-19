import { Plugin } from "@opencode/plugin"

/**
 * Guard plugin — step 8.
 *
 * TODO: register a permission hook that denies edits outside the start
 * directory and inside `files/`. Normalize relative paths, `..`, absolute
 * paths and sibling prefixes before comparing (`/a/b-evil` vs `/a/b`).
 *
 * Then write an offline test next to `scripts/` that loads this plugin with a
 * stubbed host module and asserts the deny/allow matrix.
 */
export default Plugin.define({
  id: "workshop.guard",
  async setup(ctx) {
    // await ctx.permission.hook("evaluate", async (event) => { ... })
  },
})

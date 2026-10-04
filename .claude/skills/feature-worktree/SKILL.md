---
name: feature-worktree
description: Work on a TODO.md item or any Strobe feature in its own git branch and worktree, never in the main checkout. Use whenever the user asks to start, continue, implement, fix or try out a TODO item or a feature, before touching any code, and when the work is done to merge it back into main.
---

# One feature, one branch, one worktree

Talk to the user in French. Branch names, commits and TODO.md stay in English, like the rest of the project.

The main checkout (`/Users/nicolasmarlier/perso/strobe`) is shared: other sessions and the user's own changes may be sitting in it. A feature never gets coded there. Each TODO item gets its own branch and its own worktree under `.claude/worktrees/` (git-ignored), and every edit, build and test for that feature happens in that worktree.

## Starting a feature

1. Pick a short kebab-case name from the item (e.g. `shortcuts`, `crash-monitoring`). The branch and the worktree folder share it.
2. If `git worktree list` already shows it, reuse it: work in that folder, don't recreate it.
3. Otherwise create it from `main`:
   `git worktree add -b <name> .claude/worktrees/<name> main`
4. Install the dependencies in the worktree (`yarn install` there), since `node_modules` isn't shared.
5. In TODO.md, mention the branch on the item, e.g. `- [ ] Crash monitoring (\`crash-monitoring\` branch)`.
6. From then on, use absolute paths inside `.claude/worktrees/<name>` for every read, edit and command. Never edit the same files in the main checkout.

## While working

- Commit in the worktree, on the feature branch, when the user asks or when a step is validated.
- Sub-steps worth remembering go as indented lines under the item in TODO.md, with "(done)" when they are.

## Finishing

When the user says the feature is done or validated:
1. Merge it into `main` with a merge commit, in the style of the history: `Merge <name>: <what it brings>`.
2. Check the item off in TODO.md.
3. Remove the worktree (`git worktree remove .claude/worktrees/<name>`) and delete the branch, after checking nothing uncommitted is left in it. Ask first if anything is.

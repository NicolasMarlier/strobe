# Strobe

Strobe is a macOS app (Electron) that drives a band's stage lights (DMX) in sync with its tracks and MainStage. It's made for maad avenue, the user's band.

## At the start of every session

We're working on the same project from one session to the next, and `TODO.md` is the shared plan. In your first reply of a session, whatever the first message is:

1. Read `TODO.md`, and look at `git log` and the open worktrees (`git worktree list`) to see what's in progress.
2. Briefly say where things stand: what's been merged but not released yet (compare with the latest GitHub release, `gh release list -L 1`), and what's started but not finished.
3. Suggest two or three things to work on next, with one recommendation and why. Keep it short.

Then do what the user asked, if they asked for something.

## Working conventions

- `TODO.md`: Claude maintains it. Only add what the user asks for, and check items off when they're done.
- Each feature or TODO item gets its own branch and worktree: the feature-worktree skill.
- Releases: the deploy skill. Stats: the stats skill.
- The user speaks French: reply in French. The code, commits and `TODO.md` are in English.

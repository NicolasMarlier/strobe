---
name: deploy
description: Release a new version of Strobe — bump the version (minor by default, patch or major), write the release notes, build the signed and notarized installer, publish it as a GitHub release, update the README's "What's new" and the CHANGELOG, update the version shown on the website (sibling repo strobe-website), and install the released app on this Mac. Use when the user asks to deploy, release, ship or publish a new version of Strobe.
---

# Deploy a new version of Strobe

Talk to the user in French. Everything written in the repos (commits, release notes, README, website) stays in English, like the rest of the project.

Paths:
- App repo: `/Users/nicolasmarlier/perso/strobe` (GitHub `NicolasMarlier/strobe`)
- Website repo: `/Users/nicolasmarlier/perso/strobe-website` (GitHub `NicolasMarlier/strobe-website`, deployed by Vercel on push to `main`, served at https://strobe-website.vercel.app)
- Public download link, the same for every version: https://github.com/NicolasMarlier/strobe/releases/latest/download/Strobe.dmg. The website and the README link to it, so they never need a new link: only the version number shown.

The scripts do the heavy lifting, read them before the first run: `bin/release` (signed and notarized build), `bin/publish` (GitHub release). `bin/deploy` only installs a local, unsigned build in /Applications: it is not part of a release.

## 1. Checks, before touching anything

Stop and tell the user at the first failure:

- App repo: on `main`, nothing uncommitted (`git status --porcelain` empty, untracked `.claude/` aside), and `main` level with `origin/main` after `git fetch` (ahead is fine: step 5 pushes it; behind or diverged: ask).
- No other worktree or branch holding work meant for this release (`git worktree list`, `git branch`): ask if there is one.
- Website repo: on `main`, nothing uncommitted, level with `origin/main`.
- `gh auth status` works.
- `yarn lint` and `yarn vitest run` pass. Lint warnings are fine, errors are not.

`bin/release` checks the signing certificate and the notarization credentials itself.

## 2. The new version

Read the current version from `package.json` and the last tag (`git describe --tags --abbrev=0`). Ask with AskUserQuestion:

- **Minor (Recommended)**: `X.Y.Z` → `X.(Y+1).0`. The default: new features.
- **Patch**: `X.Y.Z` → `X.Y.(Z+1)`. Fixes only, nothing new to learn.
- **Major**: `X.Y.Z` → `(X+1).0.0`.

Show the resulting number in each option's label, e.g. `Minor — 0.4.0`. If every change since the last tag is a fix, say so and recommend Patch instead.

## 3. Release notes

From `git log <last tag>..HEAD`, plus the diffs where a message is unclear, write the notes for the people who use Strobe, not for developers:

- Leave out what users never see: `TODO:` commits, refactors, tooling, tests, the release scripts.
- Group under `### New`, `### Improved`, `### Fixed`; drop an empty group.
- One bullet per change a user would notice, starting with a bold short name: `- **Follow the cursor:** while the show plays, the track automation turns its pages to keep the cursor in sight.` Merge commits that are steps of one feature into one bullet.
- Plain, concrete words, like the README's. No commit hashes.

Write them to `out/release-notes-<version>.md` (in `out/`, which git ignores), starting with `## What's new in <version>`, then show them to the user and wait for their go or their changes. Rewrite until they approve.

## 4. README and CHANGELOG

The README holds the latest version's notes, between two markers, right after the `## Download` section and before `## What it does`:

```markdown
<!-- whats-new:start -->
## What's new in 0.4.0

### New
- ...

Older versions: on the [releases page](https://github.com/NicolasMarlier/strobe/releases).
<!-- whats-new:end -->
```

Replace what's between the markers (add the block there if the markers aren't there yet). The version in the feedback section's example (`Version 0.2.0 (306faf2)`) stays as is: it's an example.

`CHANGELOG.md` keeps every version, newest first. Add the new one right under the intro, as `## <version> — <today, YYYY-MM-DD>` followed by the approved notes' groups (`### New`…), the same text as the release.

## 5. Bump, commit, push

- `package.json`: set `"version"` (`npm pkg set version=<version>`). Nothing else holds the version: the About window reads it from the app.
- One commit with the three files (`package.json`, `README.md`, `CHANGELOG.md`): `Version <version>`, ending with the attribution lines the session gives for commits.
- Confirm with the user before the first outward step, in one question that lists all of them: push `main`, publish the GitHub release (public, tagged `v<version>`), push the website (Vercel puts it online). Their yes covers steps 5 to 8 of this run.
- `git push origin main`: `bin/publish` only tags a commit that is on `origin/main`.

## 6. Build: signed and notarized

`bin/release`, in the background (`run_in_background`, timeout 2 hours): the build plus Apple's notarization takes from a few minutes to much longer. Wait for its notification, never poll in a loop.

It ends on `Ready to share: …/out/make/Strobe-<version>-arm64.dmg`. On a failure, show the end of its output and stop: a notarization rejection gives a submission id, `xcrun notarytool log <id> --keychain-profile strobe-notary` says why.

## 7. GitHub release

`bin/publish out/release-notes-<version>.md`. It tags `v<version>` on the built commit, uploads `Strobe.dmg` and the update ZIP (`Strobe-darwin-arm64-<version>.zip`, which the installed apps update from), appends how to install to the notes, and marks the release as latest.

Check: `gh release view v<version> --repo NicolasMarlier/strobe`, and the public link now leads to the new tag (`curl -sI https://github.com/NicolasMarlier/strobe/releases/latest/download/Strobe.dmg`: its `location` names `v<version>`). The update feed offers it to the previous version: `curl -s https://update.electronjs.org/NicolasMarlier/strobe/darwin-arm64/<previous version>` gives a JSON whose `name` is `Strobe <version>` (the service caches the releases: it can take a few minutes).

## 8. Website

In the website repo:

- `index.html`: the hero's `Version <old> · Apple silicon · …` line takes the new version. Search the whole repo for the old number (`grep -rn "<old version>"`) for any other spot.
- Commit `Strobe <version>`, with the attribution lines, then `git push origin main`.
- Vercel deploys within a minute or two: check that https://strobe-website.vercel.app shows `Version <version>` (`curl -s … | grep`), a few times at most, a minute apart.

## 9. Website screenshots

The website shows screenshots of the app (`assets/screenshots/` and `assets/mainstage/`, used in `index.html` and `mainstage/`) and a feature list. Go through the approved notes: for each change a user would see on screen (a new mode, a panel that moved, a new button), name the screenshot or the feature-list item it makes outdated. Tell the user which ones, and why. Change nothing without their go; a feature-list item, you may rewrite once they agree. Nothing outdated: say so in one line.

Screenshots to redo are taken from the released app, after step 10 has installed it:

1. Launch it with the debugging port: `open -a /Applications/Strobe.app --args --remote-debugging-port=9222` (quit it first if it runs), and check `curl -s http://127.0.0.1:9222/json/list` lists the `STROBE` page.
2. The user sets the stage: their show open, playback on a busy passage (several lights lit, fog), no DMX button selected (its link labels clutter the scene) unless a capture needs its details panel, a pattern selected so the overview shows the note editor.
3. On their go, `node .claude/skills/deploy/capture.mjs <scratchpad>/shots 8 1.5`: 8 rounds 1.5 s apart of `overview-N` (1440×900), `scene-N` and `cues-N` (the sections of a 1680×1050 window) and `narrow-N` (560×900), all at 2x. It lays the page out at each size by emulation, without touching the user's window.
4. Make contact sheets (`magick montage …`), look at them, recommend the best of each, and open the folder for the user (`open <dir>`). Several tries are normal: lights flash on and off.
5. Once they pick: `cwebp -q 85` into `assets/screenshots/` (the overview resized to 2048×1280 first), update each `<img>`'s `width`, `height` and `alt` in `index.html`, preview the site locally (`python3 -m http.server`, then `open`), and commit and push the website after their go.

## 10. Install the released version on this Mac

The released installer, the one users get: not `bin/deploy`, which builds an unsigned local copy.

- Strobe running from `/Applications/Strobe.app`: ask the user to quit it, and wait.
- Download the public link to a temporary folder, mount it (`hdiutil attach -nobrowse -readonly`), copy `Strobe.app` next to the installed one (`ditto` into `/Applications/.Strobe.app.installing`), swap it in for the old one, then detach the image.
- Check: `defaults read /Applications/Strobe.app/Contents/Info.plist CFBundleShortVersionString` gives `<version>`, and `spctl --assess --type execute --verbose /Applications/Strobe.app` accepts it (`source=Notarized Developer ID`).

## 11. Wrap up

Tell the user, in French and briefly: the version, the release link, the public download link, what changed on the website, the installed app, and what's left (a check that failed, a screenshot to redo).

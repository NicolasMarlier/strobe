---
name: website-videos
description: Record the website's videos of Strobe (the overview, the 3D scene, the cues and the narrow window) by itself, from a released version and the bundled example show, with nobody at the keyboard, then put them on the website (sibling repo strobe-website). Use when the user asks to record, redo or update the website's videos, and at each release (the deploy skill's website step).
---

# The website's videos

Talk to the user in French. Everything written in the repos stays in English.

The home page of the website (`/Users/nicolasmarlier/perso/strobe-website`, `index.html`) shows short muted loops of the app, in `assets/videos/`: `overview` (the whole window), `scene` (the 3D stage) and `narrow` (the narrow window). Each comes with its poster, `<name>.webp`: its first frame, shown until it plays and to those who'd rather avoid motion. `script.js` plays the `.app-video`s only while on screen.

`cues` (a button edited: clicked, its color changed live, the scene showing each try) is recorded too, but not on the website yet: while a button is selected, the scene shows its links (white outlines, "Link all") over the effect, which hides the color. It waits for the app to show the effect playing instead (see TODO.md); until then the cues section keeps its screenshot (`assets/screenshots/cues.webp`).

`record.mjs`, next to this file, records them all by itself: the user doesn't need to do anything, nor to quit their own Strobe.

## 1. The app to film

Always a released version, the one users get: by default the latest. Download its installer to the scratchpad and mount it, read-only:

```
curl -sL -o <scratchpad>/Strobe.dmg https://github.com/NicolasMarlier/strobe/releases/latest/download/Strobe.dmg
hdiutil attach -nobrowse -readonly -mountpoint <scratchpad>/mnt <scratchpad>/Strobe.dmg
```

(Another version: `releases/download/v<version>/Strobe.dmg`.)

## 2. Record

From the app repo: `node .claude/skills/website-videos/record.mjs <scratchpad>/mnt/Strobe.app <scratchpad>/videos`, in the background (5 to 10 minutes). Some of them only: `... <scratchpad>/videos 10 cues,scene` (the third argument is the passage's length in seconds).

What it does, so you can tell the user and debug it:
- It starts its own Strobe from the mounted app, next to the user's if it's open: its own profile (no usage statistics nor crash reports sent, the user's recent shows and settings untouched), the sound muted, the Chrome DevTools protocol on port 9223. Its window shows up on screen; the user can keep working, but must not quit it (Cmd+Q may quit both Strobes).
- It opens a copy of the example show (`assets/Example.strobe` from this repo, so a version without it bundled works too), and selects its first pattern so the overview shows the note editor.
- Scouting: it plays the whole track once and measures the scene's brightness on every frame, then picks the liveliest 10 seconds that keep to the website's flashing rule (no flashing faster than about twice a second, see `script.js` in the website).
- Then for each video: the page laid out at its size by emulation (overview 1440×900, scene as a section of 1680×1050, narrow 560×900, all at 2x), the track played from the start, and that passage filmed through the protocol's screencast. Encoded in H.264 at 60 fps (`.mp4`), each frame the captured one nearest to its time, with its poster (`.webp`).
- The cues video first, the track stopped: the buttons and the scene of a 1680×860 window, and a mouse pointer drawn in the page (the screencast doesn't show macOS's) acting out `editButton`: the D#1 button clicked, its color changed twice and the button clicked again each time, then a click in an empty spot closes its settings. macOS's color panel is a window the screencast can't see: the pointer clicks the color without the app getting the click, and the color is set as the panel would.
- Out, in `<scratchpad>/videos`: `<name>.mp4`, `<name>.webp`, `<name>-sheet.png` (4 frames of it) and `report.json` (the passage, each video's size, frame rate, weight and flashes).

If it fails, its log says at which step. Port 9223 taken: a recording is already running, or a Strobe of an earlier one was left open (`pkill -f remote-debugging-port=9223`).

## 3. Check

- Look at the contact sheets: lights on, nothing cut, no dialog over the app. For the cues, more frames than its sheet's 4 (`ffmpeg -ss <t>` every second or so): each click landing on its target, the settings closing at the end.
- In `report.json`: `maxSwingsPerSecond` at most 4 for the scene (the whole window counts more of them, it's informative only), each video under about 3 MB, `framesOnTime` (the share of its frames within 5 ms of their time: below about 0.8, the motion judders) as high as possible. The screencast sends frames irregularly, the more so the busier the Mac: record it idle if you can.
- Open the folder for the user (`open <scratchpad>/videos`) so they can watch them.

## 4. On the website

On the user's go:
1. Copy the `.mp4` and `.webp` files into the website's `assets/videos/`.
2. In `index.html`, each `<video class="app-video">` has the video's `width` and `height` (from `report.json`) and an `aria-label` saying what happens in it: update them if they changed.
3. Preview the site locally with a server that handles range requests, which Safari needs for video: `npx --yes http-server -p 8080 -c-1 -s .` from the website, then `open http://127.0.0.1:8080`.
4. Commit and push the website after the user's go. Vercel deploys it.

Then unmount the installer (`hdiutil detach <scratchpad>/mnt`).

# Changelog

What changed in each version of Strobe. The installers are on the [releases page](https://github.com/NicolasMarlier/strobe/releases).

## 0.6.0 — 2026-10-04

### New
- **Example show:** new to Strobe? Open the example show from the Welcome screen or File › Open Example Show: the first 100 seconds of maad avenue's "Dead In My Head", with its lights, buttons, MIDI patterns and stage. It opens as an unsaved copy: the first Save asks where to keep it, and copies its audio along.
- **Automatic updates:** new versions download in the background and are installed the next time Strobe starts, never during a show. Strobe › Check for Updates… looks right away, and Strobe › Restart to Install installs a downloaded version at once. From this version on, you won't need to download Strobe again.

### Improved
- **Keyboard shortcuts:** every shortcut is now in the menus, to be found: a new Pattern menu (Split T, Join J, Loop L), Copy, Paste, Delete and Select All on patterns and notes in the Edit menu, one beat back or forward and the previous or next track in the Playback menu, and View › Show / Hide Setlist (⌘\). The timeline shows the keys that apply right now: the cursor's when nothing is selected, the selection's otherwise.
- **Switch tracks with the setlist hidden:** ↑ and ↓ go to the previous or next track even when the setlist is collapsed.

## 0.5.0 — 2026-10-04

### New
- **Seek while playing:** click in the timeline, or use the arrows, Return or Back to Start, and the cursor jumps there while the show keeps playing, the audio with it. Over the timeline, the mouse becomes a playhead and a faint cursor shows where a click will land.
- **MainStage in charge:** while MainStage drives playback, a pulsing MainStage badge glows next to the transport, and Play, Space and Back to Start are greyed out so the two can't fight. Strobe's own playback stops when MainStage starts.
- **Playback menu:** Play / Pause (Space) and Back to Start (Return), with the shortcuts also shown in the transport buttons' tooltips.
- **Show file icon:** show files have their own icon, in the Finder and in the window's title bar.
- **Anonymous usage statistics and crash reports:** Strobe sends which features are used and the crashes it hits, never a show's or a track's name, nor any content. Turn it off in Strobe › Share Anonymous Usage Statistics and Crash Reports. The README's Privacy section lists exactly what is sent.

### Improved
- **Window title:** before any show is open, the window is just titled STROBE, not "Untitled".

## 0.4.0 — 2026-10-03

### New
- **Follow the cursor:** while the show plays, the track automation turns its pages to keep the cursor in sight. Scroll away by hand and it stays where you put it, until the cursor shows in the view again or you press Play.
- **Narrow window:** under 800 pixels wide, Strobe shows a single column made for playing a show. The top bar holds the current track, a click on it opens the setlist, and a dot each for MIDI and DMX. Below come a low track automation, the buttons and the scene. Buttons play without being selected, and editing waits for a wider window.
- **Camera motion:** the 3D scene's camera drifts slightly while the show plays. It can be turned off in the scene's display settings.

### Improved
- **Darker unlit lights:** a light that is off now looks off, and a lens dims smoothly down to dark.

## 0.3.0 — 2026-10-01

### New
- **Show files are Mac documents:** a show is one file in the Finder, opened by a double-click or by dropping it on Strobe's Dock icon.
- **About Strobe:** shows the version and the exact build it comes from, to give when reporting a bug.
- **Connect to MainStage:** a link under the Interfaces section, to the website's guide on driving Strobe from MainStage.

## 0.2.0 — 2026-10-01

The first public version: setlist, DMX buttons triggered by a MIDI controller, 3D scene, show files, undo and redo.

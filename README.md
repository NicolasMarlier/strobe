# Strobe

**A DMX show runner on your MacBook.**

Strobe drives the lights of a live show from a Mac: build a setlist of tracks, place your lights in a 3D view of the stage, and fire light effects from buttons or a MIDI controller, in time with the music. It talks to the lights through an [Enttec Open DMX USB](https://www.enttec.com/product/dmx-usb-interfaces/open-dmx-usb/) interface.

It was made for the live shows of the band maad avenue, and it's free for anyone to use.

## Download

**[Download Strobe for macOS](https://github.com/NicolasMarlier/strobe/releases/latest/download/Strobe.dmg)**

Open `Strobe.dmg`, then drag Strobe into Applications. The app is signed and notarized by Apple, so it opens without a warning.

- **Mac:** Apple silicon (M1 and later). Intel Macs aren't supported yet.
- **DMX interface:** an Enttec Open DMX USB, plugged into the Mac.
- **MIDI controller (optional):** any controller macOS sees, to trigger effects from pads or keys.

All versions and their notes are on the [releases page](https://github.com/NicolasMarlier/strobe/releases).

## What it does

- **Setlist:** the show's tracks, each with its audio, played from Strobe.
- **DMX buttons:** each button lights a set of cells (the dots of a LED bar, a fog machine…) with a color and an effect: Boom, Set, Run, InverseRun, Toggle.
- **MIDI:** any button can be triggered by a key of a MIDI controller.
- **3D scene:** your lights placed on a stage, showing live what the DMX output does, fog included.
- **Show files:** a show is a `.strobe` folder holding its settings and audio, to save, copy and open on another Mac.
- **Undo and redo** for the whole show (Cmd+Z, Cmd+Shift+Z).

## Feedback

Feedback, bug reports and ideas are very welcome. They all go to **[GitHub Issues](https://github.com/NicolasMarlier/strobe/issues)**:

1. Check whether an [open issue](https://github.com/NicolasMarlier/strobe/issues) already covers it. If one does, add your case as a comment, or a 👍.
2. Otherwise, [open a new issue](https://github.com/NicolasMarlier/strobe/issues/new), with:
   - **Your version:** in **Strobe › About Strobe**, e.g. `Version 0.2.0 (306faf2)`. The code in parentheses tells exactly which build you run.
   - **Your setup:** Mac model, macOS version, DMX interface, MIDI controller and lights.
   - **For a bug:** what you did, what you expected, and what happened instead. A screenshot or a short screen recording helps a lot. If it's about a show, you can attach its `.strobe` folder, zipped.
   - **For an idea:** what you're trying to do in your show, more than the feature you have in mind.

## Fixture plugins: add your own devices

Strobe knows each kind of device it drives, a **fixture**, from a small description: its shape and size in the 3D scene, and what each of its DMX channels does. LED bars and a fog machine come built in. Any other device can be added as a **fixture file**, without changing the app.

### Adding a fixture file

1. In Strobe, choose **File › Open Fixtures Folder**. On macOS, the folder is `~/Library/Application Support/Strobe/Fixtures`.
2. Add a JSON file there, one fixture per file, e.g. `rgbw-par.json`:

   ```json
   {
     "id": "rgbw-par",
     "name": "RGBW par",
     "shape": "box",
     "size": [0.25, 0.25, 0.2],
     "cell": ["red", "green", "blue", "white"],
     "cells": 1
   }
   ```

3. The fixture shows up right away among the elements you can add to the scene, with no need to restart. If a file has a mistake, the element list says which file and what's wrong.

### The fields

A fixture is a row of identical **cells**: the dots of a LED bar, or the single head of a par. Each cell takes the channels of `cell`, in order, from the element's first DMX channel.

| Field | Required | What it is |
| --- | --- | --- |
| `id` | yes | Unique name of the fixture, e.g. `rgbw-par`. Shows store it: **never change it** once a show uses it. |
| `name` | yes | What the app calls it, e.g. `RGBW par`. |
| `shape` | yes | How it's drawn: `"bar"` (lenses across its whole front face) or `"box"` (a housing with smaller lenses or nozzles). |
| `size` | yes | Width, height and depth of the housing, in meters, e.g. `[1, 0.1, 0.06]`. |
| `cell` | yes | The channels of one cell, in DMX order. Each one is `red`, `green`, `blue`, `white` or `fog`. |
| `cells` | yes | How many cells a new element of this fixture has (at least 1). |
| `resizable` | no | `true` if each element sets its own number of cells, like LED bars of different lengths. |
| `cell_label` | no | What the cells are called in the element's settings, e.g. `Dots`. |

What each channel gets from a button's color, from 0 to 255:

- `red`, `green`, `blue`: that part of the color.
- `white`: what the three colors share, e.g. full on white, off on pure red.
- `fog`: the brightness of the color, so a white Boom is a burst of fog.

### Sharing a fixture

A show stores which fixture each element uses, but not the fixture file itself. To open a show on another Mac, copy its fixture files into that Mac's Fixtures folder too. Without them, its elements are drawn as plain RGB boxes, named `Unknown (<id>)`, and their channels keep working.

If a fixture could be useful to others, propose it for the app itself (see below).

## Adding a fixture to the app

Built-in fixtures are available in every Strobe, with no file to copy. To propose one:

1. Get the code running (see [Development](#development)).
2. Add your fixture to `BUILT_IN_FIXTURES` in [`src/shared/fixtures.ts`](src/shared/fixtures.ts). It has the same fields as a fixture file. Add it **at the end** of the list, and pick an `id` no other fixture uses, since shows store it forever.
3. Check that it's valid: `yarn vitest run`. The tests check every built-in fixture with the same rules as fixture files.
4. Try it with `yarn start`: add an element of your fixture to the scene and link a button to it. If you can, try it on the real device.
5. Open a [pull request](https://github.com/NicolasMarlier/strobe/pulls) that says what the device is, ideally with a link to its DMX chart.

The kinds of channel are `red`, `green`, `blue`, `white` and `fog`. A device that needs another one (amber, UV, a dimmer, pan and tilt…) needs code too, not just a new fixture: open an issue first, so we can agree on how it should work. These places in the code would change:

- `FixtureChannelKind` in [`src/types.d.ts`](src/types.d.ts)
- What the channel gets from a color, how it lights the 3D scene, and the checks on fixture files: `channelValue`, `cellLight` and `fixtureProfileErrors` in [`src/shared/fixtures.ts`](src/shared/fixtures.ts)

## Development

Strobe is an [Electron](https://www.electronjs.org/) app, written in TypeScript with React and three.js, and built with [Electron Forge](https://www.electronforge.io/).

You need Node.js 24 and Yarn 1.

```sh
yarn install
yarn start        # runs Strobe with live reload
yarn vitest run   # tests
yarn lint
```

To build Strobe and install it in `/Applications`, replacing the one there: `bin/deploy`.

## License

Strobe is released under the [MIT License](LICENSE): you can use it, change it and share it freely, including for paid shows, as long as the license notice stays with it.

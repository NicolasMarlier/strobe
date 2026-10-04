// Replaces usb/dist/usb/bindings.js in the main bundle (see webpack.main.config.ts).
// usb 2.x finds its native binary with node-gyp-build and a runtime path, which webpack
// can't follow. A plain require lets the asset relocator copy the binary Electron Forge
// rebuilds for Electron into the bundle.
module.exports = require('usb/build/Release/usb_bindings.node');

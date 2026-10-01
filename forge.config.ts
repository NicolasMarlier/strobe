import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDMG } from '@electron-forge/maker-dmg';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { WebpackPlugin } from '@electron-forge/plugin-webpack';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';

import { mainConfig } from './webpack.main.config';
import { rendererConfig } from './webpack.renderer.config';

// Set by bin/release
const release = !!process.env.STROBE_RELEASE;
// Notarization credentials (App Store Connect API key), stored in the keychain once with:
// xcrun notarytool store-credentials strobe-notary --key <AuthKey.p8> --key-id <Key ID> --issuer <Issuer ID>
const NOTARY_PROFILE = 'strobe-notary';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    // Extension is resolved per platform: icon.icns (macOS), icon.ico (Windows)
    icon: './assets/icon',
    // Never change it: macOS ties the app's permissions to it
    appBundleId: 'com.nicolasmarlier.strobe',
    // Releases only (bin/release): signed with the Developer ID certificate of the keychain, then notarized by Apple
    ...(release && {
      osxSign: {},
      osxNotarize: { keychainProfile: NOTARY_PROFILE },
    }),
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({ setupIcon: './assets/icon.ico' }),
    new MakerZIP({}, ['darwin']),
    // macOS installer: a disk image with Strobe and a link to drag it into Applications
    new MakerDMG({
      icon: './assets/icon.icns',
      format: 'ULFO',
      ...(release && { additionalDMGOptions: { 'code-sign': { 'signing-identity': 'Developer ID Application' } } }),
    }),
    new MakerRpm({ options: { icon: './assets/icon.png' } }),
    new MakerDeb({ options: { icon: './assets/icon.png' } }),
  ],
  plugins: [
    new AutoUnpackNativesPlugin({}),
    new WebpackPlugin({
      mainConfig,
      // Forge's default dev policy, plus loading the show's audio (show-audio://, see src/main/init/audio_protocol.ts)
      devContentSecurityPolicy: [
        "default-src 'self' 'unsafe-inline' data:",
        "script-src 'self' 'unsafe-eval' 'unsafe-inline' data:",
        "connect-src 'self' data: show-audio:",
        "media-src 'self' data: show-audio:",
      ].join('; '),
      renderer: {
        config: rendererConfig,
        entryPoints: [
          {
            html: './src/index.html',
            js: './src/renderer.ts',
            name: 'main_window',
            preload: {
              js: './src/preload.ts',
            },
          },
        ],
      },
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;

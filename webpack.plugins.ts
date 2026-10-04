import type IForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';
import { sentryWebpackPlugin } from '@sentry/webpack-plugin';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const ForkTsCheckerWebpackPlugin: typeof IForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version } = require('./package.json');

// The Strobe project of Sentry, where the crash reports go (see src/main/crash_reports.ts)
const SENTRY_ORG = '';
const SENTRY_PROJECT = '';

export const plugins = [
  new ForkTsCheckerWebpackPlugin({
    logger: 'webpack-infrastructure',
  }),
  // Releases only (bin/release, which gives the token): the source maps go to Sentry, which shows the crash
  // reports with Strobe's code rather than the minified one, and are then deleted, not shipped in the app
  ...(process.env.STROBE_RELEASE ? [sentryWebpackPlugin({
    org: SENTRY_ORG,
    project: SENTRY_PROJECT,
    authToken: process.env.SENTRY_AUTH_TOKEN,
    // The one the app reports with: its name and version (Sentry's default)
    release: { name: `Strobe@${version}`, setCommits: false },
    sourcemaps: { filesToDeleteAfterUpload: ['.webpack/**/*.map'] },
    telemetry: false,
  })] : []),
];

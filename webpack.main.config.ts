import path from 'path';
import { NormalModuleReplacementPlugin, type Configuration } from 'webpack';

import { rules } from './webpack.rules';
import { plugins } from './webpack.plugins';

export const mainConfig: Configuration = {
  /**
   * This is the main entry point for your application, it's the first file
   * that runs in the main process.
   */
  entry: './src/index.ts',
  // Put your normal webpack config below here
  module: {
    rules,
  },
  plugins: [
    ...plugins,
    // Load usb's native binary with a plain require (see src/main/usb_bindings.js)
    new NormalModuleReplacementPlugin(
      /[/\\]usb[/\\]dist[/\\]usb[/\\]bindings\.js$/,
      path.resolve(__dirname, 'src/main/usb_bindings.js'),
    ),
  ],
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css', '.json'],
  },
};

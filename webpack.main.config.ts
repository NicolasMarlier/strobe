import { execSync } from 'child_process';
import { DefinePlugin, type Configuration } from 'webpack';

import { rules } from './webpack.rules';
import { plugins } from './webpack.plugins';

const currentCommit = () => {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: __dirname }).toString().trim();
  } catch {
    return 'unknown';
  }
};

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
    // The commit shown in the About panel (see src/main/init/about.ts)
    new DefinePlugin({ STROBE_COMMIT: JSON.stringify(currentCommit()) }),
  ],
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css', '.json'],
  },
};

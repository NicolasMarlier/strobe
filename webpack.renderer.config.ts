import type { Configuration } from 'webpack';

import { imageRule, tsRule } from './webpack.rules';
import { plugins } from './webpack.plugins';

// The renderer's TypeScript is compiled to ES modules (the main process' stays CommonJS).
// Compiled to require(), imports would load the packages' CommonJS builds while the libraries
// importing each other get their ES builds: two copies of three, postprocessing & co.,
// whose classes don't match (an effect of one isn't an Effect of the other)
const rendererTsRule = {
  ...tsRule,
  use: {
    loader: 'ts-loader',
    options: {
      transpileOnly: true,
      compilerOptions: { module: 'esnext' },
    },
  },
};

export const rendererConfig: Configuration = {
  module: {
    rules: [
      rendererTsRule,
      imageRule,
      {
        test: /\.css$/,
        use: [{ loader: 'style-loader' }, { loader: 'css-loader' }],
      },
      {
        test: /\.scss$/,
        use: [{ loader: 'style-loader' }, { loader: 'css-loader' }, { loader: 'sass-loader' }],
      },
    ],
  },
  plugins,
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css', '.scss'],
  },
};

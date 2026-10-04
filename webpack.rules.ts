import type { ModuleOptions, RuleSetRule } from 'webpack';

export const tsRule: RuleSetRule = {
  test: /\.tsx?$/,
  exclude: /(node_modules|\.webpack)/,
  use: {
    loader: 'ts-loader',
    options: {
      transpileOnly: true,
    },
  },
};

// Our images (e.g. the app's icon on the splash and Welcome screens), inlined as data URLs: small, and the
// splash loads its page from a data URL, with nowhere to fetch a file from
export const imageRule: RuleSetRule = {
  test: /\.png$/,
  exclude: /node_modules/,
  type: 'asset/inline',
};

// The asset relocator injects `__dirname` into the bundle, which doesn't exist in sandboxed
// renderers, so these rules are for the main process only.
export const rules: Required<ModuleOptions>['rules'] = [
  // Add support for native node modules
  {
    // We're specifying native_modules in the test because the asset relocator loader generates a
    // "fake" .node file which is really a cjs file.
    test: /native_modules[/\\].+\.node$/,
    use: 'node-loader',
  },
  {
    test: /[/\\]node_modules[/\\].+\.(m?js|node)$/,
    parser: { amd: false },
    use: {
      loader: '@vercel/webpack-asset-relocator-loader',
      options: {
        outputAssetBase: 'native_modules',
      },
    },
  },
  tsRule,
  imageRule,
];

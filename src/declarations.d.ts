// Short hash of the commit the app was built from (see webpack.main.config.ts)
declare const STROBE_COMMIT: string
declare module '*.css';
declare module '*.scss';
// Inlined as data URLs (see imageRule in webpack.rules.ts)
declare module '*.png' {
  const dataUrl: string
  export default dataUrl
}

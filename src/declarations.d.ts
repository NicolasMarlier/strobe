declare module '*.css';
declare module '*.scss';
// Inlined as data URLs (see imageRule in webpack.rules.ts)
declare module '*.png' {
  const dataUrl: string
  export default dataUrl
}

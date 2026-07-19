/**
 * Ambient type for `.sql` files imported as strings. esbuild's text loader
 * inlines the file contents at build time; this declaration lets `tsc`
 * type-check the import without a real module on disk.
 */
declare module '*.sql' {
  const content: string;
  export default content;
}

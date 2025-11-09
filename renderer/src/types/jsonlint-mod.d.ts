declare module 'jsonlint-mod' {
  interface JsonlintMod {
    parse(input: string): unknown;
  }
  const jsonlint: JsonlintMod;
  export default jsonlint;
}

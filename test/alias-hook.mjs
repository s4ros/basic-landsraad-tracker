export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const bare = specifier.slice(2);
    const withExt = bare.endsWith(".ts") || bare.endsWith(".js") ? bare : `${bare}.ts`;
    return nextResolve(new URL(`../${withExt}`, import.meta.url).href, context);
  }
  return nextResolve(specifier, context);
}

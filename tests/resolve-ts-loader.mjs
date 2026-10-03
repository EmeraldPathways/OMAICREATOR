export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    if (error?.code !== "ERR_MODULE_NOT_FOUND" || !specifier.startsWith(".")) throw error;
    for (const extension of [".ts", ".js", ".mjs"]) {
      try {
        return await nextResolve(`${specifier}${extension}`, context);
      } catch (nestedError) {
        if (nestedError?.code !== "ERR_MODULE_NOT_FOUND") throw nestedError;
      }
    }
    throw error;
  }
}

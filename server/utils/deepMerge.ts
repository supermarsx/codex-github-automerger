export function deepMerge(target: any, source: any): any {
  if (Array.isArray(target) && Array.isArray(source)) {
    const result = [...target];
    for (const item of source) {
      if (!result.includes(item)) result.push(item);
    }
    return result;
  }
  if (isPlainObject(target) && isPlainObject(source)) {
    const result: Record<string, any> = { ...target };
    for (const key of Object.keys(source)) {
      const srcVal = source[key];
      if (key in result) {
        result[key] = deepMerge(result[key], srcVal);
      } else {
        result[key] = srcVal;
      }
    }
    return result;
  }
  return source;
}

function isPlainObject(value: any): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

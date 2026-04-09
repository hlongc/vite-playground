function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === '[object Object]';
}

export function trimStringField<T>(source: T, deeply = true): T {
  if (typeof source === 'string') {
    return source.trim() as T;
  }

  if (Array.isArray(source)) {
    return source.map((item) =>
      deeply ? trimStringField(item, deeply) : item
    ) as T;
  }

  if (!isPlainObject(source)) {
    return source;
  }

  const result: Record<string, unknown> = {};
  Object.keys(source).forEach((key) => {
    const value = source[key];
    if (typeof value === 'string') {
      result[key] = value.trim();
      return;
    }

    if (deeply && (Array.isArray(value) || isPlainObject(value))) {
      result[key] = trimStringField(value, deeply);
      return;
    }

    result[key] = value;
  });

  return result as T;
}

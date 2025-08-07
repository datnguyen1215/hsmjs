/**
 * Deep merge two objects
 * @param {Object} target
 * @param {Object} source
 * @returns {Object}
 */
const deepMerge = (target, source) => {
  // Handle null/undefined source
  if (source === null || source === undefined) {
    return source;
  }

  // Handle non-object source (primitives)
  if (typeof source !== 'object') {
    return source;
  }

  // Handle null/undefined target
  if (!target || typeof target !== 'object') {
    target = {};
  }

  const result = { ...target };

  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      const sourceValue = source[key];
      const targetValue = target[key];

      // Handle arrays - replace, don't merge
      if (Array.isArray(sourceValue)) {
        result[key] = [...sourceValue];
      }
      // Handle nested objects
      else if (sourceValue && typeof sourceValue === 'object' &&
               targetValue && typeof targetValue === 'object' &&
               !Array.isArray(targetValue) && !(sourceValue instanceof Date)) {
        result[key] = deepMerge(targetValue, sourceValue);
      }
      // Replace primitive values
      else {
        result[key] = sourceValue;
      }
    }
  }

  return result;
};

/**
 * @param {Object} context
 * @param {Object|Function} update
 * @param {Object} event
 * @returns {Object|Promise<Object>}
 */
export const updateContext = (context, update, event) => {
  if (typeof update === 'function') {
    const result = update(context, event);
    // Check if result is a Promise
    if (result && typeof result.then === 'function') {
      return result.then(res => deepMerge(context, res));
    }
    return deepMerge(context, result);
  }
  return deepMerge(context, update);
};

/**
 * @param {Object} target
 * @param {Object} source
 * @returns {Object}
 */
export const mergeContext = (target, source) => {
  return deepMerge(target, source);
};
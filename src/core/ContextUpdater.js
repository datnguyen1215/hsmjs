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
 * Update context with object-based arguments support
 * @param {Object} context - Current context to update
 * @param {Object|Function} update - Update object or function that returns update object
 * @param {Object} event - Event object
 * @param {Object} machine - Machine reference
 * @returns {Object|Promise<Object>} - Updated context or Promise resolving to updated context
 */
export const updateContext = (context, update, event, machine) => {
  // Validate update parameter type
  if (update === null || update === undefined) {
    return context;
  }

  if (typeof update === 'function') {
    const result = update({ context, event, machine });
    // Check if result is a Promise
    if (result && typeof result.then === 'function') {
      return result.then(res => deepMerge(context, res));
    }
    return deepMerge(context, result);
  }

  // Validate that update is an object for merging
  if (typeof update !== 'object') {
    console.warn('Update parameter must be an object or function, received:', typeof update);
    return context;
  }

  return deepMerge(context, update);
};

/**
 * Merge two objects deeply with proper handling of arrays and primitives
 * @param {Object} target - Target object to merge into
 * @param {Object} source - Source object to merge from
 * @returns {Object} - Merged result object
 */
export const mergeContext = (target, source) => {
  return deepMerge(target, source);
};
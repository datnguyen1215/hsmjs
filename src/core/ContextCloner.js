/**
 * Deep clone implementation
 * @param {*} obj
 * @param {WeakMap} seen - Track circular references
 * @returns {*}
 */
const deepClone = (obj, seen = new WeakMap()) => {
  // Handle primitives and null
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // Handle circular references
  if (seen.has(obj)) {
    return seen.get(obj);
  }

  // Handle Date
  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }

  // Handle Arrays
  if (Array.isArray(obj)) {
    const cloned = [];
    seen.set(obj, cloned);
    for (let i = 0; i < obj.length; i++) {
      cloned[i] = deepClone(obj[i], seen);
    }
    return cloned;
  }

  // Handle Objects
  const cloned = {};
  seen.set(obj, cloned);
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key], seen);
    }
  }
  return cloned;
};

/**
 * @param {Object} context
 * @returns {Object}
 */
export const cloneContext = (context) => {
  if (!context || typeof context !== 'object') {
    return context;
  }
  return deepClone(context);
};
/**
 * @param {Object} rootNode
 * @param {string} statePath
 * @returns {Object|null}
 */
export const getStateNode = (rootNode, statePath) => {
  const parts = statePath.split('.');
  let current = rootNode;

  for (const part of parts) {
    if (!current.states || !current.states[part]) {
      return null;
    }
    current = current.states[part];
  }

  return current;
};

/**
 * @param {Object} parentNode
 * @param {string} initialKey
 * @returns {string}
 */
export const initializeState = (parentNode, initialKey) => {
  if (!parentNode.states || !parentNode.states[initialKey]) {
    return initialKey;
  }

  let currentNode = parentNode.states[initialKey];
  const path = [initialKey];

  // Follow initial states recursively
  while (currentNode && currentNode.initial && currentNode.states) {
    const childKey = currentNode.initial;
    if (currentNode.states[childKey]) {
      path.push(childKey);
      currentNode = currentNode.states[childKey];
    } else {
      break;
    }
  }

  return path.join('.');
};

/**
 * @param {Object} node
 * @returns {string}
 */
export const getStatePath = (node) => {
  if (!node.parent) {
    return node.id;
  }

  const pathParts = [];
  let current = node;

  while (current && current.parent) {
    const parentStates = current.parent.states || {};
    for (const [key, value] of Object.entries(parentStates)) {
      if (value === current) {
        pathParts.unshift(key);
        break;
      }
    }
    current = current.parent;
  }

  return pathParts.join('.');
};
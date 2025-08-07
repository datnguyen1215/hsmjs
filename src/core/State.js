/**
 * @typedef {Object} StateNode
 * @property {string} id
 * @property {string} [type]
 * @property {Array<Function|string>} entry
 * @property {Array<Function|string>} exit
 * @property {Object} on
 * @property {string} [initial]
 * @property {Object} [states]
 * @property {StateNode} [parent]
 * @property {Object} [history]
 */

/**
 * @param {string} id
 * @param {Object} config
 * @param {StateNode} [parent]
 * @returns {StateNode}
 */
export const createStateNode = (id, config, parent = null) => {
  const node = {
    id,
    type: config.type || 'compound',
    entry: normalizeActions(config.entry),
    exit: normalizeActions(config.exit),
    on: config.on || {},
    initial: config.initial,
    states: {},
    parent,
    history: config.history
  };

  if (config.states) {
    for (const [key, stateConfig] of Object.entries(config.states)) {
      const childId = `${id}.${key}`;
      node.states[key] = createStateNode(childId, stateConfig, node);
    }
  }

  return node;
};

/**
 * @param {Array|Function|string|undefined} actions
 * @returns {Array}
 */
const normalizeActions = (actions) => {
  if (!actions) return [];
  if (Array.isArray(actions)) return actions;
  return [actions];
};

/**
 * @param {StateNode} node
 * @param {string} path
 * @returns {StateNode|null}
 */
export const findStateNode = (node, path) => {
  if (path.startsWith('#')) {
    // ID reference - traverse to root then search
    let root = node;
    while (root.parent) {
      root = root.parent;
    }
    return findNodeById(root, path.slice(1));
  }

  // Handle relative path with leading dot
  if (path.startsWith('.')) {
    // Remove the leading dot and search from current node
    path = path.slice(1);
  }

  const parts = path.split('.').filter(p => p); // filter out empty parts
  let current = node;

  for (const part of parts) {
    if (!current.states || !current.states[part]) {
      return null;
    }
    current = current.states[part];
  }

  return current;
};

/**
 * @param {StateNode} node
 * @param {string} id
 * @returns {StateNode|null}
 */
const findNodeById = (node, id) => {
  if (node.id === id) return node;

  for (const child of Object.values(node.states || {})) {
    const found = findNodeById(child, id);
    if (found) return found;
  }

  return null;
};
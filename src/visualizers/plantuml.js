const PLANTUML_START = '@startuml';
const PLANTUML_END = '@enduml';
const INDENT_UNIT = '  ';

/**
 * Generates a PlantUML state diagram from a state machine configuration
 * @param {Object} config - The state machine configuration object
 * @param {string} config.initial - The initial state name
 * @param {Object} config.states - The states object containing state definitions
 * @param {Object} [options={}] - Visualization options
 * @returns {string} The generated PlantUML diagram syntax
 */
export const generatePlantUML = (config, options = {}) => {
  // Input validation
  if (!config || typeof config !== 'object') {
    throw new Error('Config parameter is required and must be an object');
  }
  if (!config.initial) {
    throw new Error('Config must specify an initial state');
  }
  if (!config.states || typeof config.states !== 'object') {
    throw new Error('Config must specify states object');
  }

  const output = [PLANTUML_START];

  // Add initial state transition
  output.push(`${INDENT_UNIT}[*] --> ${config.initial}`);

  /**
   * @param {string|Function|Object} guard
   * @returns {string}
   */
  const getGuardLabel = (guard) => {
    if (typeof guard === 'string') {
      return guard;
    } else if (typeof guard === 'function') {
      return guard.name || 'guard function';
    } else if (guard && typeof guard === 'object' && guard.type) {
      return guard.type;
    } else {
      return 'condition';
    }
  };

  /**
   * @param {string|Function|Object|Array} actions
   * @returns {string}
   */
  const getActionLabel = (actions) => {
    const actionsList = Array.isArray(actions) ? actions : [actions];

    const actionNames = actionsList.map(action => {
      if (typeof action === 'string') {
        return action;
      } else if (typeof action === 'function') {
        return action.name || 'action';
      } else if (action && typeof action === 'object' && action.type) {
        return action.type;
      } else if (action && typeof action === 'object' && action.assigner) {
        return 'assign';
      } else {
        return 'action';
      }
    }).filter(name => name);

    return actionNames.length > 0 ? actionNames.join(', ') : '';
  };

  /**
   * @param {Object} stateNode
   * @returns {string}
   */
  const processStateContent = (stateNode) => {
    if (!stateNode || typeof stateNode !== 'object') {
      return '';
    }

    const content = [];

    if (stateNode.entry && (Array.isArray(stateNode.entry) ? stateNode.entry.length > 0 : stateNode.entry)) {
      const entryLabel = getActionLabel(stateNode.entry);
      if (entryLabel) {
        content.push(`entry / ${entryLabel}`);
      }
    }

    if (stateNode.exit && (Array.isArray(stateNode.exit) ? stateNode.exit.length > 0 : stateNode.exit)) {
      const exitLabel = getActionLabel(stateNode.exit);
      if (exitLabel) {
        content.push(`exit / ${exitLabel}`);
      }
    }

    if (stateNode.do && (Array.isArray(stateNode.do) ? stateNode.do.length > 0 : stateNode.do)) {
      const doLabel = getActionLabel(stateNode.do);
      if (doLabel) {
        content.push(`do / ${doLabel}`);
      }
    }

    return content.join('\\n');
  };

  /**
   * @param {string} target
   * @returns {string|null}
   */
  const parseIdReference = (target) => {
    if (!target.startsWith('#')) {
      return target;
    }

    try {
      const cleanTarget = target.slice(1);
      if (!cleanTarget || cleanTarget.trim() === '') {
        return null;
      }

      const dotIndex = cleanTarget.indexOf('.');
      const hasNoDot = dotIndex === -1;
      if (hasNoDot) {
        return cleanTarget;
      }

      const parsedTarget = cleanTarget.substring(dotIndex + 1);
      if (!parsedTarget || parsedTarget.trim() === '' || parsedTarget.startsWith('.')) {
        return null;
      }

      return parsedTarget;
    } catch (error) {
      return null;
    }
  };

  /**
   * @param {Object} transition
   * @param {string} event
   * @param {string} sourceState
   * @param {string} indent
   */
  const processSingleTransition = (transition, event, sourceState, indent) => {
    const normalizedTransition = typeof transition === 'string'
      ? { target: transition }
      : transition;

    if (!normalizedTransition || !normalizedTransition.target) {
      return;
    }

    const targetState = parseIdReference(normalizedTransition.target);
    if (!targetState) {
      return;
    }

    let label = event;

    if (normalizedTransition.cond) {
      const guardLabel = getGuardLabel(normalizedTransition.cond);
      label += ` [${guardLabel}]`;
    }

    if (normalizedTransition.actions) {
      const actionLabel = getActionLabel(normalizedTransition.actions);
      if (actionLabel) {
        label += ` / ${actionLabel}`;
      }
    }

    output.push(`${indent}${sourceState} --> ${targetState} : ${label}`);
  };

  /**
   * @param {string} stateKey
   * @param {Object} stateNode
   * @param {string} parentPath
   * @param {string} indent
   */
  const processTransitions = (stateKey, stateNode, parentPath, indent) => {
    if (!stateNode.on) return;

    const sourceState = parentPath ? `${parentPath}.${stateKey}` : stateKey;

    for (const [event, transitions] of Object.entries(stateNode.on)) {
      if (event === '*') continue;

      const transitionList = Array.isArray(transitions) ? transitions : [transitions];

      for (const transition of transitionList) {
        processSingleTransition(transition, event, sourceState, indent);
      }
    }
  };

  /**
   * @param {string} stateKey
   * @param {Object} stateNode
   * @param {Object} config
   * @param {string} config.statePath
   * @param {string} config.indent
   * @param {number} config.indentLevel
   */
  const processNestedStates = (stateKey, stateNode, { statePath, indent, indentLevel }) => {
    const stateContent = processStateContent(stateNode);

    if (stateContent) {
      output.push(`${indent}state ${stateKey} : ${stateContent}`);
    }

    output.push(`${indent}state ${stateKey} {`);

    if (stateNode.initial) {
      output.push(`${indent}${INDENT_UNIT}[*] --> ${stateNode.initial}`);
    }

    processStates(stateNode.states, statePath, indentLevel + 1);

    output.push(`${indent}}`);
  };

  /**
   * @param {Object} states
   * @param {string} parentPath
   * @param {number} indentLevel
   */
  const processStates = (states, parentPath = '', indentLevel = 1) => {
    const indent = INDENT_UNIT.repeat(indentLevel);

    for (const [stateKey, stateNode] of Object.entries(states)) {
      const statePath = parentPath ? `${parentPath}.${stateKey}` : stateKey;

      // Handle nested states
      if (stateNode.states && Object.keys(stateNode.states).length > 0) {
        processNestedStates(stateKey, stateNode, { statePath, indent, indentLevel });
      } else {
        // Handle simple states with entry/exit actions
        const stateContent = processStateContent(stateNode);
        if (stateContent) {
          output.push(`${indent}state ${stateKey} : ${stateContent}`);
        }
      }

      // Process transitions for this state
      processTransitions(stateKey, stateNode, parentPath, indent);
    }
  };

  // Process all states starting from the root
  if (config.states) {
    processStates(config.states);
  }

  output.push(PLANTUML_END);

  return output.join('\n');
};
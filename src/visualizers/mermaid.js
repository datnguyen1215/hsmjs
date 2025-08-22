const MERMAID_DIAGRAM_TYPE = 'stateDiagram-v2';
const INDENT_UNIT = '    ';

/**
 * Generates a Mermaid state diagram from a state machine configuration
 * @param {Object} config - The state machine configuration object
 * @param {string} config.initial - The initial state name
 * @param {Object} config.states - The states object containing state definitions
 * @param {Object} [options={}] - Visualization options
 * @param {string} [options.direction] - Diagram direction (TB, LR, BT, RL)
 * @returns {string} The generated Mermaid diagram syntax
 */
export const generateMermaid = (config, options = {}) => {
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

  const output = [MERMAID_DIAGRAM_TYPE];

  // Add direction if specified
  if (options.direction) {
    output.push(`${INDENT_UNIT}direction ${options.direction}`);
  }

  // Add initial state transition
  output.push(`${INDENT_UNIT}[*] --> ${config.initial}`);

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

  const buildTransitionLabel = (event, transition) => {
    let label = event;

    if (transition.cond) {
      const guardLabel = getGuardLabel(transition.cond);
      label += ` [${guardLabel}]`;
    }

    if (transition.actions) {
      const actionLabel = getActionLabel(transition.actions);
      if (actionLabel) {
        label += ` / ${actionLabel}`;
      }
    }

    return label;
  };

  const processNestedStates = (stateKey, stateNode, statePath, indent, indentLevel) => {
    output.push(`${indent}state ${stateKey} {`);

    if (stateNode.initial) {
      output.push(`${indent}${INDENT_UNIT}[*] --> ${stateNode.initial}`);
    }

    processStates(stateNode.states, statePath, indentLevel + 1);

    output.push(`${indent}}`);
  };

  const processIdReference = (targetState, originalTarget) => {
    try {
      targetState = targetState.slice(1);
      if (!targetState || targetState.trim() === '') {
        throw new Error('Empty ID reference');
      }
      const dotIndex = targetState.indexOf('.');
      if (dotIndex !== -1) {
        targetState = targetState.substring(dotIndex + 1);
        if (!targetState || targetState.trim() === '') {
          throw new Error('Invalid ID reference format');
        }
      }
      return targetState;
    } catch (error) {
      console.warn(`Malformed ID reference: ${originalTarget}. ${error.message}`);
      return null;
    }
  };

  const processTransitions = (stateKey, stateNode, parentPath, indent) => {
    if (!stateNode.on) return;

    for (const [event, transitions] of Object.entries(stateNode.on)) {
      if (event === '*') continue;

      const transitionList = Array.isArray(transitions) ? transitions : [transitions];

      for (const transition of transitionList) {
        const normalizedTransition = typeof transition === 'string'
          ? { target: transition }
          : transition;

        if (normalizedTransition && normalizedTransition.target) {
          const sourceState = parentPath ? `${parentPath}.${stateKey}` : stateKey;
          let targetState = normalizedTransition.target;

          if (targetState.startsWith('#')) {
            const processedState = processIdReference(targetState, normalizedTransition.target);
            if (processedState === null) continue;
            targetState = processedState;
          }

          const label = buildTransitionLabel(event, normalizedTransition);
          output.push(`${indent}${sourceState} --> ${targetState} : ${label}`);
        }
      }
    }
  };

  const processStates = (states, parentPath = '', indentLevel = 1) => {
    const indent = INDENT_UNIT.repeat(indentLevel);

    for (const [stateKey, stateNode] of Object.entries(states)) {
      const statePath = parentPath ? `${parentPath}.${stateKey}` : stateKey;

      // Handle nested states
      if (stateNode.states && Object.keys(stateNode.states).length > 0) {
        processNestedStates(stateKey, stateNode, statePath, indent, indentLevel);
      }

      // Process transitions for this state
      processTransitions(stateKey, stateNode, parentPath, indent);
    }
  };

  // Process all states starting from the root
  if (config.states) {
    processStates(config.states);
  }

  return output.join('\n');
};
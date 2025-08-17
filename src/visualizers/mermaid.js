/**
 * @param {Object} config
 * @param {Object} options
 * @returns {string}
 */
export const generateMermaid = (config, options = {}) => {
  const output = ['stateDiagram-v2'];

  // Add direction if specified
  if (options.direction) {
    output.push(`    direction ${options.direction}`);
  }

  // Add initial state transition
  output.push(`    [*] --> ${config.initial}`);

  /**
   * @param {Object} states
   * @param {string} parentPath
   * @param {number} indentLevel
   */
  const processStates = (states, parentPath = '', indentLevel = 1) => {
    const indent = '    '.repeat(indentLevel);

    for (const [stateKey, stateNode] of Object.entries(states)) {
      const statePath = parentPath ? `${parentPath}.${stateKey}` : stateKey;

      // Handle nested states
      if (stateNode.states && Object.keys(stateNode.states).length > 0) {
        output.push(`${indent}state ${stateKey} {`);

        // Add initial state for nested states
        if (stateNode.initial) {
          output.push(`${indent}    [*] --> ${stateNode.initial}`);
        }

        // Process nested states recursively
        processStates(stateNode.states, statePath, indentLevel + 1);

        output.push(`${indent}}`);
      }

      // Process transitions for this state
      if (stateNode.on) {
        for (const [event, transitions] of Object.entries(stateNode.on)) {
          // Skip wildcard events
          if (event === '*') {
            continue;
          }

          const transitionList = Array.isArray(transitions) ? transitions : [transitions];

          for (const transition of transitionList) {
            const normalizedTransition = typeof transition === 'string'
              ? { target: transition }
              : transition;

            if (normalizedTransition && normalizedTransition.target) {
              const sourceState = parentPath ? `${parentPath}.${stateKey}` : stateKey;
              let targetState = normalizedTransition.target;

              // Handle ID references (remove # prefix and extract state path)
              if (targetState.startsWith('#')) {
                targetState = targetState.slice(1);
                // Remove machine ID prefix if present
                const dotIndex = targetState.indexOf('.');
                if (dotIndex !== -1) {
                  targetState = targetState.substring(dotIndex + 1);
                }
              }

              // Build transition label
              let label = event;
              if (options.showGuards && normalizedTransition.cond) {
                const guard = normalizedTransition.cond;
                const guardLabel = typeof guard === 'string' ? guard : 'guard';
                label += ` [${guardLabel}]`;
              }

              output.push(`${indent}${sourceState} --> ${targetState} : ${label}`);
            }
          }
        }
      }
    }
  };

  // Process all states starting from the root
  if (config.states) {
    processStates(config.states);
  }

  return output.join('\n');
};
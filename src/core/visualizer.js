/**
 * Visualizer for state machines
 * Generates Mermaid diagrams as text
 */

/**
 * @param {Object} machine
 * @returns {import('../../types/index.js').Visualizer}
 */
export const createVisualizer = (machine) => {
  // Private methods via closure
  const mapStateData = (state) => {
    return {
      id: state.id,
      path: state.path,
      parent: state.parent?.path,
      isInitial: state === machine.initialState,
      hasChildren: state.children.size > 0,
      children: Array.from(state.children.keys())
    }
  }

  const resolveTransitionTarget = (transition) => {
    if (typeof transition.target === 'string') {
      return transition.target
    }
    if (transition.target?.path) {
      return transition.target.path
    }
    if (transition.target?.id) {
      return transition.target.id
    }
    return null
  }

  const extractAllTransitions = (states) => {
    const transitions = []

    states.forEach(state => {
      for (const [event, transitionList] of state.transitions.entries()) {
        transitionList.forEach(transition => {
          const target = resolveTransitionTarget(transition)
          if (target) {
            transitions.push({
              from: state.path,
              to: target,
              event: event
            })
          }
        })
      }
    })

    // Add global transitions
    for (const [event, transitionList] of machine.globalTransitions.entries()) {
      transitionList.forEach(transition => {
        const target = resolveTransitionTarget(transition)
        if (target) {
          transitions.push({
            from: '[*]',
            to: target,
            event: event
          })
        }
      })
    }

    return transitions
  }

  const extractHierarchicalData = () => {
    const allStates = machine.getAllStates()
    const topLevel = allStates.filter(state => !state.parent)
    const nested = allStates.filter(state => state.parent)

    return {
      name: machine.name,
      initialState: machine.initialState?.path,
      topLevelStates: topLevel.map(state => mapStateData(state)),
      nestedStates: nested.map(state => mapStateData(state)),
      allTransitions: extractAllTransitions(allStates)
    }
  }

  const sanitizeId = (path) => {
    return path.replace(/[^a-zA-Z0-9]/g, '_')
  }

  const generateStateNode = (state) => {
    const nodeId = sanitizeId(state.path)
    if (state.isInitial) {
      return [`  ${nodeId}(("${state.id}"))`]
    } else {
      return [`  ${nodeId}("${state.id}")`]
    }
  }

  const generateSubgraph = (parentState, data) => {
    const lines = []
    const parentId = sanitizeId(parentState.path)

    lines.push(`  subgraph ${parentId}["${parentState.id}"]`)

    const children = data.nestedStates.filter(state =>
      state.parent === parentState.path
    )

    children.forEach(child => {
      const childId = sanitizeId(child.path)
      if (child.hasChildren) {
        lines.push(`    subgraph ${childId}["${child.id}"]`)

        const grandChildren = data.nestedStates.filter(state =>
          state.parent === child.path
        )
        grandChildren.forEach(grandChild => {
          const grandChildId = sanitizeId(grandChild.path)
          lines.push(`      ${grandChildId}("${grandChild.id}")`)
        })

        lines.push(`    end`)
      } else {
        lines.push(`    ${childId}("${child.id}")`)
      }
    })

    lines.push('  end')
    return lines
  }

  const generateTransitions = (transitions) => {
    return transitions.map(transition => {
      const fromId = transition.from === '[*]' ? 'START' : sanitizeId(transition.from)
      const toId = sanitizeId(transition.to)

      if (transition.from === '[*]') {
        return [`  START((" ")) -->|${transition.event}| ${toId}`]
      }

      return `  ${fromId} -->|${transition.event}| ${toId}`
    }).flat()
  }

  const generateMermaidDiagram = (data) => {
    const lines = ['graph TD']

    // Generate top-level states and their subgraphs
    data.topLevelStates.forEach(state => {
      if (state.hasChildren) {
        lines.push(...generateSubgraph(state, data))
      } else {
        lines.push(...generateStateNode(state))
      }
    })

    // Generate all transitions
    lines.push(...generateTransitions(data.allTransitions))

    // Style initial state
    if (data.initialState) {
      lines.push(`  class ${sanitizeId(data.initialState)} initial`)
      lines.push('  classDef initial fill:#f3e5f5,stroke:#4a148c,stroke-width:2px')
    }

    return lines.join('\n')
  }




  // Public interface
  const visualizer = {
    /**
     * Get visualizer interface
     * @returns {Object} Visualizer with visualize() method
     */
    getInterface() {
      return {
        visualize: () => visualizer.visualize()
      }
    },

    /**
     * Generate Mermaid diagram
     * @returns {string} Mermaid diagram syntax
     */
    visualize() {
      const data = extractHierarchicalData()
      return generateMermaidDiagram(data)
    }
  }

  return visualizer
}
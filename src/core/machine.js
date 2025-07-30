/**
 * Machine class representing the state machine definition
 * Manages states and provides factory for instances
 */

import { State } from './state.js'
import { Transition } from './transition.js'
import { Instance } from '../instance/instance.js'

export class Machine {
  /**
   * Create a new machine
   * @param {string} name - Machine name for debugging
   */
  constructor(name) {
    this.name = name
    this.states = new Map()
    this.initialState = null
    this.globalTransitions = new Map()
  }

  /**
   * Create or retrieve a state
   * @param {string} id - State identifier
   * @returns {State} State instance
   */
  state(id) {
    if (!id || typeof id !== 'string') {
      throw new Error('State ID is required')
    }
    if (this.states.has(id)) {
      throw new Error(`State '${id}' already exists`)
    }
    const state = new State(id)
    this.states.set(id, state)
    return state
  }

  /**
   * Set initial state
   * @param {State|string} stateOrId - Initial state or its ID
   * @returns {Machine} This machine for chaining
   */
  initial(stateOrId) {
    if (!stateOrId) {
      throw new Error('Initial state is required')
    }

    if (typeof stateOrId === 'string') {
      const state = this.findState(stateOrId)
      if (!state) {
        throw new Error(`State '${stateOrId}' not found in machine`)
      }
      this.initialState = state
    } else {
      // Verify the state belongs to this machine
      if (!this.findState(stateOrId.id)) {
        throw new Error(`State '${stateOrId.id}' not found in machine`)
      }
      this.initialState = stateOrId
    }
    return this
  }

  /**
   * Define global transition that works from any state
   * @param {string} event - Event name
   * @param {State|string|Function} target - Target state
   * @returns {Transition} Transition for chaining
   */
  on(event, target) {
    if (!this.globalTransitions.has(event)) {
      this.globalTransitions.set(event, [])
    }

    const transition = new Transition(event, target, null)
    this.globalTransitions.get(event).push(transition)

    return transition
  }

  /**
   * Create a running instance of the machine
   * @param {Object} initialContext - Initial context
   * @param {Object} options - Configuration options
   * @param {Object} options.history - History configuration
   * @returns {Instance} Machine instance
   */
  start(initialContext = {}, options = {}) {
    if (!this.initialState) {
      throw new Error('No initial state defined')
    }

    return new Instance(this, initialContext, options)
  }

  /**
   * Find state by ID including nested states
   * @param {string} id - State ID (can be dotted path)
   * @returns {State|null} Found state or null
   */
  findState(id) {
    // Check top-level states first
    if (this.states.has(id)) {
      return this.states.get(id)
    }

    // Check nested states
    const parts = id.split('.')
    let current = this.states.get(parts[0])

    if (!current) return null

    for (let i = 1; i < parts.length; i++) {
      current = current.children.get(parts[i])
      if (!current) return null
    }

    return current
  }

  /**
   * Get all states including nested
   * @returns {Array} All states in the machine
   */
  getAllStates() {
    const states = []

    const collectStates = state => {
      states.push(state)
      for (const child of state.children.values()) {
        collectStates(child)
      }
    }

    for (const state of this.states.values()) {
      collectStates(state)
    }

    return states
  }

  /**
   * Get visualizer interface for state machine
   * @returns {Object} Visualizer with preview() and save() methods
   */
  visualizer() {
    return {
      /**
       * Preview diagram in browser
       * @returns {Promise<void>} Opens browser with diagram
       */
      preview: async () => {
        const diagram = this.visualize()
        await this._openBrowserPreview(diagram)
      },
      
      /**
       * Save diagram to file
       * @param {string} filename - Optional filename (auto-detects format)
       * @returns {Promise<string>} Saved file path
       */
      save: async (filename) => {
        const diagram = this.visualize()
        return await this._saveDiagram(diagram, filename)
      }
    }
  }

  /**
   * Generate Mermaid diagram of this state machine
   * Supports hierarchical states with subgraphs
   * @returns {string} Mermaid diagram syntax
   */
  visualize() {
    const data = this._extractHierarchicalData()
    return this._generateMermaidDiagram(data)
  }

  /**
   * Extract hierarchical state structure
   * @private
   */
  _extractHierarchicalData() {
    const allStates = this.getAllStates()
    
    // Group states by hierarchy level
    const topLevel = allStates.filter(state => !state.parent)
    const nested = allStates.filter(state => state.parent)
    
    return {
      name: this.name,
      initialState: this.initialState?.path,
      topLevelStates: topLevel.map(state => this._mapStateData(state)),
      nestedStates: nested.map(state => this._mapStateData(state)),
      allTransitions: this._extractAllTransitions(allStates)
    }
  }

  /**
   * Map state to visualization data
   * @private
   */
  _mapStateData(state) {
    return {
      id: state.id,
      path: state.path,
      parent: state.parent?.path,
      isInitial: state === this.initialState,
      hasChildren: state.children.size > 0,
      children: Array.from(state.children.keys())
    }
  }

  /**
   * Extract all transitions including cross-hierarchy
   * @private
   */
  _extractAllTransitions(states) {
    const transitions = []
    
    states.forEach(state => {
      for (const [event, transitionList] of state.transitions.entries()) {
        transitionList.forEach(transition => {
          const target = this._resolveTransitionTarget(transition)
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
    for (const [event, transitionList] of this.globalTransitions.entries()) {
      transitionList.forEach(transition => {
        const target = this._resolveTransitionTarget(transition)
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

  /**
   * Generate complete Mermaid diagram with hierarchical support
   * @private
   */
  _generateMermaidDiagram(data) {
    const lines = ['graph TD']
    
    // Generate top-level states and their subgraphs
    data.topLevelStates.forEach(state => {
      if (state.hasChildren) {
        lines.push(...this._generateSubgraph(state, data))
      } else {
        lines.push(...this._generateStateNode(state))
      }
    })
    
    // Generate all transitions
    lines.push(...this._generateTransitions(data.allTransitions))
    
    // Style initial state
    if (data.initialState) {
      lines.push(`  class ${this._sanitizeId(data.initialState)} initial`)
      lines.push('  classDef initial fill:#f3e5f5,stroke:#4a148c,stroke-width:2px')
    }
    
    return lines.join('\n')
  }

  /**
   * Generate subgraph for composite states
   * @private
   */
  _generateSubgraph(parentState, data) {
    const lines = []
    const parentId = this._sanitizeId(parentState.path)
    
    // Start subgraph
    lines.push(`  subgraph ${parentId}["${parentState.id}"]`)
    
    // Add child states within subgraph - only direct children
    const children = data.nestedStates.filter(state => 
      state.parent === parentState.path
    )
    
    children.forEach(child => {
      const childId = this._sanitizeId(child.path)
      if (child.hasChildren) {
        // For states with children, create a nested subgraph
        lines.push(`    subgraph ${childId}["${child.id}"]`)
        
        // Add grandchildren to nested subgraph
        const grandChildren = data.nestedStates.filter(state => 
          state.parent === child.path
        )
        grandChildren.forEach(grandChild => {
          const grandChildId = this._sanitizeId(grandChild.path)
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

  /**
   * Generate simple state node
   * @private
   */
  _generateStateNode(state) {
    const nodeId = this._sanitizeId(state.path)
    if (state.isInitial) {
      return [`  ${nodeId}(("${state.id}"))`]
    } else {
      return [`  ${nodeId}("${state.id}")`]
    }
  }

  /**
   * Generate all transition arrows
   * @private
   */
  _generateTransitions(transitions) {
    return transitions.map(transition => {
      const fromId = transition.from === '[*]' ? 'START' : this._sanitizeId(transition.from)
      const toId = this._sanitizeId(transition.to)
      
      // Add start node if needed
      if (transition.from === '[*]') {
        return [`  START((" ")) -->|${transition.event}| ${toId}`]
      }
      
      return `  ${fromId} -->|${transition.event}| ${toId}`
    }).flat()
  }

  /**
   * Resolve transition target path
   * @private
   */
  _resolveTransitionTarget(transition) {
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

  /**
   * Convert state path to valid Mermaid ID
   * @private
   */
  _sanitizeId(path) {
    return path.replace(/[^a-zA-Z0-9]/g, '_')
  }

  /**
   * Open browser preview with Mermaid diagram
   * @private
   */
  async _openBrowserPreview(diagram) {
    const fs = await import('fs')
    const path = await import('path')
    const { spawn } = await import('child_process')
    const os = await import('os')
    
    // Create temporary HTML file with Mermaid rendering
    const html = this._generatePreviewHTML(diagram)
    const tempDir = os.tmpdir()
    const tempFile = path.join(tempDir, `hsmjs-preview-${Date.now()}.html`)
    
    fs.writeFileSync(tempFile, html)
    
    // Open in default browser
    const command = process.platform === 'darwin' ? 'open' : 
                   process.platform === 'win32' ? 'start' : 'xdg-open'
    
    spawn(command, [tempFile], { detached: true, stdio: 'ignore' })
    
    console.log(`🚀 Preview opened in browser: ${tempFile}`)
  }

  /**
   * Save diagram to file with auto-format detection
   * @private
   */
  async _saveDiagram(diagram, filename) {
    const fs = await import('fs')
    const path = await import('path')
    
    // Auto-generate filename if not provided
    if (!filename) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      filename = `${this.name}-diagram-${timestamp}.mmd`
    }
    
    // Ensure .mmd extension for Mermaid files
    if (!filename.endsWith('.mmd') && !filename.endsWith('.mermaid')) {
      filename += '.mmd'
    }
    
    // Write diagram to file
    const fullPath = path.resolve(filename)
    fs.writeFileSync(fullPath, diagram)
    
    console.log(`💾 Diagram saved to: ${fullPath}`)
    return fullPath
  }

  /**
   * Generate HTML for browser preview
   * @private
   */
  _generatePreviewHTML(diagram) {
    return `<!DOCTYPE html>
<html>
<head>
    <title>HSMJS State Machine - ${this.name}</title>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 { 
            color: #333; 
            margin-bottom: 20px;
        }
        .diagram {
            text-align: center;
            margin: 20px 0;
        }
        .info {
            background: #e3f2fd;
            padding: 15px;
            border-radius: 4px;
            margin-top: 20px;
            border-left: 4px solid #2196f3;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>State Machine: ${this.name}</h1>
        <div class="diagram">
            <div class="mermaid">
${diagram}
            </div>
        </div>
        <div class="info">
            <strong>Generated by HSMJS</strong><br>
            This preview shows your hierarchical state machine structure.
            States, transitions, and current state highlighting are visualized using Mermaid diagrams.
        </div>
    </div>
    <script>
        mermaid.initialize({ startOnLoad: true, theme: 'default' });
    </script>
</body>
</html>`
  }
}

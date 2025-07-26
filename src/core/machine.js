/**
 * Machine class representing the state machine definition
 * Manages states and provides factory for instances
 */

import { State } from './state.js';
import { Transition } from './transition.js';
import { Instance } from '../instance/instance.js';

export class Machine {
  /**
   * Create a new machine
   * @param {string} name - Machine name for debugging
   */
  constructor(name) {
    this.name = name;
    this.states = new Map();
    this.initialState = null;
    this.globalTransitions = new Map();
  }
  
  /**
   * Create or retrieve a state
   * @param {string} id - State identifier
   * @returns {State} State instance
   */
  state(id) {
    if (!id || typeof id !== 'string') {
      throw new Error('State ID is required');
    }
    if (this.states.has(id)) {
      throw new Error(`State '${id}' already exists`);
    }
    const state = new State(id);
    this.states.set(id, state);
    return state;
  }
  
  /**
   * Set initial state
   * @param {State|string} stateOrId - Initial state or its ID
   * @returns {Machine} This machine for chaining
   */
  initial(stateOrId) {
    if (!stateOrId) {
      throw new Error('Initial state is required');
    }
    
    if (typeof stateOrId === 'string') {
      const state = this.findState(stateOrId);
      if (!state) {
        throw new Error(`State '${stateOrId}' not found in machine`);
      }
      this.initialState = state;
    } else {
      // Verify the state belongs to this machine
      if (!this.findState(stateOrId.id)) {
        throw new Error(`State '${stateOrId.id}' not found in machine`);
      }
      this.initialState = stateOrId;
    }
    return this;
  }
  
  /**
   * Define global transition that works from any state
   * @param {string} event - Event name
   * @param {State|string|Function} target - Target state
   * @returns {Transition} Transition for chaining
   */
  on(event, target) {
    if (!this.globalTransitions.has(event)) {
      this.globalTransitions.set(event, []);
    }
    
    const transition = new Transition(event, target, null);
    this.globalTransitions.get(event).push(transition);
    
    return transition;
  }
  
  /**
   * Create a running instance of the machine
   * @param {Object} initialContext - Initial context
   * @returns {Instance} Machine instance
   */
  start(initialContext = {}) {
    if (!this.initialState) {
      throw new Error('No initial state defined');
    }
    
    return new Instance(this, initialContext);
  }
  
  /**
   * Find state by ID including nested states
   * @param {string} id - State ID (can be dotted path)
   * @returns {State|null} Found state or null
   */
  findState(id) {
    // Check top-level states first
    if (this.states.has(id)) {
      return this.states.get(id);
    }
    
    // Check nested states
    const parts = id.split('.');
    let current = this.states.get(parts[0]);
    
    if (!current) return null;
    
    for (let i = 1; i < parts.length; i++) {
      current = current.children.get(parts[i]);
      if (!current) return null;
    }
    
    return current;
  }
  
  /**
   * Get all states including nested
   * @returns {Array} All states in the machine
   */
  getAllStates() {
    const states = [];
    
    const collectStates = (state) => {
      states.push(state);
      for (const child of state.children.values()) {
        collectStates(child);
      }
    };
    
    for (const state of this.states.values()) {
      collectStates(state);
    }
    
    return states;
  }
}
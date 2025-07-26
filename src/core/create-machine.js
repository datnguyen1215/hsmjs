/**
 * Factory function to create state machines
 * Provides the main entry point for creating state machine instances
 */

import { Machine } from './machine.js';

/**
 * Create a new state machine
 * @param {string} name - Machine name for debugging
 * @returns {Machine} New machine instance
 */
export const createMachine = (name) => {
  if (!name || typeof name !== 'string') {
    throw new Error('Machine name is required');
  }
  
  return new Machine(name);
};
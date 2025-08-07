import { Machine } from './Machine.js';

/**
 * @param {Object} config
 * @param {Object} [options]
 * @returns {Machine}
 */
export const createMachine = (config, options) => {
  // Validate config
  if (!config || typeof config !== 'object') {
    throw new Error('Machine config must be an object');
  }

  if (!config.id) {
    throw new Error('Machine config must have an id');
  }

  if (!config.initial) {
    throw new Error('Machine config must have an initial state');
  }

  if (!config.states) {
    throw new Error('Machine config must have states');
  }

  if (typeof config.states !== 'object') {
    throw new Error('Machine states must be an object');
  }

  // Validate initial state exists
  if (!config.states[config.initial]) {
    throw new Error(`Initial state "${config.initial}" not found in states`);
  }

  // Return the Machine instance directly
  return Machine(config, options);
};
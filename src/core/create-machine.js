/**
 * Factory function to create state machines
 */

import { createMachine as createMachineInstance } from './machine.js'

/**
 * @param {string} name
 * @returns {import('./machine.js').Machine}
 */
export const createMachine = name => {
  if (!name || typeof name !== 'string') {
    throw new Error('Machine name is required')
  }
  return createMachineInstance(name)
}
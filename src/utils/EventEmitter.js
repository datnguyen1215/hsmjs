/**
 * Creates an event emitter with subscriber management
 * @returns {Object}
 */
export const createEventEmitter = () => {
  const subscribers = [];

  /**
   * @param {Function} callback
   * @returns {Function} unsubscribe function
   */
  const subscribe = (callback) => {
    subscribers.push(callback);

    // Return unsubscribe function
    return () => {
      const index = subscribers.indexOf(callback);
      if (index > -1) {
        subscribers.splice(index, 1);
      }
    };
  };

  /**
   * @param {Function} callback
   */
  const unsubscribe = (callback) => {
    const index = subscribers.indexOf(callback);
    if (index > -1) {
      subscribers.splice(index, 1);
    }
  };

  /**
   * @param {*} data
   */
  const notify = (data) => {
    for (const callback of subscribers) {
      try {
        callback(data);
      } catch (error) {
        // Silently ignore subscriber errors to prevent one bad subscriber
        // from breaking the entire event system
      }
    }
  };

  /**
   * @returns {number}
   */
  const getSubscriberCount = () => subscribers.length;

  /**
   * Clear all subscribers
   */
  const clear = () => {
    subscribers.length = 0;
  };

  return {
    subscribe,
    unsubscribe,
    notify,
    getSubscriberCount,
    clear
  };
};
import { createQueueClearedError } from '../utils/ErrorHandler.js';

/**
 * Creates a queue manager for handling event queuing and processing
 * @returns {Object}
 */
export const createQueueManager = () => {
  const eventQueue = [];
  let isTransitioning = false;

  /**
   * @returns {boolean}
   */
  const getIsTransitioning = () => isTransitioning;

  /**
   * @param {boolean} value
   */
  const setIsTransitioning = (value) => {
    isTransitioning = value;
  };

  /**
   * @param {Object} event
   * @param {Function} resolve
   * @param {Function} reject
   */
  const enqueue = (event, resolve, reject) => {
    eventQueue.push({ event, resolve, reject });
  };

  /**
   * @returns {Object|null}
   */
  const dequeue = () => {
    return eventQueue.length > 0 ? eventQueue.shift() : null;
  };

  /**
   * @returns {number}
   */
  const size = () => eventQueue.length;

  /**
   * Clear all queued events
   * @returns {number} Number of events cleared
   */
  const clearQueue = () => {
    // If no transitioning and no events, return early
    if (!isTransitioning && eventQueue.length === 0) {
      return 0;
    }

    const clearedCount = eventQueue.length;

    // Reject all pending promises
    eventQueue.forEach(item => {
      if (item.reject) {
        // Reject immediately - the tests will catch the error
        item.reject(createQueueClearedError());
      }
    });

    // Clear the queue
    eventQueue.length = 0;

    // If currently transitioning, can't do much more
    // The current transition will complete and process no more events
    return clearedCount;
  };

  /**
   * @param {Function} syncProcessor - Function to process single event synchronously
   * @param {Function} asyncProcessor - Function to process single event asynchronously
   * @returns {Function} Process next queued event
   */
  const createEventProcessor = (syncProcessor, asyncProcessor) => {
    const processNextQueuedEventSync = () => {
      if (eventQueue.length === 0 || isTransitioning) {
        return;
      }

      const { event, resolve, reject } = eventQueue.shift();
      isTransitioning = true;

      try {
        const result = syncProcessor(event);

        if (result.wasAsync) {
          // Switch to async processing
          asyncProcessor(event).then(asyncResult => {
            isTransitioning = false;
            resolve(asyncResult);
            // Process next queued event asynchronously
            setTimeout(() => processNextQueuedEvent(), 0);
          }).catch(error => {
            reject(error);
            isTransitioning = false;
            setTimeout(() => processNextQueuedEvent(), 0);
          });
        } else {
          isTransitioning = false;
          resolve(result.value);
          // Continue with next queued event synchronously
          setTimeout(() => processNextQueuedEventSync(), 0);
        }
      } catch (error) {
        reject(error);
        isTransitioning = false;
        setTimeout(() => processNextQueuedEventSync(), 0);
      }
    };

    const processNextQueuedEvent = () => {
      if (eventQueue.length === 0 || isTransitioning) {
        return;
      }

      const { event, resolve, reject } = eventQueue.shift();
      isTransitioning = true;

      asyncProcessor(event).then(result => {
        isTransitioning = false;
        resolve(result);
        // Process next queued event
        setTimeout(() => processNextQueuedEvent(), 0);
      }).catch(error => {
        reject(error);
        isTransitioning = false;
        setTimeout(() => processNextQueuedEvent(), 0);
      });
    };

    return { processNextQueuedEventSync, processNextQueuedEvent };
  };

  return {
    getIsTransitioning,
    setIsTransitioning,
    enqueue,
    dequeue,
    size,
    clearQueue,
    createEventProcessor,
    get eventQueue() { return eventQueue; }
  };
};
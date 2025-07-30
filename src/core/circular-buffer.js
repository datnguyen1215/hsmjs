/**
 * CircularBuffer implementation for memory-efficient history storage
 * Maintains fixed-size buffer with O(1) operations
 */

export class CircularBuffer {
  /**
   * Create a new circular buffer
   * @param {number} maxSize - Maximum number of items to store
   */
  constructor(maxSize) {
    if (maxSize <= 0) {
      throw new Error('CircularBuffer maxSize must be greater than 0');
    }
    
    this.maxSize = maxSize;
    this.buffer = new Array(maxSize);
    this.head = 0;  // Next insertion position
    this.tail = 0;  // Oldest item position
    this.size = 0;  // Current number of items
    this._isFull = false;
  }

  /**
   * Add item to buffer. Returns evicted item if buffer was full.
   * @param {any} item - Item to add
   * @returns {any|undefined} Evicted item if buffer was full
   */
  add(item) {
    let evictedItem;

    // If buffer is full, we'll evict the oldest item
    if (this._isFull) {
      evictedItem = this.buffer[this.tail];
      this.tail = (this.tail + 1) % this.maxSize;
    } else {
      this.size++;
    }

    // Add new item at head position
    this.buffer[this.head] = item;
    this.head = (this.head + 1) % this.maxSize;
    
    // Update full status
    this._isFull = (this.size === this.maxSize);

    return evictedItem;
  }

  /**
   * Get item by index (0 = oldest, size-1 = newest)
   * @param {number} index - Index to retrieve
   * @returns {any|undefined} Item at index
   */
  get(index) {
    if (index < 0 || index >= this.size) {
      return undefined;
    }

    const actualIndex = (this.tail + index) % this.maxSize;
    return this.buffer[actualIndex];
  }

  /**
   * Get the newest item
   * @returns {any|undefined} Most recently added item
   */
  newest() {
    if (this.size === 0) return undefined;
    const newestIndex = (this.head - 1 + this.maxSize) % this.maxSize;
    return this.buffer[newestIndex];
  }

  /**
   * Get the oldest item
   * @returns {any|undefined} Oldest item in buffer
   */
  oldest() {
    if (this.size === 0) return undefined;
    return this.buffer[this.tail];
  }

  /**
   * Get all items as array (oldest to newest)
   * @returns {Array} All items in chronological order
   */
  toArray() {
    const result = [];
    for (let i = 0; i < this.size; i++) {
      result.push(this.get(i));
    }
    return result;
  }

  /**
   * Find item by predicate function
   * @param {Function} predicate - Function to test each item
   * @returns {any|undefined} First matching item
   */
  find(predicate) {
    for (let i = 0; i < this.size; i++) {
      const item = this.get(i);
      if (predicate(item)) {
        return item;
      }
    }
    return undefined;
  }

  /**
   * Find all items matching predicate
   * @param {Function} predicate - Function to test each item
   * @returns {Array} All matching items
   */
  filter(predicate) {
    const result = [];
    for (let i = 0; i < this.size; i++) {
      const item = this.get(i);
      if (predicate(item)) {
        result.push(item);
      }
    }
    return result;
  }

  /**
   * Clear all items from buffer
   */
  clear() {
    this.buffer.fill(undefined);
    this.head = 0;
    this.tail = 0;
    this.size = 0;
    this._isFull = false;
  }

  /**
   * Check if buffer is empty
   * @returns {boolean} True if empty
   */
  isEmpty() {
    return this.size === 0;
  }

  /**
   * Check if buffer is full
   * @returns {boolean} True if full
   */
  isFull() {
    return this._isFull;
  }

  /**
   * Get current size
   * @returns {number} Number of items in buffer
   */
  getSize() {
    return this.size;
  }

  /**
   * Get maximum capacity
   * @returns {number} Maximum number of items
   */
  getMaxSize() {
    return this.maxSize;
  }

  /**
   * Get buffer statistics
   * @returns {Object} Buffer statistics
   */
  getStats() {
    return {
      size: this.size,
      maxSize: this.maxSize,
      isFull: this._isFull,
      isEmpty: this.size === 0,
      utilization: this.size / this.maxSize
    };
  }
}
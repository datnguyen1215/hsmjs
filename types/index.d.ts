/**
 * TypeScript definitions for @datnguyen1215/hsmjs
 * Hierarchical State Machine Library with async support
 */

// ============================================================================
// Core Types and Interfaces
// ============================================================================

/**
 * Generic context type - extend this interface for type safety
 */
export interface BaseContext {
  [key: string]: any;
}

/**
 * Generic event type - use discriminated unions for type safety
 */
export interface BaseEvent {
  type: string;
  [key: string]: any;
}

/**
 * Action function that can modify context
 */
export type Action<TContext = BaseContext, TEvent = BaseEvent> = (
  context: TContext,
  event?: TEvent
) => void | any;

/**
 * Async action function that can modify context and return results
 */
export type AsyncAction<TContext = BaseContext, TEvent = BaseEvent> = (
  context: TContext,
  event?: TEvent
) => Promise<any>;

/**
 * Guard function that determines if a transition can be taken
 */
export type Guard<TContext = BaseContext, TEvent = BaseEvent> = (
  context: TContext,
  event?: TEvent
) => boolean;

/**
 * Target resolver function for dynamic transitions
 */
export type TargetResolver<TContext = BaseContext, TEvent = BaseEvent> = (
  context: TContext,
  event?: TEvent
) => string | State<TContext>;

/**
 * State change event emitted by instance
 */
export interface StateChangeEvent {
  from: string | null;
  to: string;
  event: string;
  rollback?: boolean;
  targetEntry?: HistoryEntry;
}

/**
 * State change listener function
 */
export type StateChangeListener = (event: StateChangeEvent) => void;

/**
 * History entry representing a state transition
 */
export interface HistoryEntry {
  id: string;
  timestamp: number;
  fromState: string | null;
  toState: string;
  context: any;
  trigger: string | null;
  metadata: {
    size: number;
    [key: string]: any;
  };
}

/**
 * History interface for querying and navigation
 */
export interface History {
  entries: HistoryEntry[];
  size: number;
  maxSize: number;
  current: HistoryEntry | null;

  // Query methods
  getByIndex(index: number): HistoryEntry | null;
  getById(id: string): HistoryEntry | null;
  getRange(start: number, end: number): HistoryEntry[];
  find(predicate: (entry: HistoryEntry) => boolean): HistoryEntry | null;
  filter(predicate: (entry: HistoryEntry) => boolean): HistoryEntry[];

  // Navigation methods
  canRollback(targetEntry: HistoryEntry): boolean;
  getStepsBack(targetEntry: HistoryEntry): number;
  getPath(fromEntry: HistoryEntry, toEntry: HistoryEntry): HistoryEntry[];
}

/**
 * History manager configuration options
 */
export interface HistoryOptions {
  maxSize?: number;
  enableCompression?: boolean;
  excludeStates?: string[];
  contextSerializer?: (context: any) => any;
}

/**
 * Memory usage statistics
 */
export interface MemoryUsage {
  totalSize: number;
  entryCount: number;
  averageSize: number;
  maxSize: number;
  utilization: number;
}

/**
 * Rollback result
 */
export interface RollbackResult {
  success: boolean;
  fromEntry?: HistoryEntry;
  toEntry?: HistoryEntry;
  stepsBack?: number;
  timestamp?: number;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * Visualizer interface for generating state diagrams
 */
export interface Visualizer {
  /**
   * Preview diagram in browser
   */
  preview(): Promise<void>;
  
  /**
   * Save diagram to file
   * @param filename Optional filename (auto-detects format)
   */
  save(filename?: string): Promise<string>;
}

/**
 * Instance start options
 */
export interface InstanceOptions {
  history?: HistoryOptions;
}

// ============================================================================
// Transition Class
// ============================================================================

/**
 * Represents a state transition with guards, actions, and targets
 */
export declare class Transition<TContext = BaseContext, TEvent = BaseEvent> {
  constructor(
    event: string,
    target: string | State<TContext> | TargetResolver<TContext, TEvent>,
    source: State<TContext> | null
  );

  readonly event: string;
  readonly target: string | State<TContext> | TargetResolver<TContext, TEvent>;
  readonly source: State<TContext> | null;

  /**
   * Add guard condition
   */
  if(guard: Guard<TContext, TEvent>): this;

  /**
   * Add synchronous action
   */
  do(action: Action<TContext, TEvent>): this;

  /**
   * Add asynchronous action
   */
  doAsync(action: AsyncAction<TContext, TEvent>): this;

  /**
   * Add fire-and-forget action
   */
  fire(action: Action<TContext, TEvent> | AsyncAction<TContext, TEvent>): this;

  /**
   * Check if transition can be taken
   */
  canTake(context: TContext, event: TEvent): boolean;

  /**
   * Execute all blocking actions
   */
  executeBlockingActions(context: TContext, event: TEvent): Promise<any>;

  /**
   * Execute fire-and-forget actions
   */
  executeFireActions(context: TContext, event: TEvent): void;

  /**
   * Resolve target state
   */
  resolveTarget(
    context: TContext,
    event: TEvent,
    stateResolver: (id: string) => State<TContext> | null
  ): State<TContext> | null;
}

// ============================================================================
// State Class
// ============================================================================

/**
 * Represents a state in the state machine with hierarchical support
 */
export declare class State<TContext = BaseContext> {
  constructor(id: string, parent?: State<TContext> | null);

  readonly id: string;
  readonly parent: State<TContext> | null;
  readonly path: string;
  readonly children: Map<string, State<TContext>>;
  readonly transitions: Map<string, Transition<TContext>[]>;
  readonly entryActions: Action<TContext>[];
  readonly exitActions: Action<TContext>[];
  readonly initialChild: string | null;

  /**
   * Create or retrieve a child state
   */
  state(id: string): State<TContext>;

  /**
   * Set initial child state
   */
  initial(stateOrId: State<TContext> | string): this;

  /**
   * Add entry action
   */
  enter(action: Action<TContext>): this;

  /**
   * Add exit action
   */
  exit(action: Action<TContext>): this;

  /**
   * Define a transition
   */
  on<TEvent = BaseEvent>(
    event: string,
    target: string | State<TContext> | TargetResolver<TContext, TEvent>
  ): Transition<TContext, TEvent>;

  /**
   * Get all transitions for an event
   */
  getTransitions(event: string): Transition<TContext>[];

  /**
   * Check if state is child of another state
   */
  isChildOf(ancestor: State<TContext>): boolean;

  /**
   * Find a state by relative path
   */
  findRelative(path: string): State<TContext> | null;

  /**
   * Get all ancestor states
   */
  getAncestors(): State<TContext>[];
}

// ============================================================================
// CircularBuffer Class
// ============================================================================

/**
 * Circular buffer for efficient history management
 */
export declare class CircularBuffer<T = any> {
  constructor(maxSize: number);

  /**
   * Add item to buffer
   */
  add(item: T): T | null;

  /**
   * Get item by index
   */
  get(index: number): T | null;

  /**
   * Get current size
   */
  getSize(): number;

  /**
   * Get maximum size
   */
  getMaxSize(): number;

  /**
   * Check if buffer is full
   */
  isFull(): boolean;

  /**
   * Check if buffer is empty
   */
  isEmpty(): boolean;

  /**
   * Clear all items
   */
  clear(): void;

  /**
   * Convert to array
   */
  toArray(): T[];

  /**
   * Find item by predicate
   */
  find(predicate: (item: T) => boolean): T | null;

  /**
   * Filter items by predicate
   */
  filter(predicate: (item: T) => boolean): T[];

  /**
   * Get buffer statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    utilization: number;
  };
}

// ============================================================================
// HistoryManager Class
// ============================================================================

/**
 * Manages state machine history with rollback capability
 */
export declare class HistoryManager {
  constructor(options?: HistoryOptions);

  /**
   * Record a state transition
   */
  recordTransition(
    fromState: string | null,
    toState: string,
    context: any,
    trigger?: string | null,
    metadata?: any
  ): string | null;

  /**
   * Get complete history interface
   */
  getHistory(): History;

  /**
   * Get current history entry
   */
  getCurrentEntry(): HistoryEntry | null;

  /**
   * Get entry by index
   */
  getByIndex(index: number): HistoryEntry | null;

  /**
   * Get entry by ID
   */
  getById(id: string): HistoryEntry | null;

  /**
   * Get range of entries
   */
  getRange(start: number, end: number): HistoryEntry[];

  /**
   * Find entry by predicate
   */
  find(predicate: (entry: HistoryEntry) => boolean): HistoryEntry | null;

  /**
   * Filter entries by predicate
   */
  filter(predicate: (entry: HistoryEntry) => boolean): HistoryEntry[];

  /**
   * Check if rollback to target entry is possible
   */
  canRollback(targetEntry: HistoryEntry): boolean;

  /**
   * Get number of steps back to target entry
   */
  getStepsBack(targetEntry: HistoryEntry): number;

  /**
   * Get path between two entries
   */
  getPath(fromEntry: HistoryEntry, toEntry: HistoryEntry): HistoryEntry[];

  /**
   * Get memory usage information
   */
  getMemoryUsage(): MemoryUsage;

  /**
   * Clear all history
   */
  clear(): void;

  /**
   * Configure history options
   */
  configure(newOptions: Partial<HistoryOptions>): void;
}

// ============================================================================
// Instance Class
// ============================================================================

/**
 * Running instance of a state machine
 */
export declare class Instance<TContext = BaseContext> {
  constructor(
    machine: Machine<TContext>,
    initialContext?: TContext,
    options?: InstanceOptions
  );

  readonly machine: Machine<TContext>;
  readonly context: TContext;
  readonly currentState: State<TContext> | null;
  readonly historyManager: HistoryManager;

  /**
   * Get current state ID
   */
  readonly current: string | null;

  /**
   * Send event to the machine
   */
  send<TEvent = BaseEvent>(
    eventName: string,
    payload?: Omit<TEvent, 'type'>
  ): Promise<any>;

  /**
   * Subscribe to state changes
   */
  subscribe(listener: StateChangeListener): () => void;

  /**
   * Get history interface
   */
  history(): History;

  /**
   * Rollback to a specific history entry
   */
  rollback(targetEntry: HistoryEntry): Promise<RollbackResult>;

  /**
   * Configure history options
   */
  configureHistory(options: Partial<HistoryOptions>): void;

  /**
   * Get memory usage information
   */
  getHistoryMemoryUsage(): MemoryUsage;

  /**
   * Clear all history
   */
  clearHistory(): void;

  /**
   * Get visualizer interface
   */
  visualizer(): Visualizer;

  /**
   * Generate Mermaid diagram with current state highlighted
   */
  visualize(): string;
}

// ============================================================================
// Machine Class
// ============================================================================

/**
 * State machine definition with hierarchical state support
 */
export declare class Machine<TContext = BaseContext> {
  constructor(name: string);

  readonly name: string;
  readonly states: Map<string, State<TContext>>;
  readonly initialState: State<TContext> | null;
  readonly globalTransitions: Map<string, Transition<TContext>[]>;

  /**
   * Create or retrieve a state
   */
  state(id: string): State<TContext>;

  /**
   * Set initial state
   */
  initial(stateOrId: State<TContext> | string): this;

  /**
   * Define global transition that works from any state
   */
  on<TEvent = BaseEvent>(
    event: string,
    target: string | State<TContext> | TargetResolver<TContext, TEvent>
  ): Transition<TContext, TEvent>;

  /**
   * Create a running instance of the machine
   */
  start(initialContext?: TContext, options?: InstanceOptions): Instance<TContext>;

  /**
   * Find state by ID including nested states
   */
  findState(id: string): State<TContext> | null;

  /**
   * Get all states including nested
   */
  getAllStates(): State<TContext>[];

  /**
   * Get visualizer interface
   */
  visualizer(): Visualizer;

  /**
   * Generate Mermaid diagram of this state machine
   */
  visualize(): string;
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new state machine
 */
export declare function createMachine<TContext = BaseContext>(
  name: string
): Machine<TContext>;

/**
 * Create a named action for better debugging
 */
export declare function action<TContext = BaseContext, TEvent = BaseEvent>(
  name: string,
  fn: Action<TContext, TEvent> | AsyncAction<TContext, TEvent>
): Action<TContext, TEvent> | AsyncAction<TContext, TEvent>;

// ============================================================================
// Type Utilities
// ============================================================================

/**
 * Extract event payload type from discriminated union
 */
export type EventPayload<TEvents extends BaseEvent, TType extends TEvents['type']> =
  Extract<TEvents, { type: TType }>;

/**
 * Extract context type from machine
 */
export type MachineContext<T> = T extends Machine<infer TContext> ? TContext : never;

/**
 * Extract context type from instance
 */
export type InstanceContext<T> = T extends Instance<infer TContext> ? TContext : never;

/**
 * State ID union type helper
 */
export type StateId<T> = T extends Machine<any> 
  ? string 
  : T extends State<any> 
    ? string 
    : string;

// ============================================================================
// Module Exports
// ============================================================================

declare const _default: {
  createMachine: typeof createMachine;
  action: typeof action;
  Machine: typeof Machine;
  State: typeof State;
  Instance: typeof Instance;
  Transition: typeof Transition;
  HistoryManager: typeof HistoryManager;
  CircularBuffer: typeof CircularBuffer;
};

export default _default;
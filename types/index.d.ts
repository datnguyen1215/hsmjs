export interface Context {
  [key: string]: any;
}

export interface Event {
  type: string;
  [key: string]: any;
}

export interface ActionResult {
  name?: string;
  value: any;
}

export interface SendResult {
  state: string;
  context: Context;
  results: ActionResult[];
}

export type Action<TContext = Context, TEvent = Event> =
  | string
  | ((context: TContext, event: TEvent) => any | Promise<any>)
  | AssignAction<TContext, TEvent>;

export interface AssignAction<TContext = Context, TEvent = Event> {
  _isAssign: true;
  assigner: ((context: TContext, event: TEvent) => Partial<TContext>) | Partial<TContext>;
}

export interface TransitionConfig<TContext = Context, TEvent = Event> {
  target: string;
  cond?: (context: TContext, event: TEvent) => boolean;
  actions?: Action<TContext, TEvent>[];
}

export type Transition<TContext = Context, TEvent = Event> =
  | string
  | TransitionConfig<TContext, TEvent>
  | TransitionConfig<TContext, TEvent>[];

export interface StateConfig<TContext = Context, TEvent = Event> {
  entry?: Action<TContext, TEvent>[];
  exit?: Action<TContext, TEvent>[];
  on?: {
    [eventType: string]: Transition<TContext, TEvent>;
  };
  initial?: string;
  states?: {
    [key: string]: StateConfig<TContext, TEvent>;
  };
}

export interface MachineConfig<TContext = Context, TEvent = Event> {
  id: string;
  initial: string;
  context?: TContext;
  states: {
    [key: string]: StateConfig<TContext, TEvent>;
  };
}

export interface MachineOptions<TContext = Context, TEvent = Event> {
  actions?: {
    [key: string]: Action<TContext, TEvent>;
  };
  guards?: {
    [key: string]: (context: TContext, event: TEvent) => boolean;
  };
  historySize?: number;
}

export interface Snapshot<TContext = Context> {
  state: string;
  context: TContext;
}

export interface MachineService<TContext = Context, TEvent = Event> {
  state: string;
  context: TContext;
  historySize: number;
  readonly history: Array<Snapshot<TContext>>;
  readonly snapshot: Snapshot<TContext>;
  send(event: string | TEvent, payload?: any): Promise<SendResult>;
  subscribe(callback: (snapshot: { state: string; context: TContext }) => void): () => void;
  restore(snapshot: Snapshot<TContext>): Promise<Snapshot<TContext>>;
}

export function createMachine<TContext = Context, TEvent = Event>(
  config: MachineConfig<TContext, TEvent>,
  options?: MachineOptions<TContext, TEvent>
): MachineService<TContext, TEvent>;

export function assign<TContext = Context, TEvent = Event>(
  assigner: ((context: TContext, event: TEvent) => Partial<TContext>) | Partial<TContext>
): AssignAction<TContext, TEvent>;
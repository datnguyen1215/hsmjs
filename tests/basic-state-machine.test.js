/**
 * Basic state machine creation and setup tests
 * Tests fundamental machine creation, state definition, and initialization
 */

import { createMachine } from "../dist/cjs/index.js";

describe("Basic State Machine", () => {
  describe("Machine Creation", () => {
    it("should create machine with valid name", () => {
      const machine = createMachine("test-machine");
      expect(machine).toBeDefined();
    });

    it("should have correct machine name", () => {
      const machine = createMachine("test-machine");
      expect(machine.name).toBe("test-machine");
    });

    it("should throw error when name is missing", () => {
      expect(() => createMachine()).toThrow("Machine name is required");
    });

    it("should throw error when name is empty string", () => {
      expect(() => createMachine("")).toThrow("Machine name is required");
    });

    it("should throw error when name is not string", () => {
      expect(() => createMachine(123)).toThrow("Machine name is required");
    });
  });

  describe("State Definition", () => {
    let machine;

    beforeEach(() => {
      machine = createMachine("test-machine");
    });

    it("should create state with valid ID", () => {
      const state = machine.state("idle");
      expect(state).toBeDefined();
    });

    it("should have correct state ID", () => {
      const state = machine.state("idle");
      expect(state.id).toBe("idle");
    });

    it("should have correct state path", () => {
      const state = machine.state("idle");
      expect(state.path).toBe("idle");
    });

    it("should throw error when state ID is missing", () => {
      expect(() => machine.state()).toThrow("State ID is required");
    });

    it("should throw error when state ID is empty", () => {
      expect(() => machine.state("")).toThrow("State ID is required");
    });

    it("should store state in machine", () => {
      const state = machine.state("idle");
      const found = machine.findState("idle");
      expect(found).toBe(state);
    });

    it("should throw error for duplicate state ID", () => {
      machine.state("idle");
      expect(() => machine.state("idle")).toThrow("State 'idle' already exists");
    });
  });

  describe("Initial State", () => {
    let machine;
    let idle;
    let active;

    beforeEach(() => {
      machine = createMachine("test-machine");
      idle = machine.state("idle");
      active = machine.state("active");
    });

    it("should set initial state", () => {
      machine.initial(idle);
      expect(machine.initialState).toBe(idle);
    });

    it("should accept state object", () => {
      machine.initial(idle);
      expect(machine.initialState).toBe(idle);
    });

    it("should throw error when initial state is missing", () => {
      expect(() => machine.initial()).toThrow("Initial state is required");
    });

    it("should throw error for invalid state", () => {
      const otherMachine = createMachine("other");
      const otherState = otherMachine.state("other");
      expect(() => machine.initial(otherState)).toThrow(
        "State 'other' not found in machine",
      );
    });
  });

  describe("Machine Start", () => {
    let machine;
    let idle;

    beforeEach(() => {
      machine = createMachine("test-machine");
      idle = machine.state("idle");
      machine.initial(idle);
    });

    it("should create instance when started", () => {
      const instance = machine.start();
      expect(instance).toBeDefined();
    });

    it("should start in initial state", () => {
      const instance = machine.start();
      expect(instance.current).toBe("idle");
    });

    it("should create instance with empty context", () => {
      const instance = machine.start();
      expect(instance.context).toEqual({});
    });

    it("should create instance with provided context", () => {
      const context = { count: 0, user: "test" };
      const instance = machine.start(context);
      expect(instance.context).toEqual(context);
    });

    it("should create independent context copy", () => {
      const context = { count: 0 };
      const instance = machine.start(context);
      instance.context.count = 1;
      expect(context.count).toBe(0);
    });

    it("should throw error when no initial state set", () => {
      const newMachine = createMachine("no-initial");
      newMachine.state("some-state");
      expect(() => newMachine.start()).toThrow("No initial state defined");
    });
  });
});


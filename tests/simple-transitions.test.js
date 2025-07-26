/**
 * Simple state transition tests
 * Tests basic transitions between states without guards or actions
 */

import { createMachine } from "../dist/es/index.js";

describe("Simple Transitions", () => {
  describe("Transition Definition", () => {
    let machine;
    let idle;
    let active;

    beforeEach(() => {
      machine = createMachine("test-machine");
      idle = machine.state("idle");
      active = machine.state("active");
    });

    it("should create transition with event name", () => {
      const transition = idle.on("START", active);
      expect(transition).toBeDefined();
    });

    it("should create transition with target state", () => {
      const transition = idle.on("START", active);
      expect(transition.target).toBe(active);
    });

    it("should store transition in source state", () => {
      idle.on("START", active);
      const transitions = idle.getTransitions("START");
      expect(transitions.length).toBe(1);
    });

    it("should allow multiple events to same target", () => {
      idle.on("START", active);
      idle.on("ACTIVATE", active);
      expect(idle.getTransitions("START").length).toBe(1);
      expect(idle.getTransitions("ACTIVATE").length).toBe(1);
    });

    it("should allow same event to different targets with guards", () => {
      const error = machine.state("error");
      idle.on("START", active);
      idle.on("START", error);
      const transitions = idle.getTransitions("START");
      expect(transitions.length).toBe(2);
    });
  });

  describe("Basic Transition Execution", () => {
    let machine;
    let instance;
    let off;
    let on;

    beforeEach(() => {
      machine = createMachine("toggle");
      off = machine.state("off");
      on = machine.state("on");
      off.on("TOGGLE", on);
      on.on("TOGGLE", off);
      machine.initial(off);
      instance = machine.start();
    });

    it("should start in initial state", () => {
      expect(instance.current).toBe("off");
    });

    it("should transition to target state", async () => {
      await instance.send("TOGGLE");
      expect(instance.current).toBe("on");
    });

    it("should transition back to original state", async () => {
      await instance.send("TOGGLE");
      await instance.send("TOGGLE");
      expect(instance.current).toBe("off");
    });

    it("should handle multiple transitions", async () => {
      await instance.send("TOGGLE");
      expect(instance.current).toBe("on");
      await instance.send("TOGGLE");
      expect(instance.current).toBe("off");
      await instance.send("TOGGLE");
      expect(instance.current).toBe("on");
    });
  });

  describe("Invalid Transitions", () => {
    let machine;
    let instance;
    let idle;
    let running;
    let stopped;

    beforeEach(() => {
      machine = createMachine("process");
      idle = machine.state("idle");
      running = machine.state("running");
      stopped = machine.state("stopped");

      idle.on("START", running);
      running.on("STOP", stopped);

      machine.initial(idle);
      instance = machine.start();
    });

    it("should ignore undefined events", async () => {
      await instance.send("UNDEFINED_EVENT");
      expect(instance.current).toBe("idle");
    });

    it("should stay in current state for invalid event", async () => {
      await instance.send("STOP");
      expect(instance.current).toBe("idle");
    });

    it("should return empty result for invalid transition", async () => {
      const result = await instance.send("STOP");
      expect(result).toEqual({});
    });

    it("should handle valid transition after invalid", async () => {
      await instance.send("STOP");
      expect(instance.current).toBe("idle");
      await instance.send("START");
      expect(instance.current).toBe("running");
    });
  });

  describe("Self Transitions", () => {
    let machine;
    let instance;
    let active;

    beforeEach(() => {
      machine = createMachine("refresh");
      active = machine.state("active");
      active.on("REFRESH", active);
      machine.initial(active);
      instance = machine.start();
    });

    it("should allow transition to self", async () => {
      await instance.send("REFRESH");
      expect(instance.current).toBe("active");
    });

    it("should execute self transition multiple times", async () => {
      await instance.send("REFRESH");
      expect(instance.current).toBe("active");
      await instance.send("REFRESH");
      expect(instance.current).toBe("active");
    });
  });

  describe("Event Payload", () => {
    let machine;
    let instance;
    let idle;
    let active;
    let lastEvent;

    beforeEach(() => {
      machine = createMachine("test");
      idle = machine.state("idle");
      active = machine.state("active");

      idle.on("START", active).do((ctx, event) => {
        lastEvent = event;
      });

      machine.initial(idle);
      instance = machine.start();
    });

    it("should pass event type", async () => {
      await instance.send("START");
      expect(lastEvent.type).toBe("START");
    });

    it("should pass event payload properties", async () => {
      await instance.send("START", { id: 123, name: "test" });
      expect(lastEvent.type).toBe("START");
      expect(lastEvent.id).toBe(123);
      expect(lastEvent.name).toBe("test");
    });

    it("should handle empty payload", async () => {
      await instance.send("START");
      expect(lastEvent.type).toBe("START");
      expect(Object.keys(lastEvent).length).toBe(1);
    });
  });
});
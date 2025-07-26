/**
 * Action helper tests
 * Tests the action() helper function for creating named actions
 */

import { action } from "../dist/es/index.js";

describe("Action Helper", () => {
  describe("Basic Action Creation", () => {
    it("should create a function", () => {
      const myAction = action("myAction", () => {});
      expect(typeof myAction).toBe("function");
    });

    it("should preserve action name", () => {
      const myAction = action("myAction", () => {});
      expect(myAction.actionName).toBe("myAction");
    });

    it("should execute the provided function", () => {
      let called = false;
      const myAction = action("myAction", () => {
        called = true;
      });
      
      myAction();
      expect(called).toBe(true);
    });

    it("should pass arguments through", () => {
      let receivedArgs;
      const myAction = action("myAction", (...args) => {
        receivedArgs = args;
      });
      
      myAction("a", "b", "c");
      expect(receivedArgs).toEqual(["a", "b", "c"]);
    });

    it("should return function result", () => {
      const myAction = action("myAction", (a, b) => a + b);
      const result = myAction(2, 3);
      expect(result).toBe(5);
    });
  });

  describe("Validation", () => {
    it("should throw error when name is missing", () => {
      expect(() => action()).toThrow("Action name is required");
    });

    it("should throw error when name is empty", () => {
      expect(() => action("", () => {})).toThrow("Action name is required");
    });

    it("should throw error when name is not string", () => {
      expect(() => action(123, () => {})).toThrow("Action name is required");
    });

    it("should throw error when function is missing", () => {
      expect(() => action("myAction")).toThrow("Action function is required");
    });

    it("should throw error when function is not a function", () => {
      expect(() => action("myAction", "not a function")).toThrow(
        "Action function is required"
      );
    });
  });

  describe("Context and Event Usage", () => {
    it("should work with context parameter", () => {
      const updateCount = action("updateCount", (ctx) => {
        ctx.count = (ctx.count || 0) + 1;
      });
      
      const context = { count: 5 };
      updateCount(context);
      expect(context.count).toBe(6);
    });

    it("should work with context and event parameters", () => {
      const handleEvent = action("handleEvent", (ctx, event) => {
        ctx.lastEvent = event.type;
        ctx.eventData = event.data;
      });
      
      const context = {};
      const event = { type: "CLICK", data: { x: 10, y: 20 } };
      
      handleEvent(context, event);
      expect(context.lastEvent).toBe("CLICK");
      expect(context.eventData).toEqual({ x: 10, y: 20 });
    });
  });

  describe("Async Actions", () => {
    it("should work with async functions", async () => {
      const fetchData = action("fetchData", async (ctx) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        ctx.data = { loaded: true };
        return { success: true };
      });
      
      const context = {};
      const result = await fetchData(context);
      
      expect(context.data).toEqual({ loaded: true });
      expect(result).toEqual({ success: true });
    });

    it("should preserve async nature", () => {
      const asyncAction = action("asyncAction", async () => {
        return "async result";
      });
      
      const result = asyncAction();
      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe("Action Naming", () => {
    it("should accept any string name", () => {
      const action1 = action("simple", () => {});
      const action2 = action("with-dashes", () => {});
      const action3 = action("with_underscores", () => {});
      const action4 = action("with spaces", () => {});
      const action5 = action("with.dots", () => {});
      
      expect(action1.actionName).toBe("simple");
      expect(action2.actionName).toBe("with-dashes");
      expect(action3.actionName).toBe("with_underscores");
      expect(action4.actionName).toBe("with spaces");
      expect(action5.actionName).toBe("with.dots");
    });
  });

  describe("Error Propagation", () => {
    it("should propagate errors from action function", () => {
      const errorAction = action("errorAction", () => {
        throw new Error("Action error");
      });
      
      expect(() => errorAction()).toThrow("Action error");
    });

    it("should propagate async errors", async () => {
      const asyncError = action("asyncError", async () => {
        throw new Error("Async error");
      });
      
      await expect(asyncError()).rejects.toThrow("Async error");
    });
  });
});
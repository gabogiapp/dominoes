// ─── Snapshot-based undo ────────────────────────────────────────────
// Before every mutation, push a deep clone + human-readable description.
// Max 20 snapshots.

const MAX_SNAPSHOTS = 20;

export function createHistoryManager() {
  let stack = [];

  return {
    push(state, actionDescription) {
      const snapshot = {
        state: JSON.parse(JSON.stringify(state)),
        action: actionDescription,
        timestamp: Date.now(),
      };
      stack.push(snapshot);
      if (stack.length > MAX_SNAPSHOTS) {
        stack = stack.slice(stack.length - MAX_SNAPSHOTS);
      }
    },

    pop() {
      if (stack.length === 0) return null;
      return stack.pop();
    },

    peek() {
      if (stack.length === 0) return null;
      return stack[stack.length - 1];
    },

    getAll() {
      return [...stack];
    },

    size() {
      return stack.length;
    },

    canUndo() {
      return stack.length > 0;
    },

    clear() {
      stack = [];
    },
  };
}

export const mapStatus = (s) =>
  ({
    created: "pending",
    activated: "active",
    processed: "active",
    completed: "completed",
    cancelled: "cancelled",
  }[s] || s);

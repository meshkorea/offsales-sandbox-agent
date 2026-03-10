export type PermissionOption = {
  optionId: string;
  name: string;
  kind: string;
};

export type TimelineEntry = {
  id: string;
  eventId?: string; // Links back to the original event for navigation
  kind: "message" | "tool" | "meta" | "reasoning" | "permission";
  time: string;
  // For messages:
  role?: "user" | "assistant";
  text?: string;
  // For tool calls:
  toolName?: string;
  toolInput?: string;
  toolOutput?: string;
  toolStatus?: string;
  // For reasoning:
  reasoning?: { text: string; visibility?: string };
  // For meta:
  meta?: { title: string; detail?: string; severity?: "info" | "error" };
  // For permission requests:
  permission?: {
    permissionId: string;
    title: string;
    description?: string;
    options: PermissionOption[];
    resolved?: boolean;
    selectedOptionId?: string;
  };
};

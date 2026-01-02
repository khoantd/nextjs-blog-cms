import { inngest } from "./client";
import { actionsWithHandlers } from "./workflowActionHandlers";
import { actions } from "./workflowActions";

// Create a workflow kit compatible implementation
export default inngest.createFunction(
  { id: "blog-post-workflow" },
  // Triggers
  [{ event: "blog-post.updated" }, { event: "blog-post.published" }],
  async ({ event, step }) => {
    // Execute actions sequentially without nested step calls
    for (let i = 0; i < actionsWithHandlers.length; i++) {
      const actionHandler = actionsWithHandlers[i];
      const action = actions[i];
      
      if (actionHandler && action) {
        // Call the handler directly - it will manage its own steps
        await actionHandler.handler({ 
          event, 
          step, 
          workflowAction: {
            ...action,
            id: String(i + 1)
          },
          workflow: { actions: actions } as any,
          state: {} as any
        });
      }
    }
  }
);

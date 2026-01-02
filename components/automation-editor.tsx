"use client";
import { Editor, Provider, Sidebar } from "@inngest/workflow-kit/ui";
import { SaveIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState, useMemo, Component, ReactNode } from "react";

import { type Workflow } from "@/lib/types";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { updateWorkflow } from "@/app/actions";
import { actions } from "@/lib/inngest/workflowActions";

import "@inngest/workflow-kit/ui/ui.css";
import "@xyflow/react/dist/style.css";

/**
 * Validates and filters edges to only include those that reference existing nodes
 * @param edges - Array of edges to validate
 * @param validNodeIds - Set of valid node IDs (including $source and $sink)
 * @returns Array of valid edges with normalized node IDs
 */
function validateAndFilterEdges(
  edges: Array<{ id?: string; from: string | number; to: string | number }>,
  validNodeIds: Set<string>
): Array<{ id?: string; from: string; to: string }> {
  if (!Array.isArray(edges)) {
    console.warn('validateAndFilterEdges: edges is not an array', edges);
    return [];
  }
  
  if (!validNodeIds || validNodeIds.size === 0) {
    console.warn('validateAndFilterEdges: validNodeIds is empty or invalid', validNodeIds);
    return [];
  }
  
  const invalidEdges: Array<{ from: string | number; to: string | number }> = [];
  
  const validEdges = edges
    .filter((edge) => {
      // Ensure edge exists and is an object
      if (!edge || typeof edge !== 'object') {
        return false;
      }
      
      // Ensure edge has required properties (from and to must be defined and not null)
      if (edge.from === undefined || edge.from === null || edge.to === undefined || edge.to === null) {
        return false;
      }
      
      // Normalize node IDs to strings for consistent comparison
      const from = String(edge.from).trim();
      const to = String(edge.to).trim();
      
      // Reject empty strings
      if (from === '' || to === '') {
        return false;
      }
      
      // Check if both nodes exist in the valid node set
      const fromExists = validNodeIds.has(from);
      const toExists = validNodeIds.has(to);
      
      if (!fromExists || !toExists) {
        invalidEdges.push({ from, to });
        return false;
      }
      
      return true;
    })
    .map((edge) => ({
      id: edge.id || `edge-${String(edge.from)}-${String(edge.to)}`,
      from: String(edge.from).trim(),
      to: String(edge.to).trim(),
    }));
  
  // Log invalid edges for debugging
  if (invalidEdges.length > 0) {
    console.warn('Filtered out invalid edges:', invalidEdges, 'Valid node IDs:', Array.from(validNodeIds));
  }
  
  return validEdges;
}

/**
 * Error Boundary component to catch layout errors from the workflow kit
 */
class WorkflowEditorErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Workflow Editor Error:', error, errorInfo);
    // Log additional context about the error
    if (error.message?.includes('dagreNode') || error.message?.includes('node')) {
      console.error('Dagre layout error detected. This usually indicates a mismatch between edge references and node IDs.');
      console.error('Error stack:', error.stack);
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex flex-col items-center justify-center h-full p-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
            <h3 className="text-lg font-semibold text-red-800 mb-2">
              Workflow Editor Error
            </h3>
            <p className="text-sm text-red-700 mb-4">
              An error occurred while rendering the workflow editor. This may be due to invalid workflow data.
            </p>
            {this.state.error && (
              <details className="mt-4">
                <summary className="text-sm text-red-600 cursor-pointer">
                  Error Details
                </summary>
                <pre className="mt-2 text-xs text-red-600 overflow-auto bg-red-100 p-2 rounded">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export const AutomationEditor = ({ workflow }: { workflow: Workflow }) => {
  const router = useRouter();
  const [workflowDraft, updateWorkflowDraft] =
    useState<typeof workflow>(workflow);

  const onSaveWorkflow = useCallback(async () => {
    await updateWorkflow(workflowDraft);
    router.push("/workflows");
  }, [router, workflowDraft]);

  // Transform and validate workflow data
  const { uiWorkflow, isValid } = useMemo(() => {
    try {
      // Transform workflow to match expected format for Inngest UI
      const transformedWorkflow = {
        ...workflowDraft,
        created_at: workflowDraft.createdAt instanceof Date 
          ? workflowDraft.createdAt.toISOString() 
          : workflowDraft.createdAt,
      };

      // Convert database format to Inngest UI format
      const workflowData = (transformedWorkflow.workflow as any) || {};
      
      // Handle empty or null workflow data
      if (!workflowData || (typeof workflowData !== 'object')) {
        return {
          uiWorkflow: {
            name: workflowDraft.name || 'Untitled Workflow',
            description: workflowDraft.description || '',
            actions: [],
            edges: [],
          },
          isValid: true,
        };
      }
      
      // Convert actions to steps format if needed
      const rawSteps = workflowData.steps || workflowData.actions || [];
      
      // Normalize all node IDs to strings consistently
      const steps = Array.isArray(rawSteps) 
        ? rawSteps
            .filter((action: any) => action != null) // Filter out null/undefined
            .map((action: any, index: number) => {
              // Normalize ID to string - handle both string and number IDs
              const stepId = action.id != null 
                ? String(action.id) 
                : String(index + 1);
              
              // Ensure required fields are present
              return {
                id: stepId,
                name: action.name || `Step ${index + 1}`,
                kind: action.kind || action.type || '',
                description: action.description || '',
                inputs: action.inputs || action.config || {},
              };
            })
        : [];

      // Create set of valid node IDs AFTER normalization (all as strings)
      const validNodeIds = new Set<string>(['$source', '$sink', ...steps.map(s => String(s.id))]);
      
      // Get edges from workflow data
      const rawEdges = Array.isArray(workflowData.edges) ? workflowData.edges : [];
      
      // If we have steps but no edges, create default sequential edges
      let edges = [...rawEdges];
      if (steps.length > 0 && edges.length === 0) {
        // Add edge from source to first step
        edges.push({
          id: `edge-source-${steps[0].id}`,
          from: "$source",
          to: String(steps[0].id),
        });
        
        // Add edges between steps
        for (let i = 0; i < steps.length - 1; i++) {
          edges.push({
            id: `edge-${steps[i].id}-${steps[i + 1].id}`,
            from: String(steps[i].id),
            to: String(steps[i + 1].id),
          });
        }
        
        // Add edge from last step to sink
        edges.push({
          id: `edge-${steps[steps.length - 1].id}-sink`,
          from: String(steps[steps.length - 1].id),
          to: "$sink",
        });
      }
      
      // Validate and filter edges AFTER action transformation to ensure all references are valid
      const validEdges = validateAndFilterEdges(edges, validNodeIds);
      
      // Additional validation: ensure edges don't reference non-existent actions
      const actionIds = new Set(steps.map(s => String(s.id)));
      const edgesWithInvalidNodes = validEdges.filter(edge => {
        const fromInvalid = edge.from !== '$source' && !actionIds.has(edge.from);
        const toInvalid = edge.to !== '$sink' && !actionIds.has(edge.to);
        return fromInvalid || toInvalid;
      });
      
      if (edgesWithInvalidNodes.length > 0) {
        console.warn('Found edges referencing invalid nodes:', edgesWithInvalidNodes);
      }

      // Defensive checks: verify workflow structure before passing to Inngest UI
      // Ensure all actions have required fields
      const validActions = steps.filter(action => {
        const hasRequiredFields = action.id && action.kind && action.name;
        if (!hasRequiredFields) {
          console.warn('Action missing required fields:', action);
        }
        return hasRequiredFields;
      });
      
      // Ensure edges array is properly formatted
      const properlyFormattedEdges = validEdges.filter(edge => {
        const isValid = edge.from && edge.to && 
                       typeof edge.from === 'string' && 
                       typeof edge.to === 'string';
        if (!isValid) {
          console.warn('Edge has invalid format:', edge);
        }
        return isValid;
      });
      
      // Handle case where workflow has edges but no actions (orphaned edges)
      if (properlyFormattedEdges.length > 0 && validActions.length === 0) {
        console.warn('Workflow has edges but no valid actions. Removing orphaned edges.');
        properlyFormattedEdges.length = 0;
      }
      
      // Create the workflow object expected by the UI
      const uiWorkflow = {
        name: workflowDraft.name || 'Untitled Workflow',
        description: workflowDraft.description || '',
        actions: validActions,
        edges: properlyFormattedEdges,
      };

      // Final validation: ensure all edge node IDs exist in actions
      // Normalize all action IDs to strings for consistent comparison
      const normalizedActions = validActions.map(action => ({
        ...action,
        id: String(action.id).trim(), // Ensure ID is always a normalized string
      }));
      
      const finalNodeIds = new Set<string>(['$source', '$sink', ...normalizedActions.map(a => a.id)]);
      const finalValidEdges = properlyFormattedEdges.filter(edge => {
        // Normalize edge node IDs for comparison
        const fromNormalized = String(edge.from).trim();
        const toNormalized = String(edge.to).trim();
        
        const fromValid = finalNodeIds.has(fromNormalized);
        const toValid = finalNodeIds.has(toNormalized);
        if (!fromValid || !toValid) {
          console.error('Edge references non-existent node:', edge, {
            fromNormalized,
            toNormalized,
            validNodes: Array.from(finalNodeIds)
          });
        }
        return fromValid && toValid;
      }).map(edge => ({
        ...edge,
        from: String(edge.from).trim(),
        to: String(edge.to).trim(),
      }));

      return { 
        uiWorkflow: {
          ...uiWorkflow,
          actions: normalizedActions,
          edges: finalValidEdges,
        }, 
        isValid: true 
      };
    } catch (error) {
      console.error('Error processing workflow data:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        // Check if this is a dagre-related error
        if (error.message?.includes('dagreNode') || error.message?.includes('node')) {
          console.error('Dagre layout error detected during workflow processing. This may indicate:');
          console.error('1. Node ID mismatch between edges and actions');
          console.error('2. Missing nodes referenced in edges');
          console.error('3. Type inconsistency in node IDs (string vs number)');
        }
      }
      // Return a safe default workflow structure
      return {
        uiWorkflow: {
          name: workflowDraft.name || 'Untitled Workflow',
          description: workflowDraft.description || '',
          actions: [],
          edges: [],
        },
        isValid: false,
      };
    }
  }, [workflowDraft]);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Automation Editor</h2>
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{workflow.name}</CardTitle>
              <CardDescription>{workflow.description}</CardDescription>
            </div>
            <Button onClick={onSaveWorkflow}>
              <SaveIcon className="mr-2 h-4 w-4" /> Save changes
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-svh max-h-[500px]">
            {!isValid && (
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  Warning: Workflow data contains invalid structure. Showing empty workflow.
                </p>
              </div>
            )}
            <WorkflowEditorErrorBoundary>
              {workflowDraft.trigger ? (
                (() => {
                  // Final defensive check before rendering - CRITICAL to prevent dagre errors
                  const actionIds = new Set(uiWorkflow.actions.map(a => String(a.id)));
                  const validNodeIds = new Set<string>(['$source', '$sink', ...Array.from(actionIds)]);
                  
                  // Filter edges to only include those that reference existing nodes
                  // This is the final safety check before passing to dagre
                  const safeEdges = uiWorkflow.edges.filter(edge => {
                    const fromValid = validNodeIds.has(String(edge.from));
                    const toValid = validNodeIds.has(String(edge.to));
                    
                    if (!fromValid || !toValid) {
                      console.warn('Filtering out invalid edge before rendering:', edge, {
                        fromValid,
                        toValid,
                        validNodes: Array.from(validNodeIds)
                      });
                      return false;
                    }
                    return true;
                  });
                  
                  // Create a safe workflow object with only valid edges
                  const safeWorkflow = {
                    ...uiWorkflow,
                    edges: safeEdges,
                  };
                  
                  // Additional validation: ensure all action IDs are strings and unique
                  const safeActions = uiWorkflow.actions.map(action => ({
                    ...action,
                    id: String(action.id), // Ensure ID is always a string
                  }));
                  
                  const finalSafeWorkflow = {
                    ...safeWorkflow,
                    actions: safeActions,
                  };
                  
                  return (
                    <Provider
                      key={workflowDraft?.id}
                      workflow={finalSafeWorkflow as any}
                      trigger={{
                        event: {
                          name: workflowDraft.trigger,
                        },
                      }}
                      availableActions={actions}
                      onChange={(updated) => {
                        updateWorkflowDraft({
                          ...workflowDraft,
                          workflow: updated as any,
                        });
                      }}
                    >
                      <Editor>
                        <Sidebar position="right" />
                      </Editor>
                    </Provider>
                  );
                })()
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500">No trigger configured for this workflow</p>
                </div>
              )}
            </WorkflowEditorErrorBoundary>
          </div>
          <CardFooter className="flex justify-end align-bottom gap-4"></CardFooter>
        </CardContent>
      </Card>
    </div>
  );
};

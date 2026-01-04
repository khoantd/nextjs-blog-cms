"use client";
import { useState } from "react";
import { PlayIcon, ChevronDownIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { workflowTemplates } from "@/lib/workflow-templates";

interface WorkflowSelectorProps {
  blogPostId: string;
  onWorkflowSelect: (workflowName: string) => Promise<{ success: boolean; message: string; alreadyApplied?: boolean }>;
  disabled?: boolean;
  appliedWorkflows?: string[]; // Array of already applied workflow names
}

export const WorkflowSelector = ({ blogPostId, onWorkflowSelect, disabled, appliedWorkflows = [] }: WorkflowSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>("");
  const [isApplying, setIsApplying] = useState(false);

  const handleApplyWorkflow = async () => {
    if (!selectedWorkflow) return;
    
    setIsApplying(true);
    try {
      await onWorkflowSelect(selectedWorkflow);
      setIsOpen(false);
      setSelectedWorkflow("");
    } catch (error) {
      console.error("Failed to apply workflow:", error);
    } finally {
      setIsApplying(false);
    }
  };

  const handleQuickApply = async (workflowName: string) => {
    console.log(`🎯 Quick applying workflow: ${workflowName} to blog post: ${blogPostId}`);
    setIsApplying(true);
    try {
      const result = await onWorkflowSelect(workflowName);
      console.log(`✅ Workflow applied successfully: ${workflowName}`, result);
      
      // Show appropriate message based on result
      if (result && typeof result === 'object' && 'alreadyApplied' in result && result.alreadyApplied) {
        alert(`⚠️ ${result.message || 'Workflow was already applied'}`);
      } else {
        alert(`✅ ${result?.message || `Workflow "${workflowName}" applied successfully!`}`);
      }
    } catch (error) {
      console.error(`❌ Failed to apply workflow: ${workflowName}`, error);
      alert(`❌ Failed to apply workflow: ${error}`);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={disabled || isApplying}>
            <PlayIcon className="mr-2 h-4 w-4" />
            {isApplying ? "Applying..." : "Apply Workflow"}
            <ChevronDownIcon className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {workflowTemplates.map((workflow) => {
            const isApplied = appliedWorkflows.includes(workflow.name);
            return (
              <DropdownMenuItem
                key={workflow.name}
                onClick={() => handleQuickApply(workflow.name)}
                disabled={isApplying || isApplied}
                className={isApplied ? "opacity-50" : ""}
              >
                <div className="flex flex-col w-full">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{workflow.name}</span>
                    {isApplied && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        Applied
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">{workflow.description}</span>
                </div>
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuItem
            onClick={() => setIsOpen(true)}
            disabled={isApplying}
          >
            <div className="flex flex-col">
              <span className="font-medium">Choose with Details...</span>
              <span className="text-xs text-gray-500">View workflow steps before applying</span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Apply Workflow to Blog Post</DialogTitle>
          <DialogDescription>
            Choose a workflow to automate the processing of this blog post. Each workflow has different steps and triggers.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {workflowTemplates.map((workflow) => (
            <div
              key={workflow.name}
              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                selectedWorkflow === workflow.name
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
              onClick={() => setSelectedWorkflow(workflow.name)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-sm mb-1">{workflow.name}</h3>
                  <p className="text-xs text-gray-600 mb-2">{workflow.description}</p>
                  <div className="text-xs text-gray-500">
                    <span className="font-medium">Trigger:</span> {workflow.trigger}
                  </div>
                  <div className="mt-2">
                    <span className="text-xs font-medium text-gray-700">Steps:</span>
                    <ol className="mt-1 space-y-1">
                      {workflow.steps.map((step, index) => (
                        <li key={step.id} className="text-xs text-gray-600 flex items-center">
                          <span className="w-4 h-4 bg-gray-200 rounded-full flex items-center justify-center mr-2 text-xs">
                            {index + 1}
                          </span>
                          {step.name}
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
                <div className="ml-4">
                  <input
                    type="radio"
                    checked={selectedWorkflow === workflow.name}
                    onChange={() => setSelectedWorkflow(workflow.name)}
                    className="w-4 h-4 text-blue-600"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleApplyWorkflow}
            disabled={!selectedWorkflow || isApplying}
          >
            {isApplying ? "Applying..." : "Apply Workflow"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

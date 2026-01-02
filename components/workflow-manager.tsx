"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { workflowTemplates, formatWorkflowAsJson, availableActions } from "@/lib/workflow-templates";

interface Workflow {
  id: number;
  name: string;
  description?: string;
  trigger: string;
  enabled: boolean;
  createdAt: string;
  workflow: any;
}

interface WorkflowFormData {
  name: string;
  description: string;
  trigger: string;
  workflow: string;
  enabled: boolean;
}

export default function WorkflowManager() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [formData, setFormData] = useState<WorkflowFormData>({
    name: "",
    description: "",
    trigger: "",
    workflow: "",
    enabled: false
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    try {
      const response = await fetch("/api/workflows");
      const data = await response.json();
      setWorkflows(data.workflows || []);
    } catch (error) {
      console.error("Failed to fetch workflows:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      trigger: "",
      workflow: "",
      enabled: false,
    });
    setSelectedTemplate("");
  };

  const handleTemplateSelect = (templateName: string) => {
    const template = workflowTemplates.find(t => t.name === templateName);
    if (template) {
      setFormData({
        name: template.name,
        description: template.description,
        trigger: template.trigger,
        workflow: formatWorkflowAsJson(template),
        enabled: false,
      });
      setSelectedTemplate(templateName);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      let workflowData;
      try {
        workflowData = JSON.parse(formData.workflow);
      } catch (error) {
        alert("Invalid JSON in workflow definition");
        return;
      }

      const response = await fetch("/api/workflows", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          workflow: workflowData,
        }),
      });

      if (response.ok) {
        await fetchWorkflows();
        setShowCreateForm(false);
        resetForm();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to create workflow");
      }
    } catch (error) {
      console.error("Failed to create workflow:", error);
      alert("Failed to create workflow");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleWorkflow = async (id: number, enabled: boolean) => {
    try {
      const response = await fetch(`/api/workflows/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ enabled }),
      });

      if (response.ok) {
        await fetchWorkflows();
      } else {
        alert("Failed to update workflow");
      }
    } catch (error) {
      console.error("Failed to update workflow:", error);
      alert("Failed to update workflow");
    }
  };

  const deleteWorkflow = async (id: number) => {
    if (!confirm("Are you sure you want to delete this workflow?")) {
      return;
    }

    try {
      const response = await fetch(`/api/workflows/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchWorkflows();
      } else {
        alert("Failed to delete workflow");
      }
    } catch (error) {
      console.error("Failed to delete workflow:", error);
      alert("Failed to delete workflow");
    }
  };

  if (loading) {
    return <div className="p-6">Loading workflows...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Workflow Management</h1>
        <Button onClick={() => setShowCreateForm(true)}>
          Create New Workflow
        </Button>
      </div>

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Workflow</CardTitle>
            <CardDescription>
              Define a new workflow with triggers and steps, or start from a template
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                Start with a template (optional)
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {workflowTemplates.map((template) => (
                  <Button
                    key={template.name}
                    variant={selectedTemplate === template.name ? "default" : "outline"}
                    className="h-auto p-3 text-left"
                    onClick={() => handleTemplateSelect(template.name)}
                  >
                    <div>
                      <div className="font-medium">{template.name}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {template.description}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {template.steps.length} steps
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Workflow Name
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., blog-review-workflow"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Description
                </label>
                <Input
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Brief description of the workflow"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Trigger Event
                </label>
                <Input
                  value={formData.trigger}
                  onChange={(e) =>
                    setFormData({ ...formData, trigger: e.target.value })
                  }
                  placeholder="e.g., blog-post.created"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Workflow Definition (JSON)
                </label>
                <div className="mb-2">
                  <div className="text-xs text-muted-foreground">
                    Available actions: {availableActions.map(action => action.kind).join(", ")}
                  </div>
                </div>
                <textarea
                  value={formData.workflow}
                  onChange={(e) =>
                    setFormData({ ...formData, workflow: e.target.value })
                  }
                  placeholder={`{
  "steps": [
    {
      "id": "1",
      "kind": "add_ToC",
      "name": "Add Table of Contents"
    }
  ]
}`}
                  className="w-full h-32 p-3 border rounded-md font-mono text-sm"
                  required
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="enabled"
                  checked={formData.enabled}
                  onChange={(e) =>
                    setFormData({ ...formData, enabled: e.target.checked })
                  }
                />
                <label htmlFor="enabled" className="text-sm font-medium">
                  Enable workflow immediately
                </label>
              </div>

              <div className="flex space-x-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Creating..." : "Create Workflow"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateForm(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {workflows.map((workflow) => (
          <Card key={workflow.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {workflow.name}
                    <Badge variant={workflow.enabled ? "default" : "secondary"}>
                      {workflow.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="mt-2">
                    {workflow.description || "No description"}
                  </CardDescription>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      toggleWorkflow(workflow.id, !workflow.enabled)
                    }
                  >
                    {workflow.enabled ? "Disable" : "Enable"}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteWorkflow(workflow.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div>
                  <strong>Trigger:</strong> {workflow.trigger}
                </div>
                <div>
                  <strong>Created:</strong>{" "}
                  {new Date(workflow.createdAt).toLocaleDateString()}
                </div>
                <div>
                  <strong>Steps:</strong>{" "}
                  {workflow.workflow?.steps?.length || 0} steps defined
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {workflows.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">
                No workflows found. Create your first workflow to get started.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

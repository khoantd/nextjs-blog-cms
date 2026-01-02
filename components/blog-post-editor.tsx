"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { SaveIcon, Eye, Edit3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface BlogPostEditorProps {
  initialData?: {
    id?: number;
    title?: string;
    subtitle?: string;
    markdown?: string;
  };
  isEdit?: boolean;
}

export const BlogPostEditor = ({ initialData, isEdit = false }: BlogPostEditorProps) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState(initialData?.title || "");
  const [subtitle, setSubtitle] = useState(initialData?.subtitle || "");
  const [markdown, setMarkdown] = useState(initialData?.markdown || "");

  const saveBlogPost = useCallback(async () => {
    if (!title.trim() || !markdown.trim()) {
      alert("Please fill in both title and content");
      return;
    }

    setLoading(true);
    try {
      const url = isEdit ? `/api/blog-posts/${initialData?.id}` : "/api/blog-posts";
      const method = isEdit ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          subtitle,
          markdown,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save blog post");
      }

      router.push("/");
    } catch (error) {
      console.error("Error saving blog post:", error);
      alert("Failed to save blog post. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [title, subtitle, markdown, isEdit, initialData?.id, router]);

  const renderPreview = useCallback(() => {
    if (!markdown) return <p className="text-gray-500">No content to preview</p>;
    
    return (
      <div className="prose prose-sm max-w-none">
        {markdown.split('\n').map((line, index) => {
          if (line.startsWith('# ')) {
            return <h1 key={index} className="text-2xl font-bold mt-4 mb-2">{line.slice(2)}</h1>;
          } else if (line.startsWith('## ')) {
            return <h2 key={index} className="text-xl font-semibold mt-3 mb-2">{line.slice(3)}</h2>;
          } else if (line.startsWith('### ')) {
            return <h3 key={index} className="text-lg font-medium mt-2 mb-1">{line.slice(4)}</h3>;
          } else if (line.startsWith('- ')) {
            return <li key={index} className="ml-4">{line.slice(2)}</li>;
          } else if (line.trim() === '') {
            return <br key={index} />;
          } else {
            return <p key={index} className="mb-2">{line}</p>;
          }
        })}
      </div>
    );
  }, [markdown]);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">
          {isEdit ? "Edit Blog Post" : "Create New Blog Post"}
        </h2>
        <Button 
          onClick={saveBlogPost} 
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <SaveIcon className="mr-2 h-4 w-4" />
          {loading ? "Saving..." : (isEdit ? "Update" : "Save")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Blog Post Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
              placeholder="Enter blog post title"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subtitle">Subtitle</Label>
            <Input
              id="subtitle"
              value={subtitle}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSubtitle(e.target.value)}
              placeholder="Enter blog post subtitle (optional)"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label>Content *</Label>
            <Tabs defaultValue="edit" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="edit">
                  <Edit3 className="mr-2 h-4 w-4" />
                  Edit
                </TabsTrigger>
                <TabsTrigger value="preview">
                  <Eye className="mr-2 h-4 w-4" />
                  Preview
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="edit" className="mt-4">
                <Textarea
                  value={markdown}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMarkdown(e.target.value)}
                  placeholder="Write your blog post content in markdown format..."
                  className="min-h-[400px] font-mono"
                  disabled={loading}
                />
              </TabsContent>
              
              <TabsContent value="preview" className="mt-4">
                <div className="border rounded-md p-4 min-h-[400px] bg-gray-50">
                  {renderPreview()}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

"use client";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { SaveIcon, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { approveBlogPostAiSuggestions, publishBlogPost, sendBlogPostToReview, revertBlogPostFromReview } from "@/app/actions";

export const BlogPostActions = ({ id }: { id: string }) => {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const executeAction = useCallback(async (actionName: string, action: () => Promise<void>) => {
    try {
      setLoading(actionName);
      await action();
      router.push("/");
    } catch (error) {
      console.error(`Error in ${actionName}:`, error);
      alert(`Failed to ${actionName}. Please try again.`);
    } finally {
      setLoading(null);
    }
  }, [router]);

  const approve = useCallback(async () => {
    await executeAction("approve", () => approveBlogPostAiSuggestions(id));
  }, [id, executeAction]);

  const discardAndPublish = useCallback(async () => {
    await executeAction("publish", () => publishBlogPost(id));
  }, [id, executeAction]);

  const sendToReview = useCallback(async () => {
    await executeAction("review", () => sendBlogPostToReview(id));
  }, [id, executeAction]);

  const revertFromReview = useCallback(async () => {
    await executeAction("revert", () => revertBlogPostFromReview(id));
  }, [id, executeAction]);

  const goToPreviousStep = useCallback(async () => {
    await executeAction("previous", () => sendBlogPostToReview(id));
  }, [id, executeAction]);

  const goToNextStep = useCallback(async () => {
    await executeAction("next", () => publishBlogPost(id));
  }, [id, executeAction]);

  return (
    <div className="flex gap-2 flex-wrap">
      <Button variant={"outline"} onClick={goToPreviousStep} disabled={loading !== null}>
        <ChevronLeft className="mr-2 h-4 w-4" /> 
        {loading === "previous" ? "Loading..." : "Previous Step"}
      </Button>
      <Button variant={"outline"} onClick={goToNextStep} disabled={loading !== null}>
        {loading === "next" ? "Loading..." : "Next Step"} <ChevronRight className="ml-2 h-4 w-4" />
      </Button>
      <div className="flex gap-2 ml-auto">
        <Button variant={"outline"} onClick={revertFromReview} disabled={loading !== null}>
          <SaveIcon className="mr-2 h-4 w-4" /> 
          {loading === "revert" ? "Loading..." : "Back to Draft"}
        </Button>
        <Button variant={"secondary"} onClick={discardAndPublish} disabled={loading !== null}>
          <SaveIcon className="mr-2 h-4 w-4" /> 
          {loading === "publish" ? "Loading..." : "Skip AI & Publish"}
        </Button>
        <Button className="bg-green-600 hover:bg-green-700" onClick={approve} disabled={loading !== null}>
          <SaveIcon className="mr-2 h-4 w-4" /> 
          {loading === "approve" ? "Loading..." : "Approve & Publish"}
        </Button>
      </div>
    </div>
  );
};

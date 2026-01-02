"use client";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { SaveIcon } from "lucide-react";
import { useSession } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { approveBlogPostAiSuggestions, publishBlogPost, sendBlogPostToReview, revertBlogPostFromReview, unpublishBlogPost } from "@/app/actions";
import { canEditPost } from "@/lib/auth";

export const BlogPostActions = ({ id, status }: { id: string; status?: string }) => {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const { data: session } = useSession();

  const hasEditPermission = session?.user?.role ? canEditPost(session.user.role) : false;

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

  const unpublish = useCallback(async () => {
    await executeAction("unpublish", () => unpublishBlogPost(id));
  }, [id, executeAction]);

  if (!hasEditPermission) {
    return (
      <div className="text-sm text-gray-500 italic">
        You don&apos;t have permission to edit blog posts. Contact an admin for editor access.
      </div>
    );
  }

  return (
    <div className="flex gap-2 flex-wrap">
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
        {status === "published" && (
          <Button variant="destructive" onClick={unpublish} disabled={loading !== null}>
            <SaveIcon className="mr-2 h-4 w-4" />
            {loading === "unpublish" ? "Loading..." : "Unpublish"}
          </Button>
        )}
      </div>
    </div>
  );
};

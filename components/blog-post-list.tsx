"use client";
/* eslint-disable react-hooks/exhaustive-deps */

import Link from "next/link";
import useSWR from "swr";
import { CalendarIcon, Edit, Eye, RocketIcon, Plus } from "lucide-react";
import { useSession } from "next-auth/react";

import { type BlogPost, type BlogPostStatus } from "@/lib/types";
import { ApiResponse, fetcher } from "@/lib/utils";
import { canCreatePost, canEditPost } from "@/lib/auth";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { capitalize } from "@/lib/utils";
import { sendBlogPostToReview } from "@/app/actions";

export const BlogPostList = () => {
  const { data: session } = useSession();
  const { data, error, isLoading } = useSWR<ApiResponse<{ blogPosts: BlogPost[] }>>(
    "/api/blog-posts",
    fetcher,
    {
      refreshInterval: 5000,
      errorRetryCount: 3,
      errorRetryInterval: 2000,
      onError: (error: Error) => {
        console.error("Failed to fetch blog posts:", error);
      }
    }
  );

  // Permission checks
  const userRole = session?.user?.role;
  const canCreate = userRole ? canCreatePost(userRole) : false;
  const canEdit = userRole ? canEditPost(userRole) : false;

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">Failed to load blog posts. Please try again later.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Loading blog posts...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Blog Posts</h2>
        {canCreate && (
          <Button asChild>
            <Link href="/blog-post/create">
              <Plus className="mr-2 h-4 w-4" /> Create New Blog Post
            </Link>
          </Button>
        )}
      </div>
      <div className="grid gap-6">
        {(data?.data?.blogPosts || []).map((blogPost) => (
          <Card key={blogPost.id}>
            <CardHeader className="flex flex-row">
              <div className="flex-1">
                <CardTitle>{blogPost.title}</CardTitle>
                <CardDescription>{blogPost.subtitle}</CardDescription>
              </div>
              {blogPost.status === "needs approval" && (
                <div className="flex">
                  <Badge variant="secondary">
                    An AI revision need approval
                  </Badge>
                </div>
              )}
              {blogPost.aiPublishingRecommendations && (
                <div className="flex">
                  <Badge variant="secondary">
                    Publishing recommendations are available
                  </Badge>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-muted-foreground">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {new Date(blogPost.createdAt).toLocaleDateString()}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between gap-2">
              <div className="flex gap-2">
                <div
                  className={`px-2 py-1 rounded-full text-xs ${
                    blogPost.status === "published"
                      ? "bg-green-100 text-green-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {capitalize(blogPost.status || 'draft')}
                </div>
                {canEdit && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/blog-post/${blogPost.id}/edit`}>
                      <Edit className="mr-2 h-4 w-4" /> Edit
                    </Link>
                  </Button>
                )}
              </div>
              {canEdit ? (
                <>
                  {blogPost.markdownAiRevision ? (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/blog-post/${blogPost.id}`}>
                        <Edit className="mr-2 h-4 w-4" /> Review
                      </Link>
                    </Button>
                  ) : blogPost.status === "draft" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => sendBlogPostToReview(blogPost.id.toString())}
                    >
                      <RocketIcon className="mr-2 h-4 w-4" /> Send to review
                    </Button>
                  ) : blogPost.status === "under review" ? (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/blog-post/${blogPost.id}`}>
                        <Edit className="mr-2 h-4 w-4" /> Review
                      </Link>
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/blog-post/${blogPost.id}`}>
                        <Eye className="mr-2 h-4 w-4" /> View
                      </Link>
                    </Button>
                  )}
                </>
              ) : (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/blog-post/${blogPost.id}`}>
                    <Eye className="mr-2 h-4 w-4" /> View
                  </Link>
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};

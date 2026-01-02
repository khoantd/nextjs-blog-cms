# Feature Development Guidelines

This guide provides step-by-step instructions for adding new features to the Next.js Blog CMS while maintaining code quality, type safety, and architectural consistency.

## Table of Contents
1. [Pre-Development Checklist](#pre-development-checklist)
2. [Backend Development](#backend-development)
3. [Frontend Development](#frontend-development)
4. [Testing Guidelines](#testing-guidelines)
5. [Code Review Checklist](#code-review-checklist)
6. [Example Feature Implementation](#example-feature-implementation)

## Pre-Development Checklist

### 1. Requirements Analysis
- [ ] Define clear feature requirements and acceptance criteria
- [ ] Identify data model changes needed
- [ ] Plan API endpoints required
- [ ] Consider UI/UX implications
- [ ] Review security implications

### 2. Technical Planning
- [ ] Review existing patterns in similar features
- [ ] Plan database schema changes
- [ ] Design API contracts
- [ ] Identify reusable components
- [ ] Plan error handling strategy

### 3. Environment Setup
- [ ] Create feature branch from main
- [ ] Ensure dependencies are up to date
- [ ] Run existing tests to ensure green build
- [ ] Set up local development environment

## Backend Development

### 1. Database Schema Updates

#### Adding New Models
```typescript
// In prisma/schema.prisma
model NewFeature {
  id          Int      @id @default(autoincrement())
  title       String
  description String?
  status      String   @default("draft")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  
  // Relations
  blogPostId  Int?
  blogPost    BlogPost? @relation(fields: [blogPostId], references: [id])
  
  @@map("new_features")
}
```

#### Updating Existing Models
```typescript
// Add new fields to existing models
model BlogPost {
  // ... existing fields
  newFeatureId Int?
  newFeature   NewFeature? @relation(fields: [newFeatureId], references: [id])
}
```

#### Type Definitions
```typescript
// In lib/types.ts
export type NewFeatureStatus = 'draft' | 'active' | 'archived';

export type NewFeature = {
  id: number;
  title: string;
  description: string | null;
  status: NewFeatureStatus;
  createdAt: Date | string;
  updatedAt: Date | string;
  blogPostId?: number | null;
};

// Input types for mutations
export type CreateNewFeatureInput = {
  title: string;
  description?: string;
  blogPostId?: number;
};

export type UpdateNewFeatureInput = Partial<CreateNewFeatureInput>;
```

### 2. Validation Schemas

```typescript
// In lib/validation.ts
import { z } from 'zod';

export const createNewFeatureSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  blogPostId: z.number().positive().optional(),
});

export const updateNewFeatureSchema = createNewFeatureSchema.partial();

export const newFeatureIdSchema = z.string().regex(/^\d+$/, 'Invalid ID');

// Type inference
export type CreateNewFeatureInput = z.infer<typeof createNewFeatureSchema>;
export type UpdateNewFeatureInput = z.infer<typeof updateNewFeatureSchema>;
```

### 3. Service Layer Implementation

```typescript
// In app/actions.ts or create new service file
class NewFeatureService {
  static async create(data: CreateNewFeatureInput) {
    try {
      const validatedData = validateInput(createNewFeatureSchema, data);
      
      const newFeature = await prisma.newFeature.create({
        data: {
          ...validatedData,
          status: 'draft',
        },
        include: {
          blogPost: true,
        },
      });
      
      // Send workflow events if needed
      await inngest.send({
        name: 'new-feature.created',
        data: { id: newFeature.id.toString() },
      });
      
      return newFeature;
    } catch (error) {
      logError(error as Error, { action: 'createNewFeature', data });
      throw new DatabaseError('Failed to create new feature', error as Error);
    }
  }

  static async update(id: string, data: UpdateNewFeatureInput) {
    try {
      const validatedId = validateInput(newFeatureIdSchema, id);
      const validatedData = validateInput(updateNewFeatureSchema, data);
      
      return await prisma.newFeature.update({
        where: { id: Number(validatedId) },
        data: validatedData,
        include: {
          blogPost: true,
        },
      });
    } catch (error) {
      logError(error as Error, { action: 'updateNewFeature', id, data });
      throw new DatabaseError('Failed to update new feature', error as Error);
    }
  }

  static async delete(id: string) {
    try {
      const validatedId = validateInput(newFeatureIdSchema, id);
      
      return await prisma.newFeature.delete({
        where: { id: Number(validatedId) },
      });
    } catch (error) {
      logError(error as Error, { action: 'deleteNewFeature', id });
      throw new DatabaseError('Failed to delete new feature', error as Error);
    }
  }

  static async findById(id: string) {
    try {
      const validatedId = validateInput(newFeatureIdSchema, id);
      
      return await prisma.newFeature.findUnique({
        where: { id: Number(validatedId) },
        include: {
          blogPost: true,
        },
      });
    } catch (error) {
      logError(error as Error, { action: 'findById', id });
      throw new DatabaseError('Failed to find new feature', error as Error);
    }
  }

  static async findAll(options: {
    page?: number;
    limit?: number;
    status?: string;
  } = {}) {
    try {
      const { page = 1, limit = 10, status } = options;
      const skip = (page - 1) * limit;
      
      const where = status ? { status } : {};
      
      const [items, total] = await Promise.all([
        prisma.newFeature.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            blogPost: true,
          },
        }),
        prisma.newFeature.count({ where }),
      ]);
      
      return {
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logError(error as Error, { action: 'findAll', options });
      throw new DatabaseError('Failed to fetch new features', error as Error);
    }
  }
}

// Server Actions
export const createNewFeature = async (data: CreateNewFeatureInput) => {
  return await NewFeatureService.create(data);
};

export const updateNewFeature = async (id: string, data: UpdateNewFeatureInput) => {
  return await NewFeatureService.update(id, data);
};

export const deleteNewFeature = async (id: string) => {
  return await NewFeatureService.delete(id);
};
```

### 4. API Routes

```typescript
// In app/api/new-features/route.ts
import { NextResponse } from 'next/server';
import { validateInput } from '@/lib/validation';
import { createNewFeatureSchema } from '@/lib/validation';
import { NewFeatureService } from '@/app/actions';
import { handleError } from '@/lib/errors';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get('page')) || 1;
    const limit = Number(searchParams.get('limit')) || 10;
    const status = searchParams.get('status') || undefined;
    
    const result = await NewFeatureService.findAll({ page, limit, status });
    
    return NextResponse.json({
      data: result.items,
      pagination: result.pagination,
    });
  } catch (error) {
    const appError = handleError(error);
    return NextResponse.json(
      { error: appError.message },
      { status: appError.statusCode }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = validateInput(createNewFeatureSchema, body);
    
    const newFeature = await NewFeatureService.create(validatedData);
    
    return NextResponse.json({ data: newFeature }, { status: 201 });
  } catch (error) {
    const appError = handleError(error);
    return NextResponse.json(
      { error: appError.message },
      { status: appError.statusCode }
    );
  }
}
```

```typescript
// In app/api/new-features/[id]/route.ts
import { NextResponse } from 'next/server';
import { validateInput } from '@/lib/validation';
import { newFeatureIdSchema, updateNewFeatureSchema } from '@/lib/validation';
import { NewFeatureService } from '@/app/actions';
import { handleError } from '@/lib/errors';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const validatedId = validateInput(newFeatureIdSchema, params.id);
    const feature = await NewFeatureService.findById(validatedId);
    
    if (!feature) {
      return NextResponse.json(
        { error: 'Feature not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ data: feature });
  } catch (error) {
    const appError = handleError(error);
    return NextResponse.json(
      { error: appError.message },
      { status: appError.statusCode }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const validatedId = validateInput(newFeatureIdSchema, params.id);
    const body = await request.json();
    const validatedData = validateInput(updateNewFeatureSchema, body);
    
    const feature = await NewFeatureService.update(validatedId, validatedData);
    
    return NextResponse.json({ data: feature });
  } catch (error) {
    const appError = handleError(error);
    return NextResponse.json(
      { error: appError.message },
      { status: appError.statusCode }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const validatedId = validateInput(newFeatureIdSchema, params.id);
    await NewFeatureService.delete(validatedId);
    
    return NextResponse.json({ message: 'Feature deleted successfully' });
  } catch (error) {
    const appError = handleError(error);
    return NextResponse.json(
      { error: appError.message },
      { status: appError.statusCode }
    );
  }
}
```

## Frontend Development

### 1. Component Structure

```typescript
// In components/new-feature-list.tsx
"use client";

import { useState } from "react";
import useSWR from "swr";
import { Plus, Edit, Trash2 } from "lucide-react";

import { type NewFeature } from "@/lib/types";
import { ApiResponse, fetcher } from "@/lib/utils";
import { SWR_CONFIG } from "@/lib/constants";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NewFeatureEditor } from "./new-feature-editor";

interface NewFeatureListProps {
  initialStatus?: string;
}

export const NewFeatureList = ({ initialStatus }: NewFeatureListProps) => {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const { data, error, isLoading, mutate } = useSWR<ApiResponse<{
    items: NewFeature[];
    pagination: any;
  }>>(
    `/api/new-features${initialStatus ? `?status=${initialStatus}` : ''}`,
    fetcher,
    {
      refreshInterval: SWR_CONFIG.REFRESH_INTERVAL,
      errorRetryCount: SWR_CONFIG.ERROR_RETRY_COUNT,
      onError: (error: Error) => {
        console.error("Failed to fetch new features:", error);
      },
    }
  );

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">Failed to load features. Please try again later.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Loading features...</p>
      </div>
    );
  }

  const handleCreateSuccess = () => {
    setIsCreating(false);
    mutate();
  };

  const handleEditSuccess = () => {
    setEditingId(null);
    mutate();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this feature?")) {
      return;
    }

    try {
      await fetch(`/api/new-features/${id}`, { method: "DELETE" });
      mutate();
    } catch (error) {
      console.error("Failed to delete feature:", error);
      alert("Failed to delete feature. Please try again.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">New Features</h2>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create New Feature
        </Button>
      </div>

      {isCreating && (
        <NewFeatureEditor
          onSuccess={handleCreateSuccess}
          onCancel={() => setIsCreating(false)}
        />
      )}

      <div className="grid gap-6">
        {data?.data?.items?.map((feature) => (
          <Card key={feature.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{feature.title}</CardTitle>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
                <Badge variant={feature.status === 'active' ? 'default' : 'secondary'}>
                  {feature.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Created: {new Date(feature.createdAt).toLocaleDateString()}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingId(feature.id)}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(feature.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {editingId && (
        <NewFeatureEditor
          featureId={editingId}
          onSuccess={handleEditSuccess}
          onCancel={() => setEditingId(null)}
        />
      )}
    </div>
  );
};
```

### 2. Form Component

```typescript
// In components/new-feature-editor.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SaveIcon, X } from "lucide-react";

import { type NewFeature, type CreateNewFeatureInput } from "@/lib/types";
import { validateInput } from "@/lib/validation";
import { createNewFeatureSchema, updateNewFeatureSchema } from "@/lib/validation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface NewFeatureEditorProps {
  featureId?: number;
  initialData?: NewFeature;
  onSuccess: () => void;
  onCancel: () => void;
}

export const NewFeatureEditor = ({
  featureId,
  initialData,
  onSuccess,
  onCancel,
}: NewFeatureEditorProps) => {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");

  const isEdit = !!featureId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      alert("Please enter a title");
      return;
    }

    setLoading(true);
    
    try {
      const data = {
        title: title.trim(),
        description: description.trim() || undefined,
      };

      if (isEdit) {
        const validatedData = validateInput(updateNewFeatureSchema, data);
        const response = await fetch(`/api/new-features/${featureId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validatedData),
        });

        if (!response.ok) {
          throw new Error("Failed to update feature");
        }
      } else {
        const validatedData = validateInput(createNewFeatureSchema, data);
        const response = await fetch("/api/new-features", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validatedData),
        });

        if (!response.ok) {
          throw new Error("Failed to create feature");
        }
      }

      onSuccess();
    } catch (error) {
      console.error("Error saving feature:", error);
      alert(`Failed to ${isEdit ? "update" : "create"} feature. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>
            {isEdit ? "Edit Feature" : "Create New Feature"}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter feature title"
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter feature description (optional)"
              disabled={loading}
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              <SaveIcon className="mr-2 h-4 w-4" />
              {loading ? "Saving..." : (isEdit ? "Update" : "Create")}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
```

### 3. Page Implementation

```typescript
// In app/new-features/page.tsx
import { NewFeatureList } from "@/components/new-feature-list";

export default function NewFeaturesPage() {
  return <NewFeatureList />;
}

// In app/new-features/[id]/edit/page.tsx
import { notFound } from "next/navigation";
import { NewFeatureEditor } from "@/components/new-feature-editor";
import { NewFeatureService } from "@/app/actions";

export default async function EditNewFeaturePage({
  params,
}: {
  params: { id: string };
}) {
  const feature = await NewFeatureService.findById(params.id);
  
  if (!feature) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <NewFeatureEditor
        featureId={feature.id}
        initialData={feature}
        onSuccess={() => {
          // Handle success - redirect or show message
        }}
        onCancel={() => {
          // Handle cancel - redirect back
        }}
      />
    </div>
  );
}
```

## Testing Guidelines

### 1. Unit Tests

```typescript
// In __tests__/services/new-feature.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NewFeatureService } from '@/app/actions';
import { validateInput } from '@/lib/validation';

// Mock dependencies
vi.mock('@/lib/prisma');
vi.mock('@/lib/validation');
vi.mock('@/lib/errors');

describe('NewFeatureService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new feature with valid data', async () => {
      const mockData = {
        title: 'Test Feature',
        description: 'Test Description',
      };

      vi.mocked(validateInput).mockReturnValue(mockData);
      vi.mocked(prisma.newFeature.create).mockResolvedValue({
        id: 1,
        ...mockData,
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await NewFeatureService.create(mockData);

      expect(validateInput).toHaveBeenCalledWith(expect.anything(), mockData);
      expect(result).toHaveProperty('id', 1);
      expect(result.title).toBe('Test Feature');
    });

    it('should throw DatabaseError on creation failure', async () => {
      const mockData = { title: 'Test Feature' };
      const mockError = new Error('Database error');

      vi.mocked(validateInput).mockReturnValue(mockData);
      vi.mocked(prisma.newFeature.create).mockRejectedValue(mockError);

      await expect(NewFeatureService.create(mockData)).rejects.toThrow('Failed to create new feature');
    });
  });
});
```

### 2. Component Tests

```typescript
// In __tests__/components/new-feature-list.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NewFeatureList } from '@/components/new-feature-list';
import * as useSWR from 'swr';

// Mock SWR
vi.mock('swr');

describe('NewFeatureList', () => {
  it('should render loading state', () => {
    vi.mocked(useSWR).mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
      mutate: vi.fn(),
    } as any);

    render(<NewFeatureList />);
    expect(screen.getByText('Loading features...')).toBeInTheDocument();
  });

  it('should render features when data is loaded', () => {
    const mockData = {
      data: {
        items: [
          {
            id: 1,
            title: 'Test Feature',
            description: 'Test Description',
            status: 'active',
            createdAt: '2024-01-01',
          },
        ],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      },
    };

    vi.mocked(useSWR).mockReturnValue({
      data: mockData,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    } as any);

    render(<NewFeatureList />);
    expect(screen.getByText('Test Feature')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
  });
});
```

## Code Review Checklist

### Backend Review
- [ ] Database schema follows existing conventions
- [ ] Types are properly defined in `lib/types.ts`
- [ ] Validation schemas are comprehensive
- [ ] Service layer follows established patterns
- [ ] Error handling uses custom error classes
- [ ] API routes return consistent response format
- [ ] Proper logging is implemented
- [ ] Security considerations are addressed

### Frontend Review
- [ ] Components follow existing naming conventions
- [ ] TypeScript interfaces are properly defined
- [ ] Error boundaries are implemented
- [ ] Loading states are handled
- [ ] Form validation is implemented
- [ ] Accessibility standards are met
- [ ] Responsive design is considered
- [ ] User experience is intuitive

### Integration Review
- [ ] Frontend-backend integration works correctly
- [ ] Error handling is consistent across layers
- [ ] Data flow is logical and efficient
- [ ] Performance implications are considered
- [ ] Security measures are in place

## Example Feature Implementation

### Feature: Blog Post Categories

This example demonstrates implementing a blog post categorization system following all the guidelines above.

#### 1. Database Schema
```prisma
model Category {
  id          Int      @id @default(autoincrement())
  name        String   @unique
  description String?
  color       String?  // For UI representation
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  
  // Relations
  blogPosts   BlogPostCategory[]
  
  @@map("categories")
}

model BlogPostCategory {
  id          Int      @id @default(autoincrement())
  blogPostId  Int
  categoryId  Int
  createdAt   DateTime @default(now()) @map("created_at")
  
  blogPost    BlogPost @relation(fields: [blogPostId], references: [id], onDelete: Cascade)
  category    Category @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  
  @@unique([blogPostId, categoryId])
  @@map("blog_post_categories")
}
```

#### 2. Types and Validation
```typescript
// lib/types.ts
export type Category = {
  id: number;
  name: string;
  description: string | null;
  color: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

// lib/validation.ts
export const createCategorySchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(200).optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').optional(),
});
```

#### 3. Service Implementation
```typescript
// app/actions.ts
class CategoryService {
  static async create(data: CreateCategoryInput) {
    // Implementation following established patterns
  }
  
  static async assignToBlogPost(blogPostId: string, categoryIds: number[]) {
    // Implementation for many-to-many relationship
  }
}
```

#### 4. Frontend Components
```typescript
// components/category-selector.tsx
// components/category-manager.tsx
// components/blog-post-categories.tsx
```

This comprehensive guide ensures that new features are implemented consistently, maintainably, and in alignment with the established architectural patterns of the codebase.

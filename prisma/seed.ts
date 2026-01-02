import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Create sample blog posts
  const blogPost1 = await prisma.blogPost.create({
    data: {
      title: 'Getting Started with Next.js and Prisma',
      subtitle: 'A comprehensive guide to building modern web applications',
      status: 'draft',
      markdown: `# Getting Started with Next.js and Prisma

Next.js and Prisma make a powerful combination for building modern web applications with type-safe database access.

## What is Next.js?

Next.js is a React framework that provides server-side rendering, static site generation, and many other features out of the box.

## What is Prisma?

Prisma is an ORM that makes database access easy and type-safe.

## Getting Started

1. Install dependencies
2. Set up your database
3. Configure Prisma
4. Start building!`,
    },
  })

  const blogPost2 = await prisma.blogPost.create({
    data: {
      title: 'Advanced TypeScript Patterns',
      subtitle: 'Explore advanced TypeScript concepts and patterns',
      status: 'published',
      markdown: `# Advanced TypeScript Patterns

TypeScript offers many powerful features that can help you write better code.

## Generic Types

Generic types allow you to write flexible and reusable code.

## Utility Types

TypeScript provides many utility types that make working with types easier.

## Conclusion

Mastering TypeScript patterns will make you a more effective developer.`,
    },
  })

  // Create sample workflows
  const workflow1 = await prisma.workflow.create({
    data: {
      name: 'Blog Post Review Workflow',
      description: 'Automated workflow for reviewing and publishing blog posts',
      trigger: 'blog-post.updated',
      enabled: true,
      workflow: {
        steps: [
          {
            id: '1',
            type: 'ai-review',
            name: 'AI Content Review'
          },
          {
            id: '2', 
            type: 'human-approval',
            name: 'Human Approval'
          }
        ]
      },
    },
  })

  const workflow2 = await prisma.workflow.create({
    data: {
      name: 'Social Media Workflow',
      description: 'Generate social media content for new blog posts',
      trigger: 'blog-post.published',
      enabled: false,
      workflow: {
        steps: [
          {
            id: '1',
            type: 'generate-tweets',
            name: 'Generate Twitter Posts'
          },
          {
            id: '2',
            type: 'generate-linkedin', 
            name: 'Generate LinkedIn Posts'
          }
        ]
      },
    },
  })

  console.log('Database seeded successfully!')
  console.log('Created blog posts:', blogPost1.id, blogPost2.id)
  console.log('Created workflows:', workflow1.id, workflow2.id)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

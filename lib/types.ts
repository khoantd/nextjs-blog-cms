import { PrismaClient } from '@prisma/client'

export type BlogPost = {
  id: number
  title: string | null
  subtitle: string | null
  status: string | null
  markdown: string | null
  markdownAiRevision: string | null
  createdAt: Date | string
  aiPublishingRecommendations: string | null
}

export type Workflow = {
  id: number
  createdAt: Date | string
  workflow: any
  enabled: boolean
  trigger: string | null
  description: string | null
  name: string | null
}

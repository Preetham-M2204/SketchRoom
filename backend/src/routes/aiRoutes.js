import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.js'
import { validateBody } from '../middleware/validate.js'

const router = Router()

const decisionAnalysisSchema = z.object({
  topic: z.string().optional(),
  items: z
    .array(
      z.object({
        id: z.string().optional(),
        text: z.string().default(''),
        type: z.string().default('pro'),
        votes: z.array(z.string()).default([]),
      })
    )
    .default([]),
})

const gdSummarySchema = z.object({
  speakers: z
    .array(
      z.object({
        userId: z.string().optional(),
        name: z.string(),
        timeRemaining: z.number().optional(),
      })
    )
    .default([]),
  scores: z.record(z.any()).default({}),
  duration: z.number().optional(),
})

router.use(requireAuth)

router.post('/decision-analysis', validateBody(decisionAnalysisSchema), (req, res) => {
  const { topic, items } = req.validatedBody

  const countsByType = items.reduce((acc, item) => {
    const key = item.type || 'other'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})

  const mostVoted = [...items].sort((a, b) => (b.votes?.length || 0) - (a.votes?.length || 0))[0]

  const analysis = [
    `Decision Summary${topic ? `: ${topic}` : ''}`,
    '',
    `Total inputs: ${items.length}`,
    `Distribution: ${Object.entries(countsByType)
      .map(([type, count]) => `${type}=${count}`)
      .join(', ') || 'no categorized items yet'}`,
    mostVoted
      ? `Top-voted insight: "${mostVoted.text}" (${mostVoted.votes?.length || 0} votes)`
      : 'Top-voted insight: none yet',
    'Recommended next step: move top 2-3 items into concrete action points with owners and deadlines.',
  ].join('\n')

  return res.json({ analysis })
})

router.post('/gd-summary', validateBody(gdSummarySchema), (req, res) => {
  const { speakers, scores } = req.validatedBody

  const speakerLines = speakers.map((speaker, index) => {
    const score = scores[speaker.userId] || {}
    const scoreValues = Object.values(score).filter((value) => typeof value === 'number')
    const avg =
      scoreValues.length > 0
        ? (scoreValues.reduce((sum, value) => sum + value, 0) / scoreValues.length).toFixed(2)
        : 'N/A'
    return `${index + 1}. ${speaker.name} - avg score: ${avg}`
  })

  const summary = [
    'GD Round Summary',
    '',
    `Participants: ${speakers.length}`,
    ...speakerLines,
    '',
    'Overall feedback: keep arguments concise, support points with examples, and improve turn-taking transitions.',
  ].join('\n')

  return res.json({ summary })
})

export default router

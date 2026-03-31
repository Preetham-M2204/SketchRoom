import { Router } from 'express'
import { z } from 'zod'
import {
  addDecisionItem,
  approveRoomJoinRequest,
  advanceGdSpeaker,
  clearCanvasState,
  createRoom,
  endGdRound,
  getRoomAccessStatusByKey,
  getRoomByKey,
  getRoomJoinRequests,
  getDecisionState,
  getGdState,
  getMeetingState,
  getCanvasState,
  deleteRoom,
  getRoomById,
  getRooms,
  getRoomStrokes,
  joinRoomByCode,
  lowerMeetingHand,
  rejectRoomJoinRequest,
  removeDecisionItem,
  requestRoomAccessByKey,
  raiseMeetingHand,
  setGdMicAccess,
  startGdRound,
  submitGdSpeakerScore,
  updateDecisionPhase,
  updateMeetingAgenda,
  updateMeetingAgendaIndex,
  updateMeetingPresenter,
  updateMeetingViewport,
  updateCanvasMeta,
  updateRoomMemberRole,
  voteDecisionItem,
} from '../controllers/roomController.js'
import { requireAuth } from '../middleware/auth.js'
import { validateBody } from '../middleware/validate.js'

const router = Router()

const createRoomSchema = z.object({
  name: z.string().trim().min(1).max(120),
  topic: z.string().trim().max(300).optional(),
  mode: z.enum(['decision', 'meeting', 'gd', 'canvas']),
  access: z.enum(['public', 'private']).optional(),
  isPublic: z.boolean().optional(),
  modeConfig: z.record(z.any()).optional(),
})

const updateRoomMemberRoleSchema = z.object({
  role: z.enum(['moderator', 'member', 'viewer']),
  status: z.enum(['pending', 'active', 'removed', 'banned']).optional(),
})

const canvasViewportSchema = z.object({
  x: z.number().finite().min(-50000).max(50000).optional(),
  y: z.number().finite().min(-50000).max(50000).optional(),
  zoom: z.number().finite().min(0.1).max(8).optional(),
})

const updateCanvasMetaSchema = z
  .object({
    boardTitle: z.string().trim().min(1).max(120).optional(),
    viewport: canvasViewportSchema.optional(),
  })
  .refine((data) => data.boardTitle !== undefined || data.viewport !== undefined, {
    message: 'Provide boardTitle or viewport for canvas update',
  })

const updateDecisionPhaseSchema = z.object({
  phase: z.enum(['brainstorm', 'voting', 'analysis']),
})

const createDecisionItemSchema = z.object({
  text: z.string().trim().min(1).max(800),
  type: z.string().trim().min(1).max(40).optional(),
})

const meetingAgendaItemSchema = z.object({
  id: z.string().trim().min(1).max(40).optional(),
  title: z.string().trim().min(1).max(240),
  duration: z.number().int().min(0).max(24 * 60),
  completed: z.boolean().optional(),
})

const updateMeetingPresenterSchema = z.object({
  presenterUserId: z.string().trim().min(1).optional(),
})

const updateMeetingAgendaSchema = z.object({
  agenda: z.array(meetingAgendaItemSchema),
})

const updateMeetingAgendaIndexSchema = z.object({
  index: z.number().int().nonnegative(),
})

const updateMeetingViewportSchema = z
  .object({
    viewport: canvasViewportSchema.optional(),
    isViewportSynced: z.boolean().optional(),
  })
  .refine((data) => data.viewport !== undefined || data.isViewportSynced !== undefined, {
    message: 'Provide viewport and/or isViewportSynced for meeting viewport update',
  })

const gdSpeakerSchema = z.object({
  userId: z.string().trim().min(1),
  name: z.string().trim().min(1).max(120),
  timeRemaining: z.number().int().min(30).max(24 * 60).optional(),
  hasSpoken: z.boolean().optional(),
})

const startGdRoundSchema = z.object({
  speakers: z.array(gdSpeakerSchema).min(1),
})

const advanceGdSpeakerSchema = z.object({
  index: z.number().int().nonnegative(),
})

const submitGdSpeakerScoreSchema = z.object({
  scores: z.object({}).catchall(z.number().finite().min(0).max(10)),
})

const setGdMicAccessSchema = z.object({
  userId: z.string().trim().min(1),
  enabled: z.boolean(),
})

const endGdRoundSchema = z.object({
  summary: z.string().trim().max(4000).optional(),
})

router.use(requireAuth)

router.get('/', getRooms)
router.post('/', validateBody(createRoomSchema), createRoom)
router.post('/join/:inviteCode', joinRoomByCode)
router.post('/key/:roomKey/request-access', requestRoomAccessByKey)
router.get('/key/:roomKey/access-status', getRoomAccessStatusByKey)
router.get('/key/:roomKey', getRoomByKey)
router.patch(
  '/:roomId/members/:userId/role',
  validateBody(updateRoomMemberRoleSchema),
  updateRoomMemberRole
)
router.get('/:roomId/requests', getRoomJoinRequests)
router.post('/:roomId/requests/:userId/approve', approveRoomJoinRequest)
router.post('/:roomId/requests/:userId/reject', rejectRoomJoinRequest)
router.get('/:roomId/decision/state', getDecisionState)
router.patch(
  '/:roomId/decision/phase',
  validateBody(updateDecisionPhaseSchema),
  updateDecisionPhase
)
router.post('/:roomId/decision/items', validateBody(createDecisionItemSchema), addDecisionItem)
router.delete('/:roomId/decision/items/:itemId', removeDecisionItem)
router.post('/:roomId/decision/items/:itemId/vote', voteDecisionItem)
router.get('/:roomId/meeting/state', getMeetingState)
router.patch(
  '/:roomId/meeting/presenter',
  validateBody(updateMeetingPresenterSchema),
  updateMeetingPresenter
)
router.put('/:roomId/meeting/agenda', validateBody(updateMeetingAgendaSchema), updateMeetingAgenda)
router.patch(
  '/:roomId/meeting/agenda/index',
  validateBody(updateMeetingAgendaIndexSchema),
  updateMeetingAgendaIndex
)
router.patch(
  '/:roomId/meeting/viewport',
  validateBody(updateMeetingViewportSchema),
  updateMeetingViewport
)
router.post('/:roomId/meeting/hand-queue/raise', raiseMeetingHand)
router.post('/:roomId/meeting/hand-queue/lower', lowerMeetingHand)
router.get('/:roomId/gd/state', getGdState)
router.post('/:roomId/gd/start', validateBody(startGdRoundSchema), startGdRound)
router.patch('/:roomId/gd/next-speaker', validateBody(advanceGdSpeakerSchema), advanceGdSpeaker)
router.patch('/:roomId/gd/mic-access', validateBody(setGdMicAccessSchema), setGdMicAccess)
router.post(
  '/:roomId/gd/scores/:speakerUserId',
  validateBody(submitGdSpeakerScoreSchema),
  submitGdSpeakerScore
)
router.post('/:roomId/gd/end', validateBody(endGdRoundSchema), endGdRound)
router.get('/:roomId/canvas/state', getCanvasState)
router.patch('/:roomId/canvas/meta', validateBody(updateCanvasMetaSchema), updateCanvasMeta)
router.post('/:roomId/canvas/clear', clearCanvasState)
router.get('/:roomId/strokes', getRoomStrokes)
router.get('/:roomId', getRoomById)
router.delete('/:roomId', deleteRoom)

export default router

import mongoose from 'mongoose'
import { customAlphabet } from 'nanoid'

const generateRoomPublicId = customAlphabet(
  '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz',
  10
)

const decisionItemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    text: { type: String, required: true },
    type: { type: String, required: true },
    votes: { type: [String], default: [] },
    createdBy: { type: String, required: true },
  },
  { _id: false }
)

const agendaItemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    duration: { type: Number, default: 0 },
    completed: { type: Boolean, default: false },
  },
  { _id: false }
)

const speakerSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    name: { type: String, required: true },
    timeRemaining: { type: Number, default: 120 },
    hasSpoken: { type: Boolean, default: false },
  },
  { _id: false }
)

const canvasViewportSchema = new mongoose.Schema(
  {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
    zoom: { type: Number, default: 1 },
  },
  { _id: false }
)

const canvasStateSchema = new mongoose.Schema(
  {
    boardTitle: {
      type: String,
      default: '',
      trim: true,
      maxlength: 120,
    },
    viewport: {
      type: canvasViewportSchema,
      default: () => ({}),
    },
    lastEditedBy: {
      type: String,
      default: null,
    },
    lastEditedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
)

const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 120,
    },
    topic: {
      type: String,
      default: '',
      trim: true,
      maxlength: 300,
    },
    mode: {
      type: String,
      enum: ['decision', 'meeting', 'gd', 'canvas'],
      required: true,
    },
    access: {
      type: String,
      enum: ['public', 'private'],
      default: 'private',
    },
    inviteCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      minlength: 6,
      maxlength: 6,
      index: true,
    },
    publicId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      default: () => generateRoomPublicId(),
      minlength: 8,
      maxlength: 16,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    members: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      default: [],
    },
    canvas: {
      type: canvasStateSchema,
      default: () => ({}),
    },
    decision: {
      phase: {
        type: String,
        enum: ['brainstorm', 'voting', 'analysis'],
        default: 'brainstorm',
      },
      items: {
        type: [decisionItemSchema],
        default: [],
      },
      analysis: {
        type: String,
        default: null,
      },
    },
    meeting: {
      presenter: { type: String, default: null },
      agenda: { type: [agendaItemSchema], default: [] },
      handQueue: { type: [String], default: [] },
      currentAgendaIndex: { type: Number, default: 0 },
      isViewportSynced: { type: Boolean, default: false },
    },
    gd: {
      currentSpeakerIndex: { type: Number, default: 0 },
      speakers: { type: [speakerSchema], default: [] },
      scores: { type: mongoose.Schema.Types.Mixed, default: {} },
      micOverrideUserIds: { type: [String], default: [] },
      isActive: { type: Boolean, default: false },
      summary: { type: String, default: null },
    },
  },
  {
    timestamps: true,
    minimize: false,
  }
)

const Room = mongoose.model('Room', roomSchema)

export default Room

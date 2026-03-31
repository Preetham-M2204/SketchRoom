import mongoose from 'mongoose'

const pointSchema = new mongoose.Schema(
  {
    x: { type: Number, required: true },
    y: { type: Number, required: true },
  },
  { _id: false }
)

const strokeSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
      index: true,
    },
    strokeId: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
    tool: {
      type: String,
      enum: ['pen', 'eraser', 'line', 'rectangle', 'circle'],
      default: 'pen',
    },
    points: {
      type: [pointSchema],
      default: [],
    },
    color: {
      type: String,
      required: true,
    },
    width: {
      type: Number,
      required: true,
    },
    timestamp: {
      type: Number,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
)

strokeSchema.index({ room: 1, strokeId: 1 }, { unique: true })
strokeSchema.index({ room: 1, timestamp: 1 })

const Stroke = mongoose.model('Stroke', strokeSchema)

export default Stroke

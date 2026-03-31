import mongoose from 'mongoose'

const roomMembershipSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['owner', 'moderator', 'member', 'viewer'],
      default: 'member',
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'removed', 'banned'],
      default: 'active',
      index: true,
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

roomMembershipSchema.index({ room: 1, user: 1 }, { unique: true })
roomMembershipSchema.index({ user: 1, status: 1 })

const RoomMembership = mongoose.model('RoomMembership', roomMembershipSchema)

export default RoomMembership

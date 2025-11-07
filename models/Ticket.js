const mongoose = require("mongoose");

const ReplySchema = new mongoose.Schema({
  repliedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  replyText: {
    type: String,
    required: true,
    trim: true
  },
  repliedAt: {
    type: Date,
    default: Date.now
  },
  isAdminReply: {
    type: Boolean,
    default: false
  }
}, { timestamps: false });

const TicketSchema = new mongoose.Schema({
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userType: {
    type: String,
    enum: ['user', 'vendor'],
    required: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  image: {
    type: String, // File path
    trim: true,
    default: ''
  },
  status: {
    type: String,
    enum: ['open', 'replied', 'solved'],
    default: 'open'
  },
  replies: [ReplySchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Update status based on replies
TicketSchema.methods.updateStatus = function() {
  if (this.status === 'solved') {
    return; // Don't change if already solved
  }
  
  if (this.replies && this.replies.length > 0) {
    this.status = 'replied';
  } else {
    this.status = 'open';
  }
};

const Ticket = mongoose.model("Ticket", TicketSchema);

module.exports = Ticket;


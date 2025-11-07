const Ticket = require('../models/Ticket');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');

// Create a new ticket (User/Vendor)
exports.createTicket = async (req, res) => {
  try {
    const { subject, description } = req.body;
    const userId = req.user._id;
    const userRole = req.user.role;

    // Validate required fields
    if (!subject || !subject.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Subject is required'
      });
    }

    if (!description || !description.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Description is required'
      });
    }

    // Determine user type (user or vendor)
    let userType = 'user';
    if (userRole === 'vendor') {
      userType = 'vendor';
    }

    // Get image path if uploaded (relative path for serving)
    let imagePath = '';
    if (req.file) {
      imagePath = `/uploads/tickets/${req.file.filename}`;
    }

    // Create ticket
    const ticket = new Ticket({
      createdBy: userId,
      userType: userType,
      subject: subject.trim(),
      description: description.trim(),
      image: imagePath,
      status: 'open'
    });

    await ticket.save();

    // Populate createdBy field
    await ticket.populate('createdBy', 'name email phone role');

    res.status(201).json({
      success: true,
      message: 'Ticket created successfully',
      data: ticket
    });
  } catch (error) {
    // Clean up uploaded file if ticket creation fails
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: 'Error creating ticket',
      error: error.message
    });
  }
};

// Get all tickets (Admin only)
exports.getAllTickets = async (req, res) => {
  try {
    const { status, userType, page = 1, limit = 10 } = req.query;
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    // Build query
    const query = {};
    if (status) {
      query.status = status;
    }
    if (userType) {
      query.userType = userType;
    }

    // Get tickets with pagination
    const tickets = await Ticket.find(query)
      .populate('createdBy', 'name email phone role')
      .populate('replies.repliedBy', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber);

    // Get total count
    const totalTickets = await Ticket.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        tickets,
        pagination: {
          currentPage: pageNumber,
          totalPages: Math.ceil(totalTickets / limitNumber),
          totalTickets,
          limit: limitNumber
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching tickets',
      error: error.message
    });
  }
};

// Get my tickets (User/Vendor)
exports.getMyTickets = async (req, res) => {
  try {
    const userId = req.user._id;
    const { status, page = 1, limit = 10 } = req.query;
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    // Build query
    const query = { createdBy: userId };
    if (status) {
      query.status = status;
    }

    // Get tickets with pagination
    const tickets = await Ticket.find(query)
      .populate('createdBy', 'name email phone role')
      .populate('replies.repliedBy', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber);

    // Get total count
    const totalTickets = await Ticket.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        tickets,
        pagination: {
          currentPage: pageNumber,
          totalPages: Math.ceil(totalTickets / limitNumber),
          totalTickets,
          limit: limitNumber
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching your tickets',
      error: error.message
    });
  }
};

// Get single ticket by ID
exports.getTicketById = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    const ticket = await Ticket.findById(ticketId)
      .populate('createdBy', 'name email phone role')
      .populate('replies.repliedBy', 'name email role');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // Check if user has permission to view this ticket
    // Admin can view all tickets, user/vendor can only view their own
    if (userRole !== 'admin' && userRole !== 'superadmin') {
      if (ticket.createdBy._id.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to view this ticket'
        });
      }
    }

    res.status(200).json({
      success: true,
      data: ticket
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching ticket',
      error: error.message
    });
  }
};

// Update ticket (User/Vendor - only their own)
exports.updateTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { subject, description } = req.body;
    const userId = req.user._id;

    const ticket = await Ticket.findById(ticketId);

    if (!ticket) {
      // Clean up uploaded file if ticket not found
      if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // Check if user owns this ticket
    if (ticket.createdBy.toString() !== userId.toString()) {
      // Clean up uploaded file if unauthorized
      if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(403).json({
        success: false,
        message: 'You can only edit your own tickets'
      });
    }

    // Check if ticket is already solved (optional: prevent editing solved tickets)
    if (ticket.status === 'solved') {
      // Clean up uploaded file if ticket is solved
      if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: 'Cannot edit a solved ticket'
      });
    }

    // Update fields
    if (subject && subject.trim()) {
      ticket.subject = subject.trim();
    }
    if (description && description.trim()) {
      ticket.description = description.trim();
    }

    // Handle image update
    if (req.file) {
      // Delete old image if exists (convert relative path to absolute for deletion)
      if (ticket.image) {
        const oldImagePath = path.join(__dirname, '..', ticket.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      ticket.image = `/uploads/tickets/${req.file.filename}`;
    }

    await ticket.save();

    // Populate fields
    await ticket.populate('createdBy', 'name email phone role');
    await ticket.populate('replies.repliedBy', 'name email role');

    res.status(200).json({
      success: true,
      message: 'Ticket updated successfully',
      data: ticket
    });
  } catch (error) {
    // Clean up uploaded file on error
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: 'Error updating ticket',
      error: error.message
    });
  }
};

// Delete ticket (User/Vendor - only their own)
exports.deleteTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const userId = req.user._id;

    const ticket = await Ticket.findById(ticketId);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // Check if user owns this ticket
    if (ticket.createdBy.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own tickets'
      });
    }

    // Delete associated image if exists (convert relative path to absolute for deletion)
    if (ticket.image) {
      const imagePath = path.join(__dirname, '..', ticket.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    // Delete ticket
    await Ticket.findByIdAndDelete(ticketId);

    res.status(200).json({
      success: true,
      message: 'Ticket deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting ticket',
      error: error.message
    });
  }
};

// Reply to ticket (Admin only)
exports.replyToTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { replyText } = req.body;
    const userId = req.user._id;

    // Validate reply text
    if (!replyText || !replyText.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Reply text is required'
      });
    }

    const ticket = await Ticket.findById(ticketId);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // Add reply
    const reply = {
      repliedBy: userId,
      replyText: replyText.trim(),
      isAdminReply: true
    };

    ticket.replies.push(reply);

    // Update status
    ticket.updateStatus();

    await ticket.save();

    // Populate fields
    await ticket.populate('createdBy', 'name email phone role');
    await ticket.populate('replies.repliedBy', 'name email role');

    res.status(200).json({
      success: true,
      message: 'Reply added successfully',
      data: ticket
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error replying to ticket',
      error: error.message
    });
  }
};

// Mark ticket as solved (Admin only)
exports.markTicketAsSolved = async (req, res) => {
  try {
    const { ticketId } = req.params;

    const ticket = await Ticket.findById(ticketId);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // Check if already solved
    if (ticket.status === 'solved') {
      return res.status(400).json({
        success: false,
        message: 'Ticket is already marked as solved'
      });
    }

    // Mark as solved
    ticket.status = 'solved';
    await ticket.save();

    // Populate fields
    await ticket.populate('createdBy', 'name email phone role');
    await ticket.populate('replies.repliedBy', 'name email role');

    res.status(200).json({
      success: true,
      message: 'Ticket marked as solved',
      data: ticket
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error marking ticket as solved',
      error: error.message
    });
  }
};

// User/Vendor can also reply to their own ticket (optional feature)
exports.userReplyToTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { replyText } = req.body;
    const userId = req.user._id;

    // Validate reply text
    if (!replyText || !replyText.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Reply text is required'
      });
    }

    const ticket = await Ticket.findById(ticketId);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // Check if user owns this ticket
    if (ticket.createdBy.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only reply to your own tickets'
      });
    }

    // Add reply
    const reply = {
      repliedBy: userId,
      replyText: replyText.trim(),
      isAdminReply: false
    };

    ticket.replies.push(reply);

    // Update status
    ticket.updateStatus();

    await ticket.save();

    // Populate fields
    await ticket.populate('createdBy', 'name email phone role');
    await ticket.populate('replies.repliedBy', 'name email role');

    res.status(200).json({
      success: true,
      message: 'Reply added successfully',
      data: ticket
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error replying to ticket',
      error: error.message
    });
  }
};


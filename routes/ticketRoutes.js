const express = require('express');
const router = express.Router();
const {
  createTicket,
  getAllTickets,
  getMyTickets,
  getTicketById,
  updateTicket,
  deleteTicket,
  replyToTicket,
  markTicketAsSolved,
  userReplyToTicket
} = require('../controllers/ticketController');
const { authenticate, authorize } = require('../middelware/auth');
const { uploadTicketImageFile } = require('../middelware/upload');

// Admin routes - must come before dynamic routes
// Admin routes - Get all tickets
router.get('/admin/all', authenticate, authorize('admin', 'superadmin'), getAllTickets);

// Admin routes - Reply to ticket
router.post('/admin/:ticketId/reply', authenticate, authorize('admin', 'superadmin'), replyToTicket);

// Admin routes - Mark ticket as solved
router.put('/admin/:ticketId/solve', authenticate, authorize('admin', 'superadmin'), markTicketAsSolved);

// User/Vendor routes - Create ticket
router.post('/create', authenticate, uploadTicketImageFile, createTicket);

// User/Vendor routes - Get my tickets (must come before /:ticketId)
router.get('/my-tickets', authenticate, getMyTickets);

// User/Vendor routes - Get single ticket by ID
router.get('/:ticketId', authenticate, getTicketById);

// User/Vendor routes - Update ticket (only their own)
router.put('/:ticketId', authenticate, uploadTicketImageFile, updateTicket);

// User/Vendor routes - Delete ticket (only their own)
router.delete('/:ticketId', authenticate, deleteTicket);

// User/Vendor routes - Reply to own ticket
router.post('/:ticketId/reply', authenticate, userReplyToTicket);

module.exports = router;


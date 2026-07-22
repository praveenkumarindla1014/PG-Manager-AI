import express from 'express';
import { protect, isOwner } from '../middleware/auth.js';
import { generateProfessionalEmail } from '../services/ai/emailGenerator.js';
import { generateProfessionalWhatsApp } from '../services/ai/whatsappGenerator.js';

const router = express.Router();

router.post('/email', protect, isOwner, async (req, res) => {
  try {
    const { type, recipientName, context } = req.body;
    const email = await generateProfessionalEmail(type, recipientName, context);
    res.json({ success: true, data: email });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/whatsapp', protect, isOwner, async (req, res) => {
  try {
    const { purpose, recipientName, context } = req.body;
    const message = await generateProfessionalWhatsApp(purpose, recipientName, context);
    res.json({ success: true, data: message });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

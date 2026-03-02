import ContactMessage from "../models/ContactMessage.js";

export const createContactMessage = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: "Name, email and message are required"
      });
    }

    const contact = await ContactMessage.create({
      name,
      email,
      subject,
      message
    });

    return res.status(201).json({
      success: true,
      message: "Message sent successfully",
      contactId: contact._id
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

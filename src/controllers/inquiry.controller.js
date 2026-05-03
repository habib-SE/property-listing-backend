const db = require('../config/db');

exports.submitInquiry = async (req, res) => {
    try {
        const { property_id, full_name, email, phone, message, inquiry_type } = req.body;

        if (!full_name || !email) {
            return res.status(400).json({ success: false, message: 'Full name and email are required' });
        }

        const [id] = await db('inquiry_forms').insert({
            property_id,
            full_name,
            email,
            phone,
            message,
            inquiry_type: inquiry_type || 'general'
        });

        res.status(201).json({ success: true, message: 'Inquiry submitted successfully', inquiry_id: id });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getInquiries = async (req, res) => {
    try {
        // This could be restricted to admin or the property owner
        const inquiries = await db('inquiry_forms').orderBy('created_at', 'desc');
        res.json({ success: true, inquiries });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

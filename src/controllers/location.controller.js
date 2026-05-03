const db = require('../config/db');

// Cities
exports.getCities = async (req, res) => {
    try {
        const cities = await db('cities').where({ status: 1 }).orderBy('city_name', 'asc');
        res.json({ success: true, cities });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Developers
exports.getDevelopers = async (req, res) => {
    try {
        const developers = await db('developers').where({ status: 1 }).orderBy('developer_name', 'asc');
        res.json({ success: true, developers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Communities
exports.getCommunities = async (req, res) => {
    try {
        const { city_id, developer_id } = req.query;
        const query = db('communities').where({ status: 1 });

        if (city_id) query.where({ city_id });
        if (developer_id) query.where({ developer_id });

        const communities = await query.orderBy('community_name', 'asc');
        res.json({ success: true, communities });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

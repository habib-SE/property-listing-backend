const db = require('../config/db');

// Cities — search-as-you-type (prefix match, uses idx_cities_city index, max 20 results)
exports.getCities = async (req, res) => {
    try {
        const { search } = req.query;

        if (!search || search.trim().length < 2) {
            return res.json({ success: true, cities: [] });
        }

        const term = `${search.trim()}%`;  // prefix-only — index is used, no full scan
        const cities = await db('cities')
            .where('city', 'like', term)
            .orderBy('city', 'asc')
            .limit(20);

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

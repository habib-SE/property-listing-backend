const db = require('../config/db');

const getAllAgencies = async (req, res) => {
    try {
        const agencies = await db('agencies')
            .select('id', 'agency_name')
            .where({ status: 1 })
            .orderBy('agency_name', 'asc');
            
        res.status(200).json({
            success: true,
            data: agencies
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    getAllAgencies
};

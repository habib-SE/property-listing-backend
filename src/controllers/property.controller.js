const db = require('../config/db');

// List properties with filters
const getProperties = async (req, res) => {
    try {
        const {
            city_id,
            property_status,
            property_type,
            min_price,
            max_price,
            bedrooms,
            search
        } = req.query;

        const query = db('properties').where({ status: 1 });

        if (city_id) query.where({ city_id });
        if (property_status) query.where({ property_status });
        if (property_type) query.where({ property_type });
        if (bedrooms) query.where({ bedrooms });
        if (min_price) query.where('price', '>=', min_price);
        if (max_price) query.where('price', '<=', max_price);
        if (search) {
            query.where(function () {
                this.where('listing_title', 'like', `%${search}%`)
                    .orWhere('address', 'like', `%${search}%`)
                    .orWhere('description', 'like', `%${search}%`)
                    .orWhere('community_name', 'like', `%${search}%`);
            });
        }

        const properties = await query
            .leftJoin('developers', 'properties.developer_id', 'developers.id')
            .leftJoin('communities', 'properties.community_id', 'communities.id')
            .leftJoin('cities', 'properties.city_id', 'cities.id')
            .select(
                'properties.*',
                'developers.developer_name',
                'communities.community_name as community_ref_name',
                'cities.city as city_name'
            )
            .orderBy('properties.date_added', 'desc');

        // Fetch primary image for each property
        for (let prop of properties) {
            const primaryImage = await db('property_images')
                .where({ property_id: prop.id })
                .orderBy('sort_order', 'asc')
                .first();
            prop.primary_image = primaryImage ? primaryImage.image_url : null;
        }

        res.json({ success: true, properties });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get single property details
const getPropertyById = async (req, res) => {
    try {
        const property = await db('properties').where({ id: req.params.id, status: 1 }).first();
        if (!property) {
            return res.status(404).json({ success: false, message: 'Property not found' });
        }

        const images = await db('property_images')
            .where({ property_id: property.id })
            .orderBy('sort_order', 'asc');

        property.images = images;

        const seller = await db('users_seller')
            .where({ id: property.seller_id })
            .select('id', 'first_name', 'last_name', 'email', 'private_or_agency')
            .first();

        property.seller = seller;

        res.json({ success: true, property });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Create property (Protected)
const createProperty = async (req, res) => {
    try {
        console.log(req.body);
        let sellerId = req.user.id;

        // If admin is assigning to a specific vendor
        if (req.user.role === 'admin' && req.body.assigned_vendor_id) {
            sellerId = req.body.assigned_vendor_id;
        }

        const propertyData = { ...req.body, seller_id: sellerId };

        // Fetch city_id from seller's agency
        const userAgency = await db('user_agency')
            .where({ user_id: sellerId, status: 1 })
            .first();
        
        let agencyCityId = null;
        if (userAgency) {
            const agency = await db('agencies')
                .where({ id: userAgency.agency_id })
                .select('city_id')
                .first();
            if (agency) {
                agencyCityId = agency.city_id;
            }
        }

        // Apply agency city_id to property if not already set
        if (!propertyData.city_id && agencyCityId) {
            propertyData.city_id = agencyCityId;
        }

        // Handle Developer creation/lookup
        if (!propertyData.developer_id && propertyData.builder) {
            const existingDev = await db('developers')
                .where({ developer_name: propertyData.builder })
                .first();
            if (existingDev) {
                propertyData.developer_id = existingDev.id;
            } else {
                const [newDevId] = await db('developers').insert({
                    developer_name: propertyData.builder
                });
                propertyData.developer_id = newDevId;
            }
        }

        // Handle Community creation/lookup
        if (!propertyData.community_id && propertyData.community_name) {
            const existingCom = await db('communities')
                .where({ community_name: propertyData.community_name })
                .first();
            if (existingCom) {
                propertyData.community_id = existingCom.id;
            } else {
                const [newComId] = await db('communities').insert({
                    community_name: propertyData.community_name,
                    subcommunity_name: propertyData.subcommunity_name,
                    city_id: propertyData.city_id || agencyCityId || null,
                    developer_id: propertyData.developer_id || null
                });
                propertyData.community_id = newComId;
            }
        }

        // Remove the extra field if it's not a column in the database
        delete propertyData.assigned_vendor_id;

        // Remove images from body if present, they are handled separately
        delete propertyData.images;

        const [id] = await db('properties').insert(propertyData);

        // If images were uploaded via multer
        if (req.files && req.files.length > 0) {
            const imagesToInsert = req.files.map((file, index) => ({
                property_id: id,
                image_url: `/uploads/properties/${file.filename}`,
                sort_order: index
            }));
            await db('property_images').insert(imagesToInsert);
        }

        res.status(201).json({ success: true, message: 'Property created successfully', property_id: id });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update property (Protected)
const updateProperty = async (req, res) => {
    try {
        const { id } = req.params;
        const property = await db('properties').where({ id, seller_id: req.user.id }).first();

        if (!property) {
            return res.status(404).json({ success: false, message: 'Property not found or unauthorized' });
        }

        const updates = { ...req.body };
        delete updates.images;
        delete updates.seller_id;

        await db('properties').where({ id }).update(updates);

        res.json({ success: true, message: 'Property updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete property (Protected)
const deleteProperty = async (req, res) => {
    try {
        const { id } = req.params;
        const property = await db('properties').where({ id, seller_id: req.user.id }).first();

        if (!property) {
            return res.status(404).json({ success: false, message: 'Property not found or unauthorized' });
        }

        // Soft delete
        await db('properties').where({ id }).update({ status: 0 });

        res.json({ success: true, message: 'Property deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getProperties,
    getPropertyById,
    createProperty,
    updateProperty,
    deleteProperty
};

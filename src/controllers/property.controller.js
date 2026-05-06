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

        const query = db('properties');

        // Only admins can see rejected/inactive properties (status 0)
        if (!req.user || req.user.role !== 'admin') {
            query.where({ 'properties.status': 1 });
        }

        if (city_id) query.where({ 'properties.city_id': city_id });
        if (property_status) query.where({ 'properties.property_status': property_status });
        if (property_type) query.where({ 'properties.property_type': property_type });
        if (bedrooms) query.where({ 'properties.bedrooms': bedrooms });
        if (min_price) query.where('properties.price', '>=', min_price);
        if (max_price) query.where('properties.price', '<=', max_price);
        if (search) {
            query.where(function () {
                this.where('properties.listing_title', 'like', `%${search}%`)
                    .orWhere('properties.address', 'like', `%${search}%`)
                    .orWhere('properties.description', 'like', `%${search}%`)
                    .orWhere('properties.community_name', 'like', `%${search}%`);
            });
        }

        const rows = await query
            .leftJoin('developers', 'properties.developer_id', 'developers.id')
            .leftJoin('communities', 'properties.community_id', 'communities.id')
            .leftJoin('cities', 'properties.city_id', 'cities.id')
            .select(
                'properties.*',
                'developers.developer_name as dev_name',
                'communities.community_name as comm_name',
                'cities.city as cty_name'
            )
            .orderBy('properties.date_added', 'desc');

        const properties = [];

        for (let row of rows) {
            const prop = { ...row };

            // Cleanup joined summary fields
            delete prop.dev_name;
            delete prop.comm_name;
            delete prop.cty_name;

            // Fetch full related objects
            if (prop.developer_id) {
                prop.developer = await db('developers').where({ id: prop.developer_id }).first();
            }
            if (prop.community_id) {
                prop.community = await db('communities').where({ id: prop.community_id }).first();
            }
            if (prop.city_id) {
                prop.city = await db('cities').where({ id: prop.city_id }).first();
            }
            if (prop.property_type_id) {
                prop.property_type_obj = await db('property_types').where({ id: prop.property_type_id }).first();
            }

            // Fetch primary image
            const primaryImage = await db('property_images')
                .where({ property_id: prop.id })
                .orderBy('sort_order', 'asc')
                .first();
            prop.primary_image = primaryImage 
                ? `${process.env.BASE_URL || 'http://localhost:5000'}${primaryImage.image_url}` 
                : null;

            // Fetch seller & agency info
            const seller = await db('users_seller')
                .where({ id: prop.seller_id })
                .select('id', 'first_name', 'last_name', 'email', 'phone', 'private_or_agency')
                .first();
            
            if (seller) {
                const agencyLink = await db('user_agency')
                    .where({ user_id: seller.id, status: 1 })
                    .first();
                if (agencyLink) {
                    seller.agency = await db('agencies')
                        .where({ id: agencyLink.agency_id })
                        .first();
                }
            }
            prop.seller = seller;

            properties.push(prop);
        }

        res.json({ success: true, properties });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get single property details
const getPropertyById = async (req, res) => {
    try {
        let query = db('properties').where({ id: req.params.id });

        // Only admins can see rejected/inactive properties (status 0)
        if (!req.user || req.user.role !== 'admin') {
            query.where({ status: 1 });
        }

        const property = await query.first();
        if (!property) {
            return res.status(404).json({ success: false, message: 'Property not found' });
        }

        const images = await db('property_images')
            .where({ property_id: property.id })
            .orderBy('sort_order', 'asc');

        property.images = images.map(img => ({
            ...img,
            image_url: `${process.env.BASE_URL || 'http://localhost:5000'}${img.image_url}`
        }));

        // Fetch related objects
        if (property.developer_id) {
            property.developer = await db('developers').where({ id: property.developer_id }).first();
        }

        if (property.city_id) {
            property.city = await db('cities').where({ id: property.city_id }).first();
        }

        if (property.community_id) {
            property.community = await db('communities').where({ id: property.community_id }).first();
        }

        if (property.property_type_id) {
            property.property_type_obj = await db('property_types').where({ id: property.property_type_id }).first();
        }

        // Fetch seller with agency info
        const seller = await db('users_seller')
            .where({ id: property.seller_id })
            .select('id', 'first_name', 'last_name', 'email', 'phone', 'private_or_agency')
            .first();

        if (seller) {
            // Fetch agency if associated
            const agencyLink = await db('user_agency')
                .where({ user_id: seller.id, status: 1 })
                .first();
            
            if (agencyLink) {
                seller.agency = await db('agencies')
                    .where({ id: agencyLink.agency_id })
                    .first();
            }
        }

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
        let query = db('properties').where({ id });

        // If not admin, restrict to own properties
        if (req.user.role !== 'admin') {
            query.where({ seller_id: req.user.id });
        }

        const property = await query.first();

        if (!property) {
            return res.status(404).json({ success: false, message: 'Property not found or unauthorized' });
        }

        const updates = { ...req.body };
        
        // Map assigned_vendor_id to seller_id if present
        if (updates.assigned_vendor_id && updates.assigned_vendor_id !== 'null') {
            updates.seller_id = updates.assigned_vendor_id;
        }

        // Remove non-database fields
        delete updates.images;
        delete updates.assigned_vendor_id;
        delete updates.keep_images;
        delete updates['keep_images[]'];
        
        // Don't allow non-admins to change status during regular update
        if (req.user.role !== 'admin') {
            delete updates.status;
            delete updates.seller_id; // Non-admins can't reassign
        }

        if (Object.keys(updates).length > 0) {
            await db('properties').where({ id }).update(updates);
        }

        // Handle images
        const keepImages = req.body['keep_images[]'] || req.body.keep_images || [];
        let keepImagesArray = Array.isArray(keepImages) ? keepImages : [keepImages].filter(Boolean);

        // Clean URLs: remove the base URL if present to match DB paths
        keepImagesArray = keepImagesArray.map(url => {
            if (url.includes('/uploads/')) {
                return '/uploads/' + url.split('/uploads/')[1];
            }
            return url;
        });

        // Remove images that are no longer kept
        await db('property_images')
            .where({ property_id: id })
            .whereNotIn('image_url', keepImagesArray)
            .del();

        // Add new images
        if (req.files && req.files.length > 0) {
            // Get current max sort order
            const lastImage = await db('property_images')
                .where({ property_id: id })
                .orderBy('sort_order', 'desc')
                .first();
            
            let currentSortOrder = lastImage ? lastImage.sort_order + 1 : 0;

            const imagesToInsert = req.files.map((file, index) => ({
                property_id: id,
                image_url: `/uploads/properties/${file.filename}`,
                sort_order: currentSortOrder + index
            }));
            await db('property_images').insert(imagesToInsert);
        }

        res.json({ success: true, message: 'Property updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update property status (Admin only)
const updatePropertyStatus = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Unauthorized. Admin access required.' });
        }

        const { id } = req.params;
        const { status } = req.body; // 1 for Approve, 0 for Reject

        if (status === undefined) {
            return res.status(400).json({ success: false, message: 'Status is required (1 for Approve, 0 for Reject)' });
        }

        const property = await db('properties').where({ id }).first();
        if (!property) {
            return res.status(404).json({ success: false, message: 'Property not found' });
        }

        await db('properties').where({ id }).update({ status });

        res.json({ success: true, message: `Property status updated to ${status === 1 ? 'Approved' : 'Rejected'}` });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete property (Protected)
const deleteProperty = async (req, res) => {
    try {
        const { id } = req.params;
        let query = db('properties').where({ id });

        // If not admin, restrict to own properties
        if (req.user.role !== 'admin') {
            query.where({ seller_id: req.user.id });
        }

        const property = await query.first();

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
    updatePropertyStatus,
    deleteProperty
};

const db = require('../config/db');

exports.submitInquiry = async (req, res) => {
    try {
        const { property_id, first_name, last_name, email, phone, message, inquiry_type } = req.body;

        if (!first_name || !email) {
            return res.status(400).json({ success: false, message: 'First name and email are required' });
        }

        const [id] = await db('inquiry_forms').insert({
            property_id,
            first_name,
            last_name,
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
        const { role, id: userId } = req.user;

        let query = db('inquiry_forms as i')
            .leftJoin('properties as p', 'i.property_id', 'p.id')
            .leftJoin('cities as pc', 'p.city_id', 'pc.id')
            .leftJoin('communities as pcm', 'p.community_id', 'pcm.id')
            .leftJoin('developers as pd', 'p.developer_id', 'pd.id')
            .leftJoin('users_seller as u', 'p.seller_id', 'u.id')
            .leftJoin('user_agency as ua', 'u.id', 'ua.user_id')
            .leftJoin('agencies as a', 'ua.agency_id', 'a.id')
            .select(
                'i.*',
                'p.listing_title',
                'p.address',
                'p.property_status',
                'p.property_type',
                'p.price',
                'p.bedrooms',
                'p.bathrooms',
                'p.size',
                'p.size_metric',
                'p.seller_id',
                'pc.city as city_name',
                'pcm.community_name',
                'pd.developer_name',
                'u.first_name as seller_first_name',
                'u.last_name as seller_last_name',
                'u.email as seller_email',
                'u.phone as seller_phone',
                'u.private_or_agency',
                'a.agency_name'
            );

        // Filter by vendor if applicable
        if (role === 'vendor') {
            query = query.where('p.seller_id', userId);
        } else if (role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Unauthorized access' });
        }

        const rows = await query.orderBy('i.created_at', 'desc');

        const inquiries = [];
        for (let row of rows) {
            const inq = {
                id: row.id,
                first_name: row.first_name,
                last_name: row.last_name,
                email: row.email,
                phone: row.phone,
                message: row.message,
                inquiry_type: row.inquiry_type,
                created_at: row.created_at,
            };

            // Fetch Property Object (Full Detail Pattern)
            const property = await db('properties').where({ id: row.property_id }).first();
            if (property) {
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
                
                // Fetch primary image
                const primaryImage = await db('property_images')
                    .where({ property_id: property.id })
                    .orderBy('sort_order', 'asc')
                    .first();
                property.primary_image = primaryImage 
                    ? `${process.env.BASE_URL || 'http://localhost:5000'}${primaryImage.image_url}` 
                    : null;
            }
            inq.property = property;

            // Fetch Vendor (User) Object with Agency
            const vendor = await db('users_seller')
                .where({ id: row.seller_id })
                .select('id', 'first_name', 'last_name', 'email', 'phone', 'private_or_agency', 'role', 'status')
                .first();
            
            if (vendor) {
                const agencyLink = await db('user_agency')
                    .where({ user_id: vendor.id, status: 1 })
                    .first();
                if (agencyLink) {
                    vendor.agency = await db('agencies')
                        .where({ id: agencyLink.agency_id })
                        .first();
                    if (vendor.agency && vendor.agency.city_id) {
                        vendor.agency.city = await db('cities').where({ id: vendor.agency.city_id }).first();
                    }
                }
            }
            inq.vendor = vendor;

            inquiries.push(inq);
        }

        res.json({ success: true, inquiries });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

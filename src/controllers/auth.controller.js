const db = require('../config/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const register = async (req, res) => {
    const trx = await db.transaction();
    try {
        const { first_name, last_name, email, password, private_or_agency, agency_id, agency_name, city_id, phone } = req.body;

        const role = private_or_agency || 'private';
        const userRole = 'vendor';

        const existing = await db('users_seller').where({ email }).first();
        if (existing) {
            await trx.rollback();
            return res.status(400).json({ success: false, message: 'Email already registered' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const insertResults = await trx('users_seller').insert({
            first_name,
            last_name,
            email: email.toLowerCase(),
            password: hashedPassword,
            role: userRole,
            private_or_agency: role,
            phone: phone || null
        });

        const userId = insertResults[0];

        if (role === 'agency') {
            let finalAgencyId = agency_id;

            if (finalAgencyId) {
                // Existing agency selected — update its city_id if provided
                if (city_id) {
                    await trx('agencies')
                        .where({ id: finalAgencyId })
                        .update({ city_id });
                }
            } else if (agency_name) {
                // New agency — check for duplicates first
                const existingAgency = await trx('agencies').where({ agency_name }).first();
                if (existingAgency) {
                    finalAgencyId = existingAgency.id;
                    // Update city_id on the matched existing agency too
                    if (city_id) {
                        await trx('agencies')
                            .where({ id: finalAgencyId })
                            .update({ city_id });
                    }
                } else {
                    const agencyData = { agency_name };
                    if (city_id) agencyData.city_id = city_id;
                    const agencyInsertResults = await trx('agencies').insert(agencyData);
                    finalAgencyId = agencyInsertResults[0];
                }
            }

            if (finalAgencyId) {
                // Link user to agency
                await trx('user_agency').insert({
                    user_id: userId,
                    agency_id: finalAgencyId
                });
            }
        }

        await trx.commit();

        const token = jwt.sign({ id: userId, email, first_name }, process.env.JWT_SECRET, { expiresIn: '24h' });
        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            token,
            user: { id: userId, email, first_name, last_name, private_or_agency: role, phone }
        });
    } catch (error) {
        await trx.rollback();
        res.status(500).json({ success: false, message: error.message });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await db('users_seller').where({ email: email.toLowerCase() }).first();
        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid credentials' });
        }

        if (user.status === 0) {
            return res.status(403).json({ success: false, message: 'Account suspended' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id, email: user.email, first_name: user.first_name, role: user.role }, process.env.JWT_SECRET, { expiresIn: '24h' });
        res.status(200).json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                role: user.role,
                private_or_agency: user.private_or_agency
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getMe = async (req, res) => {
    try {
        const user = await db('users_seller').where({ id: req.user.id }).first();
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        delete user.password;

        // Attach agency data if the user is an agency seller
        if (user.private_or_agency === 'agency') {
            const link = await db('user_agency').where({ user_id: user.id }).first();
            if (link) {
                const agency = await db('agencies').where({ id: link.agency_id }).first();
                if (agency) {
                    user.agency_id = agency.id;
                    user.agency_name = agency.agency_name;
                    user.agency_address = agency.address;
                    user.agency_city_id = agency.city_id;

                    // Also return the city name for display
                    if (agency.city_id) {
                        const cityRow = await db('cities').where({ id: agency.city_id }).first();
                        if (cityRow) {
                            user.agency_city_label = cityRow.state
                                ? `${cityRow.city}, ${cityRow.state}`
                                : cityRow.city;
                        }
                    }
                }
            }
        }

        res.status(200).json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const updateProfile = async (req, res) => {
    try {
        const { first_name, last_name, phone, agency_name, agency_address, agency_city_id } = req.body;
        const userId = req.user.id;

        await db('users_seller')
            .where({ id: userId })
            .update({
                first_name,
                last_name,
                phone: phone || null
            });

        // Update agency fields if user is an agency seller
        const user = await db('users_seller').where({ id: userId }).first();
        if (user.private_or_agency === 'agency') {
            const link = await db('user_agency').where({ user_id: userId }).first();
            if (link) {
                const agencyUpdate = {};
                if (agency_name !== undefined) agencyUpdate.agency_name = agency_name;
                if (agency_address !== undefined) agencyUpdate.address = agency_address;
                if (agency_city_id !== undefined) agencyUpdate.city_id = agency_city_id;

                if (Object.keys(agencyUpdate).length > 0) {
                    await db('agencies').where({ id: link.agency_id }).update(agencyUpdate);
                }
            }
        }

        const updatedUser = await db('users_seller').where({ id: userId }).first();
        delete updatedUser.password;

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            user: updatedUser
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const updatePassword = async (req, res) => {
    try {
        const { current_password, new_password } = req.body;
        const userId = req.user.id;

        const user = await db('users_seller').where({ id: userId }).first();
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const isMatch = await bcrypt.compare(current_password, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Current password is incorrect' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedNewPassword = await bcrypt.hash(new_password, salt);

        await db('users_seller')
            .where({ id: userId })
            .update({ password: hashedNewPassword });

        res.status(200).json({
            success: true,
            message: 'Password updated successfully'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getProfileData = async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await db('users_seller as u')
            .leftJoin('user_agency as ua', 'u.id', 'ua.user_id')
            .leftJoin('agencies as a', 'ua.agency_id', 'a.id')
            .leftJoin('cities as c', 'a.city_id', 'c.id')
            .where('u.id', userId)
            .select(
                'u.id',
                'u.first_name',
                'u.last_name',
                'u.email',
                'u.phone',
                'u.private_or_agency',
                'a.agency_name',
                'a.address as agency_address',
                'a.city_id as agency_city_id',
                'c.city as city_name',
                'c.state as city_state'
            )
            .first();

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Format city label for the frontend
        if (user.city_name) {
            user.agency_city_label = user.city_state
                ? `${user.city_name}, ${user.city_state}`
                : user.city_name;
        }

        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    register,
    login,
    getMe,
    getProfileData,
    updateProfile,
    updatePassword
};

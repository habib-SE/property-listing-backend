const db = require('../src/config/db');

async function addPhoneColumn() {
    try {
        const hasPhone = await db.schema.hasColumn('users_seller', 'phone');
        if (!hasPhone) {
            await db.schema.table('users_seller', (table) => {
                table.string('phone', 50).nullable().after('email');
            });
            console.log('Column "phone" added to "users_seller" table.');
        } else {
            console.log('Column "phone" already exists.');
        }
        process.exit(0);
    } catch (error) {
        console.error('Error adding column:', error);
        process.exit(1);
    }
}

addPhoneColumn();

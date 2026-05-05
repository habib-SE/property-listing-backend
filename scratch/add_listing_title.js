const db = require('../src/config/db');

async function setup() {
    try {
        console.log('Adding listing_title to properties table...');
        
        const hasColumn = await db.schema.hasColumn('properties', 'listing_title');
        if (!hasColumn) {
            await db.schema.alterTable('properties', (table) => {
                table.string('listing_title', 255).after('id');
            });
            console.log('Added listing_title column');
        } else {
            console.log('listing_title column already exists');
        }

        process.exit(0);
    } catch (error) {
        console.error('Alter failed:', error);
        process.exit(1);
    }
}

setup();

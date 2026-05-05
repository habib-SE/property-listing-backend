const db = require('../src/config/db');

async function setup() {
    try {
        console.log('Adding property_type_id to properties table...');
        
        const hasColumn = await db.schema.hasColumn('properties', 'property_type_id');
        if (!hasColumn) {
            await db.schema.alterTable('properties', (table) => {
                table.integer('property_type_id').unsigned().references('id').inTable('property_types').onDelete('SET NULL');
            });
            console.log('Added property_type_id column');
        } else {
            console.log('property_type_id column already exists');
        }

        process.exit(0);
    } catch (error) {
        console.error('Alter failed:', error);
        process.exit(1);
    }
}

setup();

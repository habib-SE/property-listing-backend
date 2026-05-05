const db = require('../src/config/db');

async function setup() {
    try {
        console.log('Adding developer_id and community_id to properties table...');
        
        await db.schema.alterTable('properties', (table) => {
            if (!(await db.schema.hasColumn('properties', 'developer_id'))) {
                table.integer('developer_id').unsigned().references('id').inTable('developers').onDelete('SET NULL');
                console.log('Added developer_id column');
            }
            if (!(await db.schema.hasColumn('properties', 'community_id'))) {
                table.integer('community_id').unsigned().references('id').inTable('communities').onDelete('SET NULL');
                console.log('Added community_id column');
            }
        });

        process.exit(0);
    } catch (error) {
        console.error('Alter failed:', error);
        process.exit(1);
    }
}

setup();

const db = require('../src/config/db');

async function setup() {
    try {
        console.log('Starting property types setup...');
        
        const tableExists = await db.schema.hasTable('property_types');
        if (!tableExists) {
            await db.schema.createTable('property_types', (table) => {
                table.increments('id').primary();
                table.string('type_code', 10).unique().notNullable();
                table.string('type_name', 100).notNullable();
                table.smallint('status').defaultTo(1);
            });
            console.log('Created table property_types');
        } else {
            console.log('Table property_types already exists');
        }

        const types = [
            { type_code: 'AP', type_name: 'Apartment' },
            { type_code: 'DE', type_name: 'Detached' },
            { type_code: 'TH', type_name: 'Townhouse' },
            { type_code: 'SD', type_name: 'Semi-detached' },
            { type_code: 'LA', type_name: 'Land' },
            { type_code: 'OF', type_name: 'Office' },
            { type_code: 'WH', type_name: 'Warehouse' },
            { type_code: 'SH', type_name: 'Shop' },
        ];

        for (const type of types) {
            const existing = await db('property_types').where({ type_code: type.type_code }).first();
            if (!existing) {
                await db('property_types').insert(type);
                console.log(`Inserted ${type.type_name}`);
            } else {
                console.log(`Type ${type.type_name} already exists`);
            }
        }

        console.log('Property types setup complete');
        process.exit(0);
    } catch (error) {
        console.error('Setup failed:', error);
        process.exit(1);
    }
}

setup();

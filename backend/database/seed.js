const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://localhost:5432/affog_development';

async function seed() {
    const client = new Client({ connectionString: DATABASE_URL });

    try {
        console.log('🔌 Connecting to database...');
        await client.connect();

        console.log('📦 Loading permits.json data...');
        const permitsData = JSON.parse(
            fs.readFileSync(path.join(__dirname, '../permits.json'), 'utf8')
        );

        console.log(`🌱 Seeding ${permitsData.length} permits...`);

        for (const permit of permitsData) {
            await client.query(
                `INSERT INTO permits (
          project_title, location, country, activity, status, category,
          capacity, species, coordinates, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                [
                    permit.project_title,
                    permit.location,
                    permit.country,
                    permit.activity,
                    permit.status || 'pending',
                    permit.category || 'Unknown',
                    permit.capacity,
                    permit.species || 'Unknown',
                    JSON.stringify(permit.coordinates),
                    permit.notes || '',
                ]
            );
        }

        // Seed some activity log entries for demo
        console.log('📊 Seeding activity log...');
        const countries = [...new Set(permitsData.map(p => p.country))];
        const actions = ['permit_added', 'objection_generated', 'objection_sent'];

        for (let i = 0; i < 20; i++) {
            await client.query(
                `INSERT INTO activity_log (action, target, country, created_at)
         VALUES ($1, $2, $3, NOW() - INTERVAL '${i} hours')`,
                [
                    actions[Math.floor(Math.random() * actions.length)],
                    permitsData[Math.floor(Math.random() * permitsData.length)].project_title,
                    countries[Math.floor(Math.random() * countries.length)],
                ]
            );
        }

        console.log('✅ Database seeded successfully!');
        console.log(`   - ${permitsData.length} permits inserted`);
        console.log(`   - 20 activity log entries created`);
    } catch (error) {
        console.error('❌ Seeding failed:', error.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

if (require.main === module) {
    seed();
}

module.exports = { seed };

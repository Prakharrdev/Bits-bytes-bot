const db = require('../lib/db');
db.get('SELECT 1 as val')
    .then(r => {
        console.log('Turso connected successfully! Row:', r);
        process.exit(0);
    })
    .catch(e => {
        console.error('Turso error:', e);
        process.exit(1);
    });

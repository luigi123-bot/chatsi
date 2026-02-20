const Database = require('better-sqlite3');
const path = require('path');

try {
    const dbPath = path.resolve(__dirname, 'sqlite.db');
    const db = new Database(dbPath);
    console.log('--- DB Check ---');

    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
    console.log('User count:', userCount.count);

    if (userCount.count > 0) {
        const firstUser = db.prepare('SELECT id, name FROM users LIMIT 1').get();
        console.log('First user:', firstUser);
    }

    const convCount = db.prepare('SELECT COUNT(*) as count FROM conversations').get();
    console.log('Conversation count:', convCount.count);

    const partCount = db.prepare('SELECT COUNT(*) as count FROM participants').get();
    console.log('Participant count:', partCount.count);

    const msgCount = db.prepare('SELECT COUNT(*) as count FROM messages').get();
    console.log('Message count:', msgCount.count);

} catch (err) {
    console.error('Diagnostic error:', err);
}

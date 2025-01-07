const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const db = new sqlite3.Database('./database.sqlite');
const saltRounds = 12;

async function hashExistingPasswords() {
    return new Promise((resolve, reject) => {
        db.all('SELECT id, password FROM users', [], async (err, rows) => {
            if (err) {
                reject(err);
                return;
            }

            for (const row of rows) {
                if (!row.password.startsWith('$2b$')) {
                    const hashedPassword = await bcrypt.hash(row.password, saltRounds);
                    await new Promise((resolve, reject) => {
                        db.run('UPDATE users SET password = ? WHERE id = ?', 
                            [hashedPassword, row.id], 
                            (err) => err ? reject(err) : resolve()
                        );
                    });
                    console.log(`Updated password for user ID ${row.id}`);
                }
            }
            resolve();
        });
    });
}

hashExistingPasswords()
    .then(() => {
        console.log('All passwords have been hashed');
        process.exit(0);
    })
    .catch(err => {
        console.error('Error hashing passwords:', err);
        process.exit(1);
    }); 
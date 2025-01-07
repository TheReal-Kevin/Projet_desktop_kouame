const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite'); // Utilisation de la base de données existante
const bcrypt = require('bcrypt');
const saltRounds = 12; // nombre de tours de hachage


// table users
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE,
        password TEXT,
        role TEXT
    )`);

    // table attendances
    db.run(`CREATE TABLE IF NOT EXISTS attendances (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timetable_id INTEGER NOT NULL,
        student_id INTEGER NOT NULL,
        status TEXT NOT NULL,
        marked_by INTEGER NOT NULL,
        marked_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(timetable_id) REFERENCES timetables(id),
        FOREIGN KEY(student_id) REFERENCES users(id),
        FOREIGN KEY(marked_by) REFERENCES users(id)
    )`);

    // contrainte UNIQUE
    db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_unique 
        ON attendances(timetable_id, student_id)`);
});



// table justifications
db.serialize(() => {
    // table justifications
    db.run(`CREATE TABLE IF NOT EXISTS justifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_presence_id INTEGER NOT NULL UNIQUE,
        reason TEXT NOT NULL,
        date DATE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(student_presence_id) REFERENCES attendances(id)
    )`, [], (err) => {
        if (err) {
            console.error('Erreur lors de la création de la table justifications:', err);
        } else {
            console.log('Table justifications vérifiée/créée avec succès');
        }
    });
});



// Fonction pour vérifier les identifiants de l'utilisateur
async function checkUserCredentials(email, password) {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM users WHERE email = ?', [email], async (err, row) => {
            if (err) {
                console.error('Database error:', err);
                reject(err);
            } else if (!row) {
                console.log('No user found with email:', email);
                resolve(false);
            } else {
                try {
                    console.log('Found user:', row.email);
                    console.log('Stored password format:', row.password.substring(0, 10) + '...');
                    
                    // Vérifie si le mot de passe est déjà hashé
                    if (row.password.startsWith('$2b$')) {
                        console.log('Password is hashed, using bcrypt.compare');
                        const match = await bcrypt.compare(password, row.password);
                        console.log('Password match:', match);
                        resolve(match);
                    } else {
                        console.log('Password is not hashed, using direct comparison');
                        const match = (password === row.password);
                        if (match) {
                            console.log('Password matches, updating to hashed version');
                            const hashedPassword = await bcrypt.hash(password, saltRounds);
                            db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, row.id]);
                        }
                        resolve(match);
                    }
                } catch (error) {
                    console.error('Error during password verification:', error);
                    reject(error);
                }
            }
        });
    });
}



// Fonction pour lire tous les utilisateurs
function getAllUsers() {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM users', [], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}



// Fonction pour créer un utilisateur
async function createUser(name, email, password, role) {
    return new Promise(async (resolve, reject) => {
        try {
            // Crypter le mot de passe
            const hashedPassword = await bcrypt.hash(password, saltRounds);
            
            const insertQuery = 'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)';
            db.run(insertQuery, [name, email, hashedPassword, role], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        } catch (error) {
            reject(error);
        }
    });
}



// Fonction pour mettre à jour un utilisateur
async function updateUser(userId, name, email, password, role, classId) {
    return new Promise(async (resolve, reject) => {
        try {
            db.serialize(async () => {
                db.run('BEGIN TRANSACTION');

                // Si un nouveau mot de passe est fourni, le crypter
                let hashedPassword = password;
                if (password) {
                    hashedPassword = await bcrypt.hash(password, saltRounds);
                } else {
                    // Si pas de nouveau mot de passe, récupérer l'ancien
                    const user = await new Promise((resolve, reject) => {
                        db.get('SELECT password FROM users WHERE id = ?', [userId], (err, row) => {
                            if (err) reject(err);
                            else resolve(row);
                        });
                    });
                    hashedPassword = user.password;
                }

                // Mettre à jour les informations de l'utilisateur
                const updateUserQuery = 'UPDATE users SET name = ?, email = ?, password = ?, role = ? WHERE id = ?';
                db.run(updateUserQuery, [name, email, hashedPassword, role, userId]);

                // Si c'est un étudiant, mettre à jour sa classe
                if (role === 'students' && classId) {
                    db.get('SELECT * FROM students WHERE user_id = ?', [userId], (err, row) => {
                        if (row) {
                            db.run('UPDATE students SET class_id = ? WHERE user_id = ?', [classId, userId]);
                        } else {
                            db.run('INSERT INTO students (user_id, class_id) VALUES (?, ?)', [userId, classId]);
                        }
                    });
                }

                db.run('COMMIT');
                resolve();
            });
        } catch (error) {
            db.run('ROLLBACK');
            reject(error);
        }
    });
}



// Fonction pour supprimer un utilisateur
function deleteUser(id) {
    return new Promise((resolve, reject) => {
        const deleteQuery = `DELETE FROM users WHERE id = ?`;
        db.run(deleteQuery, [id], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve(this.changes); // Retourne le nombre de lignes supprimées
            }
        });
    });
}



// Fonction pour obtenir le role d'un utilisateur lors de la connexion
async function getUserRole(email, password) {
    return new Promise(async (resolve, reject) => {
        try {
            // D'abord vérifier les identifiants
            const isValid = await checkUserCredentials(email, password);
            if (!isValid) {
                resolve(null);
                return;
            }

            // Si les identifiants sont valides, récupérer le rôle
            db.get('SELECT role FROM users WHERE email = ?', [email], (err, row) => {
                if (err) {
                    reject(err);
                } else if (row) {
                    resolve(row.role);
                } else {
                    resolve(null);
                }
            });
        } catch (error) {
            reject(error);
        }
    });
}



// Fonction pour obtenir tous les rôles
async function getAllRoles() {
    return new Promise((resolve, reject) => {
        db.all('SELECT DISTINCT role FROM users', [], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows.map(row => ({ value: row.role, name: row.role }))); // Retourne un tableau d'objets avec value et name
            }
        });
    });
}



// Fonction pour récupérer tous les jours
function getAllDays() {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM days', [], (err, rows) => {
            if (err) {
                console.error('Error fetching days:', err);
                reject(err);
            } else {
                console.log('Days fetched:', rows);
                resolve(rows);
            }
        });
    });
}



// Fonction pour récupérer tous les cours
async function getAllCourses() {
    return new Promise((resolve, reject) => {
        db.all('SELECT id, name FROM courses', [], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows.map(row => ({ id: row.id, name: row.name })));
            }
        });
    });
}



// obtenir le username de l'admin
async function getUserName(email) {
    return new Promise((resolve, reject) => {
        db.get('SELECT name FROM users WHERE email = ?', [email], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row ? row.name : null); // Retourne le nom ou null si non trouvé
            }
        });
    });
}



// obtenir le username du parents
async function getParentName(email) {
    return new Promise((resolve, reject) => {
        db.get('SELECT name FROM users WHERE email = ? AND role = ?', [email, 'parents'], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row ? row.name : null); // Retourne le nom ou null si non trouvé
            }
        });
    });
}



// fucntion pour recuperer le nom du students
async function getStudentName(email) {
    return new Promise((resolve, reject) => {
        db.get('SELECT name FROM users WHERE email = ? AND role = ?', [email, 'students'], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row ? row.name : null); // Retourne le nom ou null si non trouvé
            }
        });
    });
}



// funtion pour recuperer le nom du teachers
async function getTeacherName(email) {
    return new Promise((resolve, reject) => {
        db.get('SELECT name FROM users WHERE email = ? AND role = ?', [email, 'teachers'], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row ? row.name : null); // retourne le nom ou null si non trouvé
            }
        });
    });
}



//fonction pour recuperer tous les enseignants sur le dashboard admin
async function getAllTeachers() {
    return new Promise((resolve, reject) => {
        db.all('SELECT id, name FROM users WHERE role = ?', ['teachers'], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}



// fonction pour recuperer tous les enseignants
async function getTeachers() {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT 
                t.id,
                t.user_id,
                t.created_at,
                t.updated_at,
                u.name 
            FROM teachers t
            JOIN users u ON t.user_id = u.id
            WHERE u.role = 'teachers'
        `;
        db.all(query, [], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                // Transforme les données pour inclure toutes les informations
                const teachers = rows.map(row => ({
                    id: row.id,
                    user_id: row.user_id,
                    name: row.name,
                    created_at: row.created_at,
                    updated_at: row.updated_at
                }));
                resolve(teachers);
            }
        });
    });
}



// fonction pour recuperer tous les classes sur le dashboard admin
async function getAllClasses() {
    return new Promise((resolve, reject) => {
        db.all('SELECT id, name FROM classes', [], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows.map(row => ({ value: row.id, name: row.name }))); // Retourne un tableau d'objets avec id et name
            }
        });
    });
}



// fonction pour recuperer tous les classes dans timetable
async function getClasses() {
    return new Promise((resolve, reject) => {
        db.all('SELECT id, name FROM classes', [], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}



// Fonction pour récupérer tous les créneaux horaires
async function getTimeSlots() {
    return new Promise((resolve, reject) => {
        db.all('SELECT id, start_time, end_time FROM time_slots', [], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows.map(row => ({ id: row.id, start_time: row.start_time, end_time: row.end_time })));
            }
        });
    });
}



// Fonction pour récupérer les rôles distincts depuis la table users
async function getDistinctRoles() {
    return new Promise((resolve, reject) => {
        const query = 'SELECT DISTINCT role FROM users'; // Récupère les rôles distincts
        db.all(query, [], (err, rows) => {
            if (err) {
                reject(err); // Rejette la promesse en cas d'erreur
            } else {
                resolve(rows); // Résout la promesse avec les rôles récupérés
            }
        });
    });
}



function createTimetable(classId, courseId, dayId, timeSlotId, teacherId, color) {
    return new Promise((resolve, reject) => {
        // Vérifier d'abord si le créneau est disponible
        db.get(
            'SELECT id FROM timetables WHERE class_id = ? AND day_id = ? AND time_slot_id = ?',
            [classId, dayId, timeSlotId],
            (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                if (row) {
                    reject(new Error('This time slot is already occupied for this class'));
                    return;
                }

                // Si le créneau est libre, créer le nouveau cours
                const query = 'INSERT INTO timetables (class_id, course_id, day_id, time_slot_id, teacher_id, color) VALUES (?, ?, ?, ?, ?, ?)';
                db.run(query, [classId, courseId, dayId, timeSlotId, teacherId, color], function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(this.lastID);
                    }
                });
            }
        );
    });
}

function updateTimetable(timetableId, classId, courseId, dayId, timeSlotId, teacherId, color) {
    return new Promise((resolve, reject) => {
        const query = 'UPDATE timetables SET class_id = ?, course_id = ?, day_id = ?, time_slot_id = ?, teacher_id = ?, color = ? WHERE id = ?';
        db.run(query, [classId, courseId, dayId, timeSlotId, teacherId, color, timetableId], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve(this.changes);
            }
        });
    });
}

function deleteTimetable(timetableId) {
    return new Promise((resolve, reject) => {
        const query = 'DELETE FROM timetables WHERE id = ?';
        db.run(query, [timetableId], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve(this.changes);
            }
        });
    });
}



// Fonction pour récupérer l'emploi du temps
function getTimetable() {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT 
                t.id,
                t.class_id,
                t.course_id,
                t.day_id,
                t.time_slot_id,
                t.teacher_id,
                t.color,
                c.name as class_name,
                co.name as course_name,
                d.name as day_name,
                ts.start_time,
                ts.end_time,
                u.name as teacher_name
            FROM timetables t
            JOIN classes c ON t.class_id = c.id
            JOIN courses co ON t.course_id = co.id
            JOIN days d ON t.day_id = d.id
            JOIN time_slots ts ON t.time_slot_id = ts.id
            JOIN teachers te ON t.teacher_id = te.id
            JOIN users u ON te.user_id = u.id
            ORDER BY ts.start_time, d.id
        `;
        db.all(query, [], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}



// fonction pour recuperer la classe du student
async function getStudentClass(email) {
    return new Promise((resolve, reject) => {
        db.get('SELECT class_id FROM students WHERE user_id = (SELECT id FROM users WHERE email = ?)', [email], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row ? row.class_id : null);
            }
        });
    });
}



// Fonction de débogage pour vérifier un utilisateur
async function debugUser(email) {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}



// fonction pour recuperer l'emploi du temps du teacher
async function getTeacherTimetable(email) {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT 
                t.id,
                t.class_id,
                t.course_id,
                t.day_id,
                t.time_slot_id,
                t.color,
                c.name as class_name,
                co.name as course_name,
                d.name as day_name,
                ts.start_time,
                ts.end_time
            FROM timetables t
            JOIN classes c ON t.class_id = c.id
            JOIN courses co ON t.course_id = co.id
            JOIN days d ON t.day_id = d.id
            JOIN time_slots ts ON t.time_slot_id = ts.id
            JOIN teachers te ON t.teacher_id = te.id
            JOIN users u ON te.user_id = u.id
            WHERE u.email = ?
            ORDER BY ts.start_time, d.id
        `;
        
        db.all(query, [email], (err, rows) => {
            if (err) {
                console.error('Error getting teacher timetable:', err);
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}



// Fonction pour récupérer tous les étudiants
async function getAllStudents() {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT u.id, u.name 
            FROM users u
            WHERE u.role = 'students'
        `;
        
        db.all(query, [], (err, rows) => {
            if (err) {
                console.error('Error fetching students:', err);
                reject(err);
            } else {
                console.log('Students fetched:', rows);
                resolve(rows);
            }
        });
    });
}



// Fonction pour assigner des étudiants à un parent
async function assignStudentsToParent(parentId, studentIds) {
    return new Promise((resolve, reject) => {
        const values = studentIds.map(studentId => [parentId, studentId]);
        
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');
            
            // Supprimer les anciennes relations
            db.run('DELETE FROM parent_student WHERE parent_id = ?', [parentId]);
            
            const stmt = db.prepare('INSERT INTO parent_student (parent_id, student_id) VALUES (?, ?)');
            values.forEach(value => {
                stmt.run(value, (err) => {
                    if (err) {
                        console.error('Error inserting parent-student relation:', err);
                    }
                });
            });
            stmt.finalize();
            
            db.run('COMMIT', (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    });
}



// Fonction pour obtenir les étudiants d'un parent
async function getParentStudents(parentId) {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT 
                s.id, 
                u.name,
                c.id as class_id,
                c.name as class_name
            FROM users u
            JOIN parent_student ps ON u.id = ps.student_id
            JOIN students s ON u.id = s.user_id
            JOIN classes c ON s.class_id = c.id
            WHERE ps.parent_id = ?
            ORDER BY u.name
        `;
        
        db.all(query, [parentId], (err, rows) => {
            if (err) {
                console.error('Error in getParentStudents:', err);
                reject(err);
            } else {
                console.log('Parent students data:', rows);
                resolve(rows);
            }
        });
    });
}



// Fonction pour obtenir les étudiants et leurs emplois du temps pour un parent
async function getParentStudentsWithTimetable(parentId) {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT 
                s.id as student_id,
                u.name as student_name,
                t.id as timetable_id,
                t.day_id,
                t.time_slot_id,
                t.color,
                c.name as class_name,
                co.name as course_name,
                ts.start_time,
                ts.end_time,
                teacher.name as teacher_name,
                d.name as day_name
            FROM parent_student ps
            JOIN users u ON ps.student_id = u.id
            JOIN students s ON u.id = s.user_id
            JOIN classes c ON s.class_id = c.id
            LEFT JOIN timetables t ON c.id = t.class_id
            LEFT JOIN courses co ON t.course_id = co.id
            LEFT JOIN days d ON t.day_id = d.id
            LEFT JOIN time_slots ts ON t.time_slot_id = ts.id
            LEFT JOIN teachers te ON t.teacher_id = te.id
            LEFT JOIN users teacher ON te.user_id = teacher.id
            WHERE ps.parent_id = ?
            ORDER BY s.id, ts.start_time, d.id
        `;
        
        db.all(query, [parentId], (err, rows) => {
            if (err) {
                console.error('Database error:', err);
                reject(err);
            } else {
                // ont Organise les données par étudiant
                const studentsMap = new Map();
                
                rows.forEach(row => {
                    if (!studentsMap.has(row.student_id)) {
                        studentsMap.set(row.student_id, {
                            id: row.student_id,
                            name: row.student_name,
                            timetable: []
                        });
                    }
                    
                    if (row.timetable_id) {
                        studentsMap.get(row.student_id).timetable.push({
                            id: row.timetable_id,
                            day_id: row.day_id,
                            time_slot_id: row.time_slot_id,
                            color: row.color,
                            class_name: row.class_name,
                            course_name: row.course_name,
                            start_time: row.start_time,
                            end_time: row.end_time,
                            teacher_name: row.teacher_name,
                            day_name: row.day_name
                        });
                    }
                });
                
                resolve(Array.from(studentsMap.values()));
            }
        });
    });
}



// Fonction pour obtenir l'emploi du temps d'un étudiant
async function getStudentTimetable(studentId) {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT 
                t.id,
                t.day_id,
                t.time_slot_id,
                t.color,
                c.name as class_name,
                co.name as course_name,
                ts.start_time,
                ts.end_time,
                u.name as teacher_name,
                d.name as day_name
            FROM timetables t
            JOIN classes c ON t.class_id = c.id
            JOIN courses co ON t.course_id = co.id
            JOIN days d ON t.day_id = d.id
            JOIN time_slots ts ON t.time_slot_id = ts.id
            JOIN teachers te ON t.teacher_id = te.id
            JOIN users u ON te.user_id = u.id
            JOIN students s ON c.id = s.class_id
            WHERE s.user_id = ?
            ORDER BY ts.start_time, d.id
        `;
        
        db.all(query, [studentId], (err, rows) => {
            if (err) {
                console.error('Database error:', err);
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}



// Fonction pour obtenir l'ID d'un utilisateur à partir de son email
async function getUserId(email) {
    return new Promise((resolve, reject) => {
        const query = 'SELECT id FROM users WHERE email = ?';
        db.get(query, [email], (err, row) => {
            if (err) {
                console.error('Error getting user ID:', err);
                reject(err);
            } else {
                resolve(row ? row.id : null);
            }
        });
    });
}



// Fonction pour récupérer les étudiants d'une classe
async function getClassStudents(classId) {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT u.id, u.name
            FROM users u
            JOIN students s ON u.id = s.user_id
            WHERE s.class_id = ?
            ORDER BY u.name
        `;
        
        db.all(query, [classId], (err, rows) => {
            if (err) {
                console.error('Error getting class students:', err);
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}



// fonction pour marquer la présence
async function markAttendance(attendanceData) {
    return new Promise((resolve, reject) => {
        const { timetable_id, student_id, status, marked_by, marked_at } = attendanceData;
        
        
        if (!timetable_id || !student_id || !status || !marked_by || !marked_at) {
            console.error('Données manquantes:', { timetable_id, student_id, status, marked_by, marked_at });
            reject(new Error('Données de présence incomplètes'));
            return;
        }

        
        const userId = marked_by.user_id || marked_by;
        if (!userId || typeof userId !== 'number' || userId <= 0) {
            console.error('ID de marquage invalide:', userId);
            reject(new Error('ID de l\'utilisateur manquant ou invalide'));
            return;
        }

        // Vérifie  si l'utilisateur existant et est un coordinateur
        const checkUserQuery = `
            SELECT id, role FROM users WHERE id = ?
        `;

        db.get(checkUserQuery, [userId], (err, user) => {
            if (err) {
                console.error('Erreur lors de la vérification de l\'utilisateur:', err);
                reject(err);
                return;
            }

            if (!user) {
                console.error('Utilisateur non trouvé:', userId);
                reject(new Error('Utilisateur non trouvé'));
                return;
            }

            
            const query = `
                INSERT INTO attendances (
                    timetable_id, 
                    student_id, 
                    status, 
                    marked_by, 
                    marked_at, 
                    created_at, 
                    updated_at
                )
                VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ON CONFLICT(timetable_id, student_id) 
                DO UPDATE SET 
                    status = ?, 
                    marked_by = ?, 
                    marked_at = ?,
                    updated_at = CURRENT_TIMESTAMP
            `;
            
            db.run(
                query,
                [
                    timetable_id, 
                    student_id, 
                    status, 
                    userId,
                    marked_at,
                    status, 
                    userId,
                    marked_at
                ],
                function(err) {
                    if (err) {
                        console.error('Erreur SQL:', err);
                        reject(err);
                    } else {
                        console.log('Présence marquée avec succès. ID:', this.lastID);
                        resolve(this.lastID);
                    }
                }
            );
        });
    });
}



// Fonction pour récupérer la présence d'une session
async function getSessionAttendance(sessionId) {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT a.*, u.name as student_name
            FROM attendances a
            JOIN users u ON a.student_id = u.id
            WHERE a.timetable_id = ?
        `;
        
        db.all(query, [sessionId], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}



// Fonction pour récupérer les étudiants d'un cours
async function getCourseStudents(timetableId) {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT DISTINCT u.id as user_id, u.name
            FROM users u
            JOIN students s ON u.id = s.user_id
            JOIN timetables t ON s.class_id = t.class_id
            WHERE t.id = ?
            ORDER BY u.name
        `;
        
        db.all(query, [timetableId], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}



// Fonction pour récupérer les statistiques de présence
async function getAttendanceStatistics(courseId, period, classId) {
    return new Promise((resolve, reject) => {
        // Requête pour les statistiques globales
        let summaryQuery = `
            SELECT 
                SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_count,
                SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_count,
                SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late_count
            FROM timetables t
            LEFT JOIN attendances a ON a.timetable_id = t.id
            ${classId ? 'WHERE t.class_id = ?' : ''}
        `;

        // Requête pour les statistiques détaillées par étudiant
        let detailedQuery = `
            WITH StudentStats AS (
                SELECT 
                    u.id as student_id,
                    u.name as student_name,
                    c.id as class_id,
                    c.name as class_name,
                    co.name as course_name,
                    COUNT(DISTINCT t.id) as total_sessions,
                    SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as attended_sessions,
                    SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late_sessions
                FROM users u
                JOIN students s ON u.id = s.user_id
                JOIN classes c ON s.class_id = c.id
                JOIN timetables t ON c.id = t.class_id
                JOIN courses co ON t.course_id = co.id
                LEFT JOIN attendances a ON a.student_id = u.id AND a.timetable_id = t.id
                WHERE u.role = 'students'
                ${courseId ? ' AND t.course_id = ?' : ''}
                ${classId ? ' AND c.id = ?' : ''}
                ${period ? getPeriodCondition(period) : ''}
                GROUP BY u.id, u.name, c.id, c.name, co.name
            )
            SELECT 
                *,
                ROUND(CAST(attended_sessions + late_sessions AS FLOAT) / 
                    CASE WHEN total_sessions = 0 THEN 1 ELSE total_sessions END * 100, 2) as attendance_rate
            FROM StudentStats
            ORDER BY attendance_rate DESC
        `;

        // Requête pour les statistiques par classe
        let classStatsQuery = `
            WITH ClassStats AS (
                SELECT 
                    c.id,
                    c.name as class_name,
                    COUNT(DISTINCT t.id) as total_sessions,
                    SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as attended_sessions
                FROM classes c
                JOIN timetables t ON c.id = t.class_id
                LEFT JOIN attendances a ON a.timetable_id = t.id
                ${courseId || classId ? 'WHERE' : ''}
                ${courseId ? 't.course_id = ?' : ''}
                ${courseId && classId ? ' AND ' : ''}
                ${classId ? 'c.id = ?' : ''}
                GROUP BY c.id, c.name
            )
            SELECT 
                class_name,
                total_sessions,
                attended_sessions,
                ROUND(CAST(attended_sessions AS FLOAT) / 
                    CASE WHEN total_sessions = 0 THEN 1 ELSE total_sessions END * 100, 2) as attendance_rate
            FROM ClassStats
            ORDER BY attendance_rate DESC
        `;

        // les paramètres pour les requêtes
        const summaryParams = classId ? [classId] : [];
        const detailedParams = [];
        if (courseId) detailedParams.push(courseId);
        if (classId) detailedParams.push(classId);
        const classStatsParams = [];
        if (courseId) classStatsParams.push(courseId);
        if (classId) classStatsParams.push(classId);

        console.log('Executing queries with params:', {
            summaryParams,
            detailedParams,
            classStatsParams
        });

        db.serialize(() => {
            db.get(summaryQuery, summaryParams, (err, summary) => {
                if (err) {
                    console.error('Error in summary query:', err);
                    reject(err);
                    return;
                }

                db.all(detailedQuery, detailedParams, (err, detailed) => {
                    if (err) {
                        console.error('Error in detailed query:', err);
                        reject(err);
                        return;
                    }

                    db.all(classStatsQuery, classStatsParams, (err, classStats) => {
                        if (err) {
                            console.error('Error in class stats query:', err);
                            reject(err);
                            return;
                        }

                        // Calculer les alertes pour les étudiants avec un faible taux de présence
                        const alerts = detailed
                            .filter(student => student.attendance_rate < 30)
                            .map(student => ({
                                student_name: student.student_name,
                                class_name: student.class_name,
                                course_name: student.course_name,
                                attendance_rate: student.attendance_rate
                            }));

                        resolve({
                            summary,
                            detailed,
                            classStats,
                            alerts
                        });
                    });
                });
            });
        });
    });
}



// Fonction utilitaire pour obtenir la condition de période
function getPeriodCondition(period) {
    switch(period) {
        case 'week':
            return " AND date(a.marked_at) >= date('now', '-7 days')";
        case 'month':
            return " AND date(a.marked_at) >= date('now', '-1 month')";
        case 'trimester1':
            return " AND strftime('%m', a.marked_at) BETWEEN '01' AND '06'";
        case 'trimester2':
            return " AND strftime('%m', a.marked_at) BETWEEN '07' AND '12'";
        case 'year':
            return " AND strftime('%Y', a.marked_at) = strftime('%Y', 'now')";
        default:
            return '';
    }
}



// Fonction pour récupérer les classes e-learning et workshop
async function getElearningWorkshopClasses() {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT DISTINCT 
                t.id as timetable_id,
                t.class_id,
                c.name as class_name,
                co.name as course_name,
                d.name as day_name,
                ts.start_time,
                ts.end_time
            FROM timetables t
            JOIN classes c ON t.class_id = c.id
            JOIN courses co ON t.course_id = co.id
            JOIN days d ON t.day_id = d.id
            JOIN time_slots ts ON t.time_slot_id = ts.id
            WHERE LOWER(co.name) LIKE '%e-learning%'
            OR LOWER(co.name) LIKE '%workshop%'
            ORDER BY c.name, ts.start_time
        `;
        
        db.all(query, [], (err, rows) => {
            if (err) {
                console.error('Database error:', err);
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}



// Fonction pour récupérer les étudiants des classes e-learning et workshop
async function getElearningWorkshopStudents(timetableId) {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT 
                u.id as student_id,
                u.name as student_name,
                c.name as class_name,
                COALESCE(a.status, 'not_marked') as status,
                a.marked_at
            FROM users u
            JOIN students s ON u.id = s.user_id
            JOIN classes c ON s.class_id = c.id
            JOIN timetables t ON c.id = t.class_id
            LEFT JOIN attendances a ON a.student_id = u.id AND a.timetable_id = t.id
            WHERE t.id = ?
            ORDER BY u.name
        `;
        
        db.all(query, [timetableId], (err, rows) => {
            if (err) {
                console.error('Database error:', err);
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}



// Fonction pour récupérer les volumes de cours par type
async function getCourseVolumes(period) {
    return new Promise((resolve, reject) => {
        let query = `
            SELECT 
                CASE 
                    WHEN LOWER(c.name) LIKE '%presentiel%' THEN 'presentiel'
                    WHEN LOWER(c.name) LIKE '%e-learning%' THEN 'elearning'
                    WHEN LOWER(c.name) LIKE '%workshop%' THEN 'workshop'
                    ELSE 'presentiel'
                END as type,
                COUNT(*) as sessions,
                SUM(CASE 
                    WHEN LOWER(c.name) LIKE '%presentiel%' THEN 2
                    WHEN LOWER(c.name) LIKE '%e-learning%' THEN 1.5
                    WHEN LOWER(c.name) LIKE '%workshop%' THEN 3
                    ELSE 2
                END) as hours
            FROM timetables t
            JOIN courses c ON t.course_id = c.id
        `;

        const params = [];

        if (period) {
            if (period === 'trimester1') {
                query += ` WHERE strftime('%m', t.created_at) BETWEEN '09' AND '12'`;
            } else if (period === 'trimester2') {
                query += ` WHERE strftime('%m', t.created_at) BETWEEN '01' AND '06'`;
            }
        }

        query += ` GROUP BY 
            CASE 
                WHEN LOWER(c.name) LIKE '%presentiel%' THEN 'presentiel'
                WHEN LOWER(c.name) LIKE '%e-learning%' THEN 'elearning'
                WHEN LOWER(c.name) LIKE '%workshop%' THEN 'workshop'
                ELSE 'presentiel'
            END`;

        db.all(query, params, (err, rows) => {
            if (err) {
                console.error('Erreur lors de la récupération des volumes de cours:', err);
                reject(err);
            } else {
                
                const defaultTypes = ['presentiel', 'elearning', 'workshop'];
                const result = defaultTypes.map(type => {
                    const found = rows.find(r => r.type === type);
                    return found || {
                        type: type,
                        sessions: 0,
                        hours: 0
                    };
                });
                resolve(result);
            }
        });
    });
}



// Fonction pour récupérer les volumes par trimestre
async function getTrimesterVolumes() {
    return new Promise((resolve, reject) => {
        const query = `
            WITH CourseHours AS (
                SELECT 
                    CASE 
                        WHEN LOWER(c.name) LIKE '%presentiel%' THEN 'presentiel'
                        WHEN LOWER(c.name) LIKE '%e-learning%' THEN 'elearning'
                        WHEN LOWER(c.name) LIKE '%workshop%' THEN 'workshop'
                        ELSE 'presentiel'
                    END as type,
                    CASE 
                        WHEN strftime('%m', t.created_at) BETWEEN '09' AND '12' THEN 'trimester1'
                        WHEN strftime('%m', t.created_at) BETWEEN '01' AND '06' THEN 'trimester2'
                    END as trimester,
                    COUNT(*) as sessions,
                    COUNT(*) * CASE 
                        WHEN LOWER(c.name) LIKE '%presentiel%' THEN 2
                        WHEN LOWER(c.name) LIKE '%e-learning%' THEN 1.5
                        WHEN LOWER(c.name) LIKE '%workshop%' THEN 3
                        ELSE 2
                    END as hours
                FROM timetables t
                JOIN courses c ON t.course_id = c.id
                GROUP BY 
                    CASE 
                        WHEN LOWER(c.name) LIKE '%presentiel%' THEN 'presentiel'
                        WHEN LOWER(c.name) LIKE '%e-learning%' THEN 'elearning'
                        WHEN LOWER(c.name) LIKE '%workshop%' THEN 'workshop'
                        ELSE 'presentiel'
                    END,
                    CASE 
                        WHEN strftime('%m', t.created_at) BETWEEN '09' AND '12' THEN 'trimester1'
                        WHEN strftime('%m', t.created_at) BETWEEN '01' AND '06' THEN 'trimester2'
                    END
            )
            SELECT 
                trimester,
                type,
                sessions,
                hours
            FROM CourseHours
            WHERE trimester IS NOT NULL
            ORDER BY trimester, type
        `;

        db.all(query, [], (err, rows) => {
            if (err) {
                console.error('Erreur lors de la récupération des volumes par trimestre:', err);
                reject(err);
            } else {
                try {
                    
                    const result = {
                        trimester1: {
                            presentiel: 0,
                            elearning: 0,
                            workshop: 0
                        },
                        trimester2: {
                            presentiel: 0,
                            elearning: 0,
                            workshop: 0
                        }
                    };

                   
                    rows.forEach(row => {
                        if (row.trimester && row.type) {
                            result[row.trimester][row.type] = row.hours;
                        }
                    });

                    resolve(result);
                } catch (parseError) {
                    console.error('Erreur lors du traitement des données:', parseError);
                    reject(parseError);
                }
            }
        });
    });
}



// Fonction pour justifier une absence
async function justifyAbsence(student_presence_id, reason, date) {
    return new Promise((resolve, reject) => {
        console.log('Début de la justification avec les données:', {
            student_presence_id,
            reason,
            date
        });

        // Vérifie si l'absence existe
        db.get('SELECT id FROM attendances WHERE id = ?', [student_presence_id], (err, attendance) => {
            if (err) {
                console.error('Erreur lors de la vérification de l\'absence:', err);
                reject(err);
                return;
            }

            if (!attendance) {
                console.error('Absence non trouvée:', student_presence_id);
                reject(new Error('Absence non trouvée'));
                return;
            }

            // Vérifie si une justification existe déjà
            db.get('SELECT id FROM justifications WHERE student_presence_id = ?', [student_presence_id], (err, existing) => {
                if (err) {
                    console.error('Erreur lors de la vérification de justification existante:', err);
                    reject(err);
                    return;
                }

                if (existing) {
                    console.error('Une justification existe déjà pour cette absence');
                    reject(new Error('Une justification existe déjà pour cette absence'));
                    return;
                }

                // Insére la nouvelle justification
                const query = `
                    INSERT INTO justifications (
                        student_presence_id, 
                        reason, 
                        date
                    ) VALUES (?, ?, ?)
                `;

                db.run(query, [student_presence_id, reason, date], function(err) {
                    if (err) {
                        console.error('Erreur lors de l\'insertion de la justification:', err);
                        reject(err);
                    } else {
                        console.log('Justification insérée avec succès, ID:', this.lastID);
                        resolve(this.lastID);
                    }
                });
            });
        });
    });
}



// Fonction pour obtenir les absences d'un étudiant
async function getStudentAbsences(studentId) {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT 
                a.id as attendance_id,
                a.status,
                a.marked_at,
                t.id as timetable_id,
                c.name as course_name,
                d.name as day_name,
                ts.start_time,
                ts.end_time,
                j.id as justification_id,
                j.reason,
                j.date,
                j.created_at as justification_created_at
            FROM attendances a
            JOIN timetables t ON a.timetable_id = t.id
            JOIN courses c ON t.course_id = c.id
            JOIN days d ON t.day_id = d.id
            JOIN time_slots ts ON t.time_slot_id = ts.id
            LEFT JOIN justifications j ON a.id = j.student_presence_id
            WHERE a.student_id = ? AND a.status = 'absent'
            ORDER BY a.marked_at DESC
        `;
        
        db.all(query, [studentId], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}



// Fonction pour obtenir les détails d'une absence spécifique
async function getAbsenceDetails(absenceId) {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT 
                a.id as attendance_id,
                a.status,
                a.marked_at,
                u.name as student_name,
                cl.name as class_name,
                c.name as course_name,
                d.name as day_name,
                ts.start_time,
                ts.end_time,
                j.id as justification_id,
                j.reason,
                j.date
            FROM attendances a
            JOIN users u ON a.student_id = u.id
            JOIN timetables t ON a.timetable_id = t.id
            JOIN classes cl ON t.class_id = cl.id
            JOIN courses c ON t.course_id = c.id
            JOIN days d ON t.day_id = d.id
            JOIN time_slots ts ON t.time_slot_id = ts.id
            LEFT JOIN justifications j ON a.id = j.student_presence_id
            WHERE a.id = ?
        `;
        
        db.get(query, [absenceId], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}



// Fonction pour récupérer tous les étudiants absents
async function getAllAbsentStudents() {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT DISTINCT
                a.id as attendance_id,
                a.student_id,
                a.status,
                a.marked_at,
                u.name as student_name,
                c.name as course_name,
                cl.name as class_name,
                d.name as day_name,
                ts.start_time,
                ts.end_time,
                j.id as justification_id,
                j.reason,
                j.date,
                j.created_at as justification_created_at,
                CASE 
                    WHEN j.id IS NOT NULL THEN 'justified'
                    ELSE 'pending'
                END as justification_status
            FROM attendances a
            JOIN users u ON a.student_id = u.id
            JOIN timetables t ON a.timetable_id = t.id
            JOIN courses c ON t.course_id = c.id
            JOIN classes cl ON t.class_id = cl.id
            JOIN days d ON t.day_id = d.id
            JOIN time_slots ts ON t.time_slot_id = ts.id
            LEFT JOIN justifications j ON a.id = j.student_presence_id
            WHERE a.status = 'absent'
            ORDER BY a.marked_at DESC
        `;
        
        db.all(query, [], (err, rows) => {
            if (err) {
                console.error('Erreur lors de la récupération des absences:', err);
                reject(err);
            } else {
                
                console.log('Nombre total d\'absences trouvées:', rows.length);
                console.log('Nombre d\'absences justifiées:', rows.filter(r => r.justification_id).length);
                console.log('Nombre d\'absences en attente:', rows.filter(r => !r.justification_id).length);
                
                resolve(rows);
            }
        });
    });
}



// Fonction pour obtenir les statistiques de présence des étudiants
async function getStudentAttendanceStats(period, classId) {
    return new Promise((resolve, reject) => {
        let query = `
            SELECT 
                u.id as student_id,
                u.name as student_name,
                c.name as class_name,
                COUNT(DISTINCT t.id) as total_sessions,
                SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_count,
                SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_count,
                SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late_count
            FROM users u
            JOIN students s ON u.id = s.user_id
            JOIN classes c ON s.class_id = c.id
            JOIN timetables t ON c.id = t.class_id
            LEFT JOIN attendances a ON a.student_id = u.id AND a.timetable_id = t.id
            WHERE u.role = 'students'
            ${classId ? 'AND c.id = ?' : ''}
            ${period ? getPeriodCondition(period) : ''}
            GROUP BY u.id, u.name, c.name
        `;

        const params = classId ? [classId] : [];
        
        db.all(query, params, (err, rows) => {
            if (err) {
                console.error('Erreur lors de la récupération des statistiques étudiants:', err);
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}



// Fonction pour obtenir les statistiques de présence par classe
async function getClassAttendanceStats(period) {
    return new Promise((resolve, reject) => {
        let query = `
            SELECT 
                c.id as class_id,
                c.name as class_name,
                COUNT(DISTINCT t.id) as total_sessions,
                COUNT(DISTINCT a.student_id) as total_students,
                SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_count,
                SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_count,
                SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late_count
            FROM classes c
            JOIN timetables t ON c.id = t.class_id
            LEFT JOIN attendances a ON a.timetable_id = t.id
            ${period ? 'WHERE ' + getPeriodCondition(period).substring(5) : ''}
            GROUP BY c.id, c.name
        `;
        
        db.all(query, [], (err, rows) => {
            if (err) {
                console.error('Erreur lors de la récupération des statistiques par classe:', err);
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}



// Fonction pour obtenir les statistiques de volume de cours
async function getCourseVolumeStats(period, classId) {
    return new Promise((resolve, reject) => {
        let query = `
            SELECT 
                c.name as course_name,
                COUNT(DISTINCT t.id) as total_sessions,
                SUM(CASE 
                    WHEN LOWER(c.name) LIKE '%presentiel%' THEN 2
                    WHEN LOWER(c.name) LIKE '%e-learning%' THEN 1.5
                    WHEN LOWER(c.name) LIKE '%workshop%' THEN 3
                    ELSE 2
                END) as total_hours
            FROM courses c
            JOIN timetables t ON c.id = t.course_id
            WHERE 1=1
            ${classId ? 'AND t.class_id = ?' : ''}
            ${period ? 'AND ' + getPeriodCondition(period).substring(5) : ''}
            GROUP BY c.name
        `;

        const params = classId ? [classId] : [];
        
        db.all(query, params, (err, rows) => {
            if (err) {
                console.error('Erreur lors de la récupération des volumes de cours:', err);
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}



// Fonction pour obtenir les statistiques par trimestre
async function getTrimesterVolumeStats(classId) {
    return new Promise((resolve, reject) => {
        let query = `
            SELECT 
                CASE 
                    WHEN strftime('%m', t.created_at) BETWEEN '09' AND '12' THEN 'Trimestre 1'
                    WHEN strftime('%m', t.created_at) BETWEEN '01' AND '06' THEN 'Trimestre 2'
                END as trimester,
                COUNT(DISTINCT t.id) as total_sessions,
                SUM(CASE 
                    WHEN LOWER(c.name) LIKE '%presentiel%' THEN 2
                    WHEN LOWER(c.name) LIKE '%e-learning%' THEN 1.5
                    WHEN LOWER(c.name) LIKE '%workshop%' THEN 3
                    ELSE 2
                END) as total_hours
            FROM timetables t
            JOIN courses c ON t.course_id = c.id
            WHERE strftime('%m', t.created_at) BETWEEN '09' AND '06'
            ${classId ? 'AND t.class_id = ?' : ''}
            GROUP BY 
                CASE 
                    WHEN strftime('%m', t.created_at) BETWEEN '09' AND '12' THEN 'Trimestre 1'
                    WHEN strftime('%m', t.created_at) BETWEEN '01' AND '06' THEN 'Trimestre 2'
                END
        `;

        const params = classId ? [classId] : [];
        
        db.all(query, params, (err, rows) => {
            if (err) {
                console.error('Erreur lors de la récupération des volumes par trimestre:', err);
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}



// Fonction pour récupérer les notes d'assiduité d'un étudiant
async function getStudentGrades(identifier) {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT 
                t.course_id,
                c.name as course_name,
                COUNT(DISTINCT t.id) as total_sessions,
                COUNT(CASE WHEN a.status = 'present' OR a.status = 'late' THEN 1 END) as attended_sessions,
                ROUND(CAST(COUNT(CASE WHEN a.status = 'present' OR a.status = 'late' THEN 1 END) AS FLOAT) / 
                    NULLIF(COUNT(DISTINCT t.id), 0) * 100, 2) as attendance_rate,
                CASE 
                    WHEN ROUND(CAST(COUNT(CASE WHEN a.status = 'present' OR a.status = 'late' THEN 1 END) AS FLOAT) / 
                        NULLIF(COUNT(DISTINCT t.id), 0) * 100, 2) >= 90 THEN 20
                    WHEN ROUND(CAST(COUNT(CASE WHEN a.status = 'present' OR a.status = 'late' THEN 1 END) AS FLOAT) / 
                        NULLIF(COUNT(DISTINCT t.id), 0) * 100, 2) >= 80 THEN 16
                    WHEN ROUND(CAST(COUNT(CASE WHEN a.status = 'present' OR a.status = 'late' THEN 1 END) AS FLOAT) / 
                        NULLIF(COUNT(DISTINCT t.id), 0) * 100, 2) >= 70 THEN 14
                    WHEN ROUND(CAST(COUNT(CASE WHEN a.status = 'present' OR a.status = 'late' THEN 1 END) AS FLOAT) / 
                        NULLIF(COUNT(DISTINCT t.id), 0) * 100, 2) >= 60 THEN 12
                    ELSE 8
                END as grade,
                CASE 
                    WHEN strftime('%m', t.created_at) BETWEEN '09' AND '12' THEN 1
                    WHEN strftime('%m', t.created_at) BETWEEN '01' AND '06' THEN 2
                END as semester,
                strftime('%Y', t.created_at) as academic_year
            FROM timetables t
            JOIN courses c ON t.course_id = c.id
            JOIN students s ON t.class_id = s.class_id
            JOIN users u ON s.user_id = u.id
            LEFT JOIN attendances a ON t.id = a.timetable_id AND a.student_id = u.id
            WHERE ${isNaN(identifier) ? 'u.email = ?' : 'u.id = ?'}
            GROUP BY t.course_id, c.name, semester, academic_year
            ORDER BY academic_year DESC, semester DESC, c.name
        `;
        
        db.all(query, [identifier], (err, rows) => {
            if (err) {
                console.error('Error fetching student grades:', err);
                reject(err);
            } else {
                console.log('Found grades:', rows);
                resolve(rows || []);
            }
        });
    });
}



//exporte les fonctions
module.exports = {
    checkUserCredentials,
    createUser,
    getAllUsers,
    updateUser,
    deleteUser,
    getUserRole,
    getUserName,
    getParentName,
    getStudentName,
    getTeacherName,
    getAllTeachers,
    getAllRoles,
    getAllClasses,
    getAllDays,
    getAllCourses,
    getTeachers,
    getClasses,
    getTimeSlots,
    getDistinctRoles,
    createTimetable,
    updateTimetable,
    deleteTimetable,
    getTimetable,
    getStudentClass,
    getTeacherTimetable,
    getAllStudents,
    assignStudentsToParent,
    getParentStudents,
    getStudentTimetable,
    getParentStudentsWithTimetable,
    getUserId,
    getClassStudents,
    markAttendance,
    getSessionAttendance,
    getCourseStudents,
    getAttendanceStatistics,
    getStudentAttendanceStats,
    getClassAttendanceStats,
    getCourseVolumeStats,
    getTrimesterVolumeStats,
    getPeriodCondition,
    getElearningWorkshopClasses,
    getElearningWorkshopStudents,
    getCourseVolumes,
    getTrimesterVolumes,
    justifyAbsence,
    getStudentAbsences,
    getAbsenceDetails,
    getAllAbsentStudents,
    getStudentGrades,
};
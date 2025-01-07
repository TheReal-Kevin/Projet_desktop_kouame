const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

const {
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
    getAllRoles,
    getElearningWorkshopClasses,
    getElearningWorkshopStudents,
    getCourseVolumes,
    getTrimesterVolumes,
    justifyAbsence,
    getStudentAbsences,
    getAbsenceDetails,
    getAllAbsentStudents,
    getStudentGrades
} = require('./js/database'); // import des fonctions de la base de données

function registerHandlers() {
    ipcMain.handle('getStudentGrades', async (_event, email) => {
        try {
            console.log('Getting grades for student:', email);
            const grades = await getStudentGrades(email);
            console.log('Grades retrieved:', grades);
            return grades;
        } catch (error) {
            console.error('Error in getStudentGrades handler:', error);
            throw error;
        }
    });
}

// fonction pour créer la fenêtre principale
function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            enableRemoteModule: false,
            nodeIntegration: false 
        }
    });
    win.loadFile('index.html');
}
// gestion du cycle de vie de l'application
app.whenReady().then(() => {
    registerHandlers();
    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// écoute l'événement 'navigateTo' depuis le frontend
ipcMain.on('navigateTo', (_event, page) => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) {
        win.loadFile(`${page}.html`);
    }   
});

// gestionnaire IPC pour la connexion
ipcMain.handle('login', async (_event, email, password) => {
    try {
        const isValid = await checkUserCredentials(email, password);
        if (!isValid) {
            return { success: false, message: 'Invalid credentials' };
        }

        const role = await getUserRole(email, password);
        const userName = await getUserName(email);
        const userId = await getUserId(email);

        if (!role) {
            return { success: false, message: 'Role not found' };
        }

        return { 
            success: true, 
            role,
            userId,
            name: userName
        };
    } catch (error) {
        console.error('Error during login:', error);
        return { success: false, message: 'An error occurred during login' };
    }
});

// gestionnaire pour getAllStudents
ipcMain.handle('getAllStudents', async () => {
    try {
        return await getAllStudents();
    } catch (error) {
        console.error('Error fetching students:', error);
        throw error;
    }
});

// gestionnaire pour getAllUsers
ipcMain.handle('getAllUsers', async () => {
    try {
        return await getAllUsers();
    } catch (error) {
        console.error('Error fetching users:', error);
        throw error;
    }
});

// gestionnaire pour createUser
ipcMain.handle('createUser', async (_event, name, email, password, role) => {
    try {
        return await createUser(name, email, password, role);
    } catch (error) {
        console.error('Error creating user:', error);
        throw error;
    }
});

// gestionnaire pour updateUser
ipcMain.handle('updateUser', async (_event, userId, name, email, password, role) => {
    try {
        return await updateUser(userId, name, email, password, role);
    } catch (error) {
        console.error('Error updating user:', error);
        throw error;
    }
});

// gestionnaire pour deleteUser
ipcMain.handle('deleteUser', async (_event, id) => {
    try {
        return await deleteUser(id);
    } catch (error) {
        console.error('Error deleting user:', error);
        throw error;
    }
});

// Gestionnaires pour l'emploi du temps
ipcMain.handle('getDays', async () => {
    try {
        return await getAllDays();
    } catch (error) {
        console.error('Error fetching days:', error);
        throw error;
    }
});

// gestionnaire pour getTeacherTimetable
ipcMain.handle('getTeacherTimetable', async (_event, email) => {
    try {
        const timetable = await getTeacherTimetable(email);
        return timetable;
    } catch (error) {
        console.error('Error fetching teacher timetable:', error);
        throw error;
    }
});

// gestionnaire pour getCourses
ipcMain.handle('getCourses', async () => {
    try {
        return await getAllCourses();
    } catch (error) {
        console.error('Error fetching courses:', error);
        throw error;
    }
});

// gestionnaire pour getTeachers
ipcMain.handle('getTeachers', async () => {
    try {
        return await getTeachers();
    } catch (error) {
        console.error('Error fetching teachers:', error);
        throw error;
    }
});

// gestionnaire pour getClasses
ipcMain.handle('getClasses', async () => {
    try {
        return await getClasses();
    } catch (error) {
        console.error('Error fetching classes:', error);
        throw error;
    }
});

// gestionnaire pour getTimeSlots
ipcMain.handle('getTimeSlots', async () => {
    try {
        return await getTimeSlots();
    } catch (error) {
        console.error('Error fetching time slots:', error);
        throw error;H
    }
});

// gestionnaire pour markAttendance
ipcMain.handle('markAttendance', async (_event, attendanceData) => {
    try {
        console.log('Données reçues dans main:', attendanceData);
        if (!attendanceData.marked_by || typeof attendanceData.marked_by !== 'number') {
            console.error('ID de l\'utilisateur invalide:', attendanceData.marked_by);
            throw new Error('ID de l\'utilisateur manquant ou invalide');
        }
        return await markAttendance(attendanceData);
    } catch (error) {
        console.error('Erreur lors du marquage de la présence:', error);
        throw error;
    }
});

// Gestionnaire pour getSessionAttendance
ipcMain.handle('getSessionAttendance', async (_event, sessionId) => {
    try {
        return await getSessionAttendance(sessionId);
    } catch (error) {
        console.error('Error getting session attendance:', error);
        throw error;
    }
});

// Gestionnaire pour getCourseStudents
ipcMain.handle('getCourseStudents', async (_event, timetableId) => {
    try {
        return await getCourseStudents(timetableId);
    } catch (error) {
        console.error('Error getting course students:', error);
        throw error;
    }
});

// Gestionnaire pour getAttendanceStatistics
ipcMain.handle('getAttendanceStatistics', async (_event, courseId, period, classId) => {
    try {
        return await getAttendanceStatistics(courseId, period, classId);
    } catch (error) {
        console.error('Error getting attendance statistics:', error);
        throw error;
    }
});

// Gestionnaires pour les statistiques d'assiduité
ipcMain.handle('getStudentAttendanceStats', async (_event, period, classId) => {
    try {
        console.log('Calling getStudentAttendanceStats with:', period, classId);
        const stats = await getStudentAttendanceStats(period, classId);
        console.log('Stats received:', stats);
        return stats;
    } catch (error) {
        console.error('Error getting student attendance stats:', error);
        throw error;
    }
});

// Gestionnaire pour getClassAttendanceStats
ipcMain.handle('getClassAttendanceStats', async (_event, period) => {
    try {
        console.log('Calling getClassAttendanceStats with:', period);
        const stats = await getClassAttendanceStats(period);
        console.log('Stats received:', stats);
        return stats;
    } catch (error) {
        console.error('Error getting class attendance stats:', error);
        throw error;
    }
});

// Gestionnaire pour getCourseVolumeStats
ipcMain.handle('getCourseVolumeStats', async (_event, period, classId) => {
    try {
        console.log('Calling getCourseVolumeStats with:', period, classId);
        const stats = await getCourseVolumeStats(period, classId);
        console.log('Stats received:', stats);
        return stats;
    } catch (error) {
        console.error('Error getting course volume stats:', error);
        throw error;
    }
});

// Gestionnaire pour getTrimesterVolumeStats
ipcMain.handle('getTrimesterVolumeStats', async (_event, classId) => {
    try {
        console.log('Calling getTrimesterVolumeStats with:', classId);
        const stats = await getTrimesterVolumeStats(classId);
        console.log('Stats received:', stats);
        return stats;
    } catch (error) {
        console.error('Error getting trimester volume stats:', error);
        throw error;
    }
});

// Gestionnaire pour getParentName
ipcMain.handle('getParentName', async (_event, email) => {
    try {
        return await getParentName(email);
    } catch (error) {
        console.error('Error getting parent name:', error);
        throw error;
    }
});

// Gestionnaire pour getStudentName
ipcMain.handle('getStudentName', async (_event, email) => {
    try {
        return await getStudentName(email);
    } catch (error) {
        console.error('Error getting student name:', error);
        throw error;
    }
});

// Gestionnaire pour getTeacherName
ipcMain.handle('getTeacherName', async (_event, email) => {
    try {
        return await getTeacherName(email);
    } catch (error) {
        console.error('Error getting teacher name:', error);
        throw error;
    }
});

// Gestionnaire pour getAllTeachers
ipcMain.handle('getAllTeachers', async () => {
    try {
        return await getAllTeachers();
    } catch (error) {
        console.error('Error getting all teachers:', error);
        throw error;
    }
});

// Gestionnaire pour assignStudentsToParent
ipcMain.handle('assignStudentsToParent', async (_event, parentId, studentIds) => {
    try {
        return await assignStudentsToParent(parentId, studentIds);
    } catch (error) {
        console.error('Error assigning students to parent:', error);
        throw error;
    }
});

// Gestionnaire pour getParentStudents
ipcMain.handle('getParentStudents', async (_event, parentId) => {
    try {
        return await getParentStudents(parentId);
    } catch (error) {
        console.error('Error getting parent students:', error);
        throw error;
    }
});

// Gestionnaire pour getStudentTimetable
ipcMain.handle('getStudentTimetable', async (_event, studentId) => {
    try {
        return await getStudentTimetable(studentId);
    } catch (error) {
        console.error('Error getting student timetable:', error);
        throw error;
    }
});

// Gestionnaire pour getParentStudentsWithTimetable
ipcMain.handle('getParentStudentsWithTimetable', async (_event, parentId) => {
    try {
        return await getParentStudentsWithTimetable(parentId);
    } catch (error) {
        console.error('Error getting parent students with timetable:', error);
        throw error;
    }
});

// Gestionnaire pour getClassStudents
ipcMain.handle('getClassStudents', async (_event, classId) => {
    try {
        return await getClassStudents(classId);
    } catch (error) {
        console.error('Error getting class students:', error);
        throw error;
    }
});

// Gestionnaire pour getAllClasses
ipcMain.handle('getAllClasses', async () => {
    try {
        return await getAllClasses();
    } catch (error) {
        console.error('Error getting all classes:', error);
        throw error;
    }
});

// Gestionnaire pour getAllRoles
ipcMain.handle('getAllRoles', async () => {
    try {
        return await getAllRoles();
    } catch (error) {
        console.error('Error getting all roles:', error);
        throw error;
    }
});

// Gestionnaire pour getDistinctRoles
ipcMain.handle('getDistinctRoles', async () => {
    try {
        return await getDistinctRoles();
    } catch (error) {
        console.error('Error getting distinct roles:', error);
        throw error;
    }
});

// Gestionnaire pour createTimetable
ipcMain.handle('createTimetable', async (_event, classId, courseId, dayId, timeSlotId, teacherId, color) => {
    try {
        return await createTimetable(classId, courseId, dayId, timeSlotId, teacherId, color);
    } catch (error) {
        console.error('Error creating timetable:', error);
        throw error;
    }
});

// Gestionnaire pour updateTimetable
ipcMain.handle('updateTimetable', async (_event, timetableId, classId, courseId, dayId, timeSlotId, teacherId, color) => {
    try {
        return await updateTimetable(timetableId, classId, courseId, dayId, timeSlotId, teacherId, color);
    } catch (error) {
        console.error('Error updating timetable:', error);
        throw error;
    }
});

// Gestionnaire pour deleteTimetable
ipcMain.handle('deleteTimetable', async (_event, timetableId) => {
    try {
        return await deleteTimetable(timetableId);
    } catch (error) {
        console.error('Error deleting timetable:', error);
        throw error;
    }
});

// Gestionnaire pour getTimetable
ipcMain.handle('getTimetable', async () => {
    try {
        return await getTimetable();
    } catch (error) {
        console.error('Error getting timetable:', error);
        throw error;
    }
});

// Gestionnaire pour getStudentClass
ipcMain.handle('getStudentClass', async (_event, email) => {
    try {
        return await getStudentClass(email);
    } catch (error) {
        console.error('Error getting student class:', error);
        throw error;
    }
});

// Gestionnaire pour getElearningWorkshopClasses
ipcMain.handle('getElearningWorkshopClasses', async () => {
    try {
        return await getElearningWorkshopClasses();
    } catch (error) {
        console.error('Error getting e-learning and workshop classes:', error);
        throw error;
    }
});

// Gestionnaire pour getElearningWorkshopStudents
ipcMain.handle('getElearningWorkshopStudents', async (_event, timetableId) => {
    try {
        return await getElearningWorkshopStudents(timetableId);
    } catch (error) {
        console.error('Error getting students for e-learning/workshop:', error);
        throw error;
    }
});

// Gestionnaires pour les statistiques de volume
ipcMain.handle('getCourseVolumes', async (_event, period) => {
    try {
        console.log('Getting course volumes for period:', period);
        const volumes = await getCourseVolumes(period);
        console.log('Course volumes:', volumes);
        return volumes;
    } catch (error) {
        console.error('Error getting course volumes:', error);
        throw error;
    }
});

// Gestionnaire pour getTrimesterVolumes
ipcMain.handle('getTrimesterVolumes', async () => {
    try {
        console.log('Getting trimester volumes');
        const volumes = await getTrimesterVolumes();
        console.log('Trimester volumes:', volumes);
        return volumes;
    } catch (error) {
        console.error('Error getting trimester volumes:', error);
        throw error;
    }
});

// Gestionnaire pour les justifications
ipcMain.handle('justifyAbsence', async (_event, student_presence_id, reason, date) => {
    try {
        console.log('Données reçues pour justification:', { student_presence_id, reason, date });
        return await justifyAbsence(student_presence_id, reason, date);
    } catch (error) {
        console.error('Erreur lors de la justification:', error);
        throw error;
    }
});

// Gestionnaire pour getStudentAbsences
ipcMain.handle('getStudentAbsences', async (_event, studentId) => {
    try {
        return await getStudentAbsences(studentId);
    } catch (error) {
        console.error('Error getting student absences:', error);
        throw error;
    }
});

// Gestionnaire pour getAbsenceDetails
ipcMain.handle('getAbsenceDetails', async (_event, absenceId) => {
    try {
        return await getAbsenceDetails(absenceId);
    } catch (error) {
        console.error('Error getting absence details:', error);
        throw error;
    }
});

// Gestionnaire pour getAllAbsentStudents
ipcMain.handle('getAllAbsentStudents', async () => {
    try {
        console.log('Récupération de tous les étudiants absents...');
        const absences = await getAllAbsentStudents();
        console.log(`${absences.length} absences trouvées`);
        return absences;
    } catch (error) {
        console.error('Erreur lors de la récupération des absences:', error);
        throw error;
    }
});

// Gestionnaire pour getUserId
ipcMain.handle('getUserId', async (_event, email) => {
    try {
        console.log('Getting user ID for email:', email);
        const userId = await getUserId(email);
        console.log('User ID found:', userId);
        return userId;
    } catch (error) {
        console.error('Error getting user ID:', error);
        throw error;
    }
});

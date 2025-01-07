const { contextBridge, ipcRenderer } = require('electron');

// Expose des méthodes sécurisées à la fenêtre principale
contextBridge.exposeInMainWorld('connect', {
    // Méthodes pour la gestion des événements
    on: (channel, func) => {
        const validChannels = ['someOtherChannel'];
        if (validChannels.includes(channel)) {
            ipcRenderer.on(channel, (_event, ...args) => func(...args));
        }
    },

    // Méthodes pour la gestion des événements 
    send: (channel, data) => {
        const validChannels = ['navigateTo', 'someOtherSendChannel']; 
        if (validChannels.includes(channel)) {
            ipcRenderer.send(channel, data);
        }
    },
    
    // Méthodes pour la gestion des utilisateurs
    login: (email, password) => ipcRenderer.invoke('login', email, password),
    createUser: (name, email, password, role) => ipcRenderer.invoke('createUser', name, email, password, role),
    getAllUsers: () => ipcRenderer.invoke('getAllUsers'),
    updateUser: (id, name, email, password, role, classId) => 
        ipcRenderer.invoke('updateUser', id, name, email, password, role, classId),
    deleteUser: (id) => ipcRenderer.invoke('deleteUser', id),
    getAllClasses: () => ipcRenderer.invoke('getAllClasses'),
    navigateTo: (page) => ipcRenderer.send('navigateTo', page),
    getAllTeachers: () => ipcRenderer.invoke('getAllTeachers'),
    getAllRoles: () => ipcRenderer.invoke('getAllRoles'),
    getDistinctRoles: () => ipcRenderer.invoke('getDistinctRoles'),
    getStudentClass: (userId) => ipcRenderer.invoke('getStudentClass', userId),
    getTeacherTimetable: (email) => ipcRenderer.invoke('getTeacherTimetable', email),
    getAllStudents: () => ipcRenderer.invoke('getAllStudents'),
    getElearningWorkshopClasses: () => ipcRenderer.invoke('getElearningWorkshopClasses'),
    getElearningWorkshopStudents: (timetableId) => ipcRenderer.invoke('getElearningWorkshopStudents', timetableId),

    // Nouvelles méthodes pour les justifications d'absences
    justifyAbsence: (student_presence_id, reason, date) => 
        ipcRenderer.invoke('justifyAbsence', student_presence_id, reason, date),
    getStudentAbsences: (studentId) => 
        ipcRenderer.invoke('getStudentAbsences', studentId),
    getAbsenceDetails: (absenceId) => 
        ipcRenderer.invoke('getAbsenceDetails', absenceId),
    getAllAbsentStudents: () => {
        console.log('Appel de getAllAbsentStudents depuis le preload');
        return ipcRenderer.invoke('getAllAbsentStudents');
    },

    // Méthodes pour la gestion des étudiants
    assignStudentsToParent: (parentId, studentIds) => 
        ipcRenderer.invoke('assignStudentsToParent', parentId, studentIds),
    getParentStudents: (parentId) => ipcRenderer.invoke('getParentStudents', parentId),
    getStudentTimetable: (studentId) => ipcRenderer.invoke('getStudentTimetable', studentId),
    getParentStudentsWithTimetable: (parentId) => ipcRenderer.invoke('getParentStudentsWithTimetable', parentId),

    // Méthodes pour la gestion des présences
    markAttendance: (attendanceData) => ipcRenderer.invoke('markAttendance', attendanceData),
    getSessionAttendance: (sessionId) => ipcRenderer.invoke('getSessionAttendance', sessionId),
    getCourseStudents: (timetableId) => ipcRenderer.invoke('getCourseStudents', timetableId),
    getAttendanceStatistics: (courseId, period, classId) => 
        ipcRenderer.invoke('getAttendanceStatistics', courseId, period, classId),
    getCourses: () => ipcRenderer.invoke('getCourses'),
    getClasses: () => ipcRenderer.invoke('getClasses'),

    // Méthodes pour les statistiques
    getStudentAttendanceStats: (period, classId) => {
        console.log('Calling getStudentAttendanceStats from preload with:', period, classId);
        return ipcRenderer.invoke('getStudentAttendanceStats', period, classId);
    },
    
    getClassAttendanceStats: (period) => {
        console.log('Calling getClassAttendanceStats from preload with:', period);
        return ipcRenderer.invoke('getClassAttendanceStats', period);
    },
    
    getCourseVolumeStats: (period, classId) => {
        console.log('Calling getCourseVolumeStats from preload with:', period, classId);
        return ipcRenderer.invoke('getCourseVolumeStats', period, classId);
    },
    
    getTrimesterVolumeStats: (classId) => {
        console.log('Calling getTrimesterVolumeStats from preload with:', classId);
        return ipcRenderer.invoke('getTrimesterVolumeStats', classId);
    },

    // Nouvelles méthodes pour les volumes
    getCourseVolumes: (period) => {
        console.log('Calling getCourseVolumes from preload with:', period);
        return ipcRenderer.invoke('getCourseVolumes', period);
    },

    getTrimesterVolumes: () => {
        console.log('Calling getTrimesterVolumes from preload');
        return ipcRenderer.invoke('getTrimesterVolumes');
    },

    getPeriodCondition: (period) => {
        console.log('Calling getPeriodCondition from preload with:', period);
        return ipcRenderer.invoke('getPeriodCondition', period);
    },

    getStudentGrades: (email) => {
        console.log('Calling getStudentGrades from preload with email:', email);
        return ipcRenderer.invoke('getStudentGrades', email);
    },

    getUserId: (email) => {
        console.log('Getting user ID for email:', email);
        return ipcRenderer.invoke('getUserId', email);
    },
});

contextBridge.exposeInMainWorld('api', {
    // Méthodes pour la gestion de l'emploi du temps et des cours 
    getDays: () => ipcRenderer.invoke('getDays'),
    getCourses: () => ipcRenderer.invoke('getCourses'),
    getTeachers: () => ipcRenderer.invoke('getTeachers'),
    getClasses: () => ipcRenderer.invoke('getClasses'),
    getTimeSlots: () => ipcRenderer.invoke('getTimeSlots'),

    // Méthodes pour la gestion des emplois du temps
    createTimetable: (classId, courseId, dayId, timeSlotId, teacherId, color) => 
        ipcRenderer.invoke('createTimetable', classId, courseId, dayId, timeSlotId, teacherId, color),
    updateTimetable: (timetableId, classId, courseId, dayId, timeSlotId, teacherId, color) => 
        ipcRenderer.invoke('updateTimetable', timetableId, classId, courseId, dayId, timeSlotId, teacherId, color),
    deleteTimetable: (timetableId) => 
        ipcRenderer.invoke('deleteTimetable', timetableId),
    getTimetable: () => ipcRenderer.invoke('getTimetable'),

    // Méthodes pour la gestion des étudiants
    getStudentClass: (email) => ipcRenderer.invoke('getStudentClass', email),
});

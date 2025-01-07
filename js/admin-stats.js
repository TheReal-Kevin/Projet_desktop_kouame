document.addEventListener('DOMContentLoaded', () => {
    // Éléments du DOM
    const periodFilter = document.getElementById('periodFilter');
    const classFilter = document.getElementById('classFilter');
    const courseFilter = document.getElementById('courseFilter');
    const alertsContainer = document.getElementById('alertsContainer');
    const globalAttendanceRate = document.getElementById('globalAttendanceRate');
    const activeStudents = document.getElementById('activeStudents');
    const droppedStudents = document.getElementById('droppedStudents');

    // Nouveaux éléments de filtre
    const startDateFilter = document.getElementById('startDateFilter');
    const endDateFilter = document.getElementById('endDateFilter');
    const statusFilter = document.getElementById('statusFilter');
    const attendanceRangeFilter = document.getElementById('attendanceRangeFilter');

    // Nouveaux éléments pour les notifications
    const notificationsContainer = document.getElementById('notificationsContainer');
    const alertCount = document.getElementById('alertCount');
    const markAllReadBtn = document.getElementById('markAllReadBtn');

    
    let classAttendanceChart = null;
    let attendanceGradesChart = null;

    // État global
    let currentStats = null;
    let workshopElearningStats = null;
    let customDateRange = false;

    // État global pour les notifications
    let notifications = [];
    let unreadAlerts = new Set();

    // Initialisation des graphiques
    function initializeCharts() {
        // Graphique des taux de présence par classe
        const classCtx = document.getElementById('classAttendanceChart').getContext('2d');
        classAttendanceChart = new Chart(classCtx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Taux de présence (%)',
                    data: [],
                    backgroundColor: 'rgba(52, 152, 219, 0.6)',
                    borderColor: 'rgba(52, 152, 219, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });

        // Graphique des notes d'assiduité
        const gradesCtx = document.getElementById('attendanceGradesChart').getContext('2d');
        attendanceGradesChart = new Chart(gradesCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Notes d\'assiduité',
                    data: [],
                    borderColor: 'rgba(46, 204, 113, 1)',
                    backgroundColor: 'rgba(46, 204, 113, 0.1)',
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 20
                    }
                }
            }
        });
    }

    // Initialisation
    async function initialize() {
        initializeCharts(); // Initialise les graphiques en premier
        await loadFilters();
        await updateStatistics();
        setupEventListeners();
    }

    // Chargement des filtres
    async function loadFilters() {
        try {
            // Charge les classes
            const classes = await window.connect.getAllClasses();
            classes.forEach(classItem => {
                const option = document.createElement('option');
                option.value = classItem.value;
                option.textContent = classItem.name;
                classFilter.appendChild(option);
            });

            // Charge les matières (incluant workshops et e-learning)
            const courses = await window.connect.getCourses();
            courses.forEach(course => {
                const option = document.createElement('option');
                option.value = course.id;
                option.textContent = course.name;
                courseFilter.appendChild(option);
            });
        } catch (error) {
            console.error('Erreur lors du chargement des filtres:', error);
            showError('Erreur lors du chargement des filtres');
        }
    }

    // Mise à jour des statistiques
    async function updateStatistics() {
        try {
            // Détermine la période
            let period;
            if (customDateRange) {
                period = {
                    start: startDateFilter.value,
                    end: endDateFilter.value
                };
            } else {
                switch (periodFilter.value) {
                    case 'week':
                        period = 'week';
                        break;
                    case 'month':
                        period = 'month';
                        break;
                    case 'semester':
                        // Détermine automatiquement le semestre en cours
                        const currentMonth = new Date().getMonth() + 1;
                        period = currentMonth <= 6 ? 'trimester1' : 'trimester2';
                        break;
                    case 'year':
                        period = 'year';
                        break;
                    default:
                        period = null;
                }
            }

            const classId = classFilter.value;
            const courseId = courseFilter.value;
            const status = statusFilter.value;
            const attendanceRange = attendanceRangeFilter.value;

            // Récupère les statistiques
            const stats = await window.connect.getAttendanceStatistics(courseId, period, classId);
            
            if (stats) {
                // Met à jour les statistiques globales
                if (stats.summary) {
                    const totalSessions = stats.summary.present_count + stats.summary.absent_count + stats.summary.late_count;
                    const attendanceRate = totalSessions > 0 
                        ? ((stats.summary.present_count + stats.summary.late_count) / totalSessions) * 100 
                        : 0;

                    globalAttendanceRate.textContent = `${attendanceRate.toFixed(1)}%`;
                }

                // Met à jour les compteurs d'étudiants
                if (stats.detailed) {
                    // Un étudiant est considéré comme droppé si son taux de présence est < 30%
                    const activeCount = stats.detailed.filter(s => 
                        (s.attended_sessions / s.total_sessions) * 100 >= 30
                    ).length;
                    const droppedCount = stats.detailed.filter(s => 
                        (s.attended_sessions / s.total_sessions) * 100 < 30
                    ).length;
                    
                    activeStudents.textContent = activeCount;
                    droppedStudents.textContent = droppedCount;
                }

                // Filtre les données selon les critères sélectionnés
                let filteredData = stats.detailed;
                if (status !== 'all') {
                    filteredData = filteredData.filter(student => {
                        const attendanceRate = (student.attended_sessions / student.total_sessions) * 100;
                        const isActive = attendanceRate >= 30;
                        return status === 'active' ? isActive : !isActive;
                    });
                }

                if (attendanceRange !== 'all') {
                    const [min, max] = attendanceRange.split('-').map(Number);
                    filteredData = filteredData.filter(student => {
                        const attendanceRate = (student.attended_sessions / student.total_sessions) * 100;
                        return attendanceRate >= min && attendanceRate <= max;
                    });
                }

                // Met à jour le tableau détaillé
                updateDetailedTable(filteredData);

                // Met à jour les graphiques
                if (classAttendanceChart && stats.classStats) {
                    classAttendanceChart.data.labels = stats.classStats.map(c => c.class_name);
                    classAttendanceChart.data.datasets[0].data = stats.classStats.map(c => c.attendance_rate);
                    classAttendanceChart.update();
                }

                if (attendanceGradesChart && filteredData) {
                    const grades = filteredData.map(student => ({
                        name: student.student_name,
                        grade: calculateAttendanceGrade(student.attended_sessions, student.total_sessions)
                    })).sort((a, b) => b.grade - a.grade);

                    attendanceGradesChart.data.labels = grades.map(g => g.name);
                    attendanceGradesChart.data.datasets[0].data = grades.map(g => g.grade);
                    attendanceGradesChart.update();
                }

                // Met à jour les alertes
                updateAlerts();
            }
        } catch (error) {
            console.error('Erreur lors de la mise à jour des statistiques:', error);
            showNotification(
                'Erreur',
                'Une erreur est survenue lors de la mise à jour des statistiques',
                'error'
            );
        }
    }

    // Nouvelle fonction pour filtrer les résultats
    function filterResults(status, attendanceRange) {
        if (!currentStats || !currentStats.detailed) return;

        if (status !== 'all') {
            currentStats.detailed = currentStats.detailed.filter(student => {
                const studentStatus = (student.attendance_rate < 30) ? 'dropped' : 'active';
                return studentStatus === status;
            });
        }

        if (attendanceRange !== 'all') {
            const [min, max] = attendanceRange.split('-').map(Number);
            currentStats.detailed = currentStats.detailed.filter(student => {
                const rate = (student.attended_sessions / student.total_sessions) * 100;
                return rate >= min && rate <= max;
            });
        }
    }

    // Fonction pour vérifier si un cours est E-learning ou Workshop
    async function isElearningWorkshopCourse(courseId) {
        try {
            const courses = await window.connect.getCourses();
            const course = courses.find(c => c.id === parseInt(courseId));
            return course && (
                course.name.toLowerCase().includes('e-learning') || 
                course.name.toLowerCase().includes('workshop')
            );
        } catch (error) {
            console.error('Erreur lors de la vérification du type de cours:', error);
            return false;
        }
    }

    // Calcul de la note d'assiduité
    function calculateAttendanceGrade(attendedSessions, totalSessions) {
        if (totalSessions === 0) return 0;
        
        // Calcul du taux de présence (en pourcentage)
        const attendanceRate = (attendedSessions / totalSessions);
        
        const grade = attendanceRate * 20;
        
        // Arrondir à deux décimales
        return Math.round(grade * 100) / 100;
    }

    // Mise à jour des statistiques rapides
    function updateQuickStats() {
        let totalAttendance = 0;
        let totalStudents = 0;
        let droppedCount = 0;

        if (currentStats && currentStats.detailed) {
            // Calcul pour les cours normaux
            currentStats.detailed.forEach(student => {
                const attendanceRate = (student.attended_sessions / student.total_sessions) * 100;
                totalAttendance += attendanceRate;
                totalStudents++;
                if (attendanceRate < 30) droppedCount++;
            });
        }

        if (workshopElearningStats) {
            // Calcul pour les workshops et e-learning
            workshopElearningStats.forEach(session => {
                session.students.forEach(student => {
                    const isPresent = student.status === 'present';
                    totalAttendance += isPresent ? 100 : 0;
                    totalStudents++;
                    if (!isPresent) droppedCount++;
                });
            });
        }

        // Mise à jour de l'interface
        const averageAttendance = totalStudents > 0 ? totalAttendance / totalStudents : 0;
        globalAttendanceRate.textContent = `${averageAttendance.toFixed(1)}%`;
        activeStudents.textContent = totalStudents - droppedCount;
        droppedStudents.textContent = droppedCount;
    }

    // Mise à jour des alertes
    function updateAlerts() {
        alertsContainer.innerHTML = '';
        let droppedStudents = [];
        
        // Alertes pour les cours normaux
        if (currentStats && currentStats.detailed) {
            currentStats.detailed.forEach(student => {
                // Calcule le taux de présence
                const attendanceRate = (student.attended_sessions / student.total_sessions) * 100;
                
                // Si le taux est inférieur à 30%, créer une alerte
                if (attendanceRate < 30) {
                    droppedStudents.push({
                        name: student.student_name,
                        class: student.class_name,
                        course: student.course_name,
                        rate: attendanceRate,
                        sessions: `${student.attended_sessions}/${student.total_sessions}`
                    });

                    const message = `
                    
                        Taux de présence : ${attendanceRate.toFixed(1)}%
                        Sessions assistées : ${student.attended_sessions}/${student.total_sessions}
                        
                        Conséquences :
                        • L'étudiant n'est plus autorisé à suivre les séances restantes
                        • L'étudiant ne sera pas évalué pour ce module
                        • Le module devra obligatoirement être repris l'année suivante
                        
                        Action requise :
                        → Notification immédiate à l'étudiant et à l'enseignant
                    `;
                    
                    addAlertElement(
                        student.student_name,
                        student.course_name,
                        attendanceRate,
                        message,
                        student.class_name,
                        true // isDropped
                    );
                }
            });
        }

        // Si des étudiants sont droppés, affiche une notification détaillée
        if (droppedStudents.length > 0) {
            // Crée un message détaillé pour la notification
            const notificationMessage = `
                <div class="dropped-notification">
                    <div class="dropped-header">
                        <span class="dropped-icon">🔔</span>
                        <span class="dropped-count">${droppedStudents.length} étudiant${droppedStudents.length > 1 ? 's' : ''} droppé${droppedStudents.length > 1 ? 's' : ''}</span>
                    </div>
                    <div class="dropped-list">
                        ${droppedStudents.map(student => `
                            <div class="dropped-item">
                                <strong>${student.name}</strong> (${student.class})
                                <div class="dropped-details">
                                    Module : ${student.course}
                                    <br>
                                    Taux de présence : <span class="critical-rate">${student.rate.toFixed(1)}%</span>
                                    <br>
                                    Sessions : ${student.sessions}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;

            // Affiche la notification système
            showNotification(
                '🚫 Étudiants Droppés - Action Requise',
                notificationMessage,
                'warning',
                15000, // Durée plus longue pour cette notification importante
                true // isPersistent
            );
        }

        // Met à jour le compteur d'alertes
        updateAlertCount();
    }

    function addAlertElement(studentName, courseName, rate, message, className, isDropped) {
        const alertId = `${studentName}-${courseName}`.replace(/\s+/g, '-').toLowerCase();
        const alertElement = document.createElement('div');
        alertElement.className = `alert-item unread ${isDropped ? 'critical dropped' : ''}`;
        alertElement.dataset.alertId = alertId;
        
        alertElement.innerHTML = `
            <div class="alert-content">
                <div class="alert-header">
                    <div class="alert-title">
                        <strong>${studentName}</strong>
                        <span class="alert-class">${className || ''}</span>
                        ${isDropped ? '<span class="dropped-badge">DROPPÉ</span>' : ''}
                    </div>
                </div>
                <div class="alert-details">
                    <div class="alert-course">Module : <strong>${courseName}</strong></div>
                    <div class="alert-rate ${rate < 30 ? 'critical-rate' : ''}">
                        Taux de présence : ${rate.toFixed(1)}%
                    </div>
                    <div class="alert-message">
                        ${message.split('\n').map(line => line.trim()).filter(Boolean).join('<br>')}
                    </div>
                </div>
            </div>
            <div class="alert-actions">
                <button class="alert-action-btn mark-read" title="Marquer comme lu">
                    <i class="fas fa-check"></i>
                </button>
                <button class="alert-action-btn notify-student" title="Notifier l'étudiant">
                    <i class="fas fa-envelope"></i>
                </button>
                <button class="alert-action-btn notify-teacher" title="Notifier l'enseignant">
                    <i class="fas fa-chalkboard-teacher"></i>
                </button>
                <button class="alert-action-btn notify-admin" title="Notifier le coordinateur pédagogique">
                    <i class="fas fa-user-shield"></i>
                </button>
            </div>
        `;

        // Ajoute les écouteurs d'événements pour les actions
        const markReadBtn = alertElement.querySelector('.mark-read');
        const notifyStudentBtn = alertElement.querySelector('.notify-student');
        const notifyTeacherBtn = alertElement.querySelector('.notify-teacher');
        const notifyAdminBtn = alertElement.querySelector('.notify-admin');

        markReadBtn.addEventListener('click', () => markAlertAsRead(alertId));
        notifyStudentBtn.addEventListener('click', () => notifyStudent(studentName, courseName, rate, className, isDropped));
        notifyTeacherBtn.addEventListener('click', () => notifyTeacher(studentName, courseName, rate, className, isDropped));
        notifyAdminBtn.addEventListener('click', () => notifyAdmin(studentName, courseName, rate, className, isDropped));

        alertsContainer.appendChild(alertElement);
        unreadAlerts.add(alertId);
    }

    function markAlertAsRead(alertId) {
        const alertElement = document.querySelector(`[data-alert-id="${alertId}"]`);
        if (alertElement) {
            alertElement.classList.remove('unread');
            alertElement.classList.add('read');
            unreadAlerts.delete(alertId);
            updateAlertCount();
        }
    }

    function markAllAlertsAsRead() {
        const alerts = document.querySelectorAll('.alert-item.unread');
        alerts.forEach(alert => {
            const alertId = alert.dataset.alertId;
            markAlertAsRead(alertId);
        });
        showNotification('Succès', 'Toutes les alertes ont été marquées comme lues', 'success');
    }

    function notifyStudent(studentName, courseName, rate, className, isDropped) {
        const message = isDropped ? 
            `IMPORTANT : Vous avez été droppé du module ${courseName} en raison d'un taux de présence insuffisant (${rate.toFixed(1)}%). Le module devra être repris l'année prochaine.` :
            `Notification concernant votre présence dans le module ${courseName}`;
            
        showNotification(
            'Notification envoyée à l\'étudiant',
            message,
            isDropped ? 'warning' : 'info'
        );
    }

    function notifyTeacher(studentName, courseName, rate, className, isDropped) {
        const message = isDropped ?
            `L'étudiant ${studentName} a été droppé du module ${courseName} (taux de présence : ${rate.toFixed(1)}%)` :
            `Notification concernant l'étudiant ${studentName} dans le module ${courseName}`;
            
        showNotification(
            'Notification envoyée à l\'enseignant',
            message,
            isDropped ? 'warning' : 'info'
        );
    }

    function notifyAdmin(studentName, courseName, rate, className, isDropped) {
        const message = isDropped ?
            `L'étudiant ${studentName} (${className}) a été droppé du module ${courseName}. Taux de présence : ${rate.toFixed(1)}%` :
            `Notification concernant l'étudiant ${studentName} dans le module ${courseName}`;
            
        showNotification(
            'Notification envoyée au coordinateur',
            message,
            isDropped ? 'warning' : 'info'
        );
    }

    function updateAlertCount() {
        alertCount.textContent = unreadAlerts.size;
        if (unreadAlerts.size > 0) {
            alertCount.style.display = 'inline-block';
        } else {
            alertCount.style.display = 'none';
        }
    }

    // Ajoute l'écouteur d'événement pour le bouton "Tout marquer comme lu"
    markAllReadBtn.addEventListener('click', markAllAlertsAsRead);

    // Met à jour le tableau détaillé
    function updateDetailedTable(filteredData) {
        const tbody = document.querySelector('#detailedStatsTable tbody');
        tbody.innerHTML = '';

        if (filteredData) {
            filteredData.forEach(student => {
                const attendanceRate = (student.attended_sessions / student.total_sessions) * 100;
                const isDropped = attendanceRate < 30;
                const grade = calculateAttendanceGrade(student.attended_sessions, student.total_sessions);
                
                const row = document.createElement('tr');
                row.className = isDropped ? 'dropped-student' : '';
                
                row.innerHTML = `
                    <td>${student.student_name}</td>
                    <td>${student.class_name}</td>
                    <td>${student.course_name}</td>
                    <td>${grade.toFixed(2)}/20</td>
                    <td class="${isDropped ? 'critical-rate' : ''}">${attendanceRate.toFixed(1)}%</td>
                    <td>${student.attended_sessions}/${student.total_sessions}</td>
                    <td>${student.total_sessions}</td>
                    <td>
                        <span class="status-badge ${isDropped ? 'status-dropped' : 'status-active'}">
                            ${isDropped ? 'Droppé' : 'Actif'}
                        </span>
                        ${isDropped ? '<div class="dropped-warning">Module à reprendre</div>' : ''}
                    </td>
                `;

                tbody.appendChild(row);
            });
        }

        // Met à jour le compteur d'étudiants droppés
        const droppedStudents = filteredData.filter(student => 
            (student.attended_sessions / student.total_sessions) * 100 < 30
        ).length;
        
        document.getElementById('droppedCount').textContent = 
            `${droppedStudents} étudiant${droppedStudents > 1 ? 's' : ''} droppé${droppedStudents > 1 ? 's' : ''}`;
        
        document.getElementById('alertsTotal').textContent = 
            `${filteredData.length} étudiant${filteredData.length > 1 ? 's' : ''} au total`;
    }

    // Met à jour les graphiques
    function updateCharts() {
        if (!classAttendanceChart || !attendanceGradesChart) return;
        updateClassAttendanceChart();
        updateGradesChart();
    }

    function updateClassAttendanceChart() {
        if (!classAttendanceChart) return;

        const classData = new Map();

        // Agrège les données par classe
        if (currentStats && currentStats.classRates) {
            currentStats.classRates.forEach(rate => {
                if (!classData.has(rate.class_name)) {
                    classData.set(rate.class_name, {
                        totalAttendance: 0,
                        count: 0
                    });
                }
                const data = classData.get(rate.class_name);
                data.totalAttendance += rate.attendance_rate || 0;
                data.count++;
            });
        }

        // Ajoute les données des workshops et e-learning
        if (workshopElearningStats) {
            workshopElearningStats.forEach(session => {
                const className = session.class_name;
                if (!classData.has(className)) {
                    classData.set(className, {
                        totalAttendance: 0,
                        count: 0
                    });
                }
                const data = classData.get(className);
                const presentCount = session.students.filter(s => s.status === 'present').length;
                data.totalAttendance += (presentCount / session.students.length) * 100 || 0;
                data.count++;
            });
        }

        // Calcule les moyennes
        const labels = [];
        const data = [];
        classData.forEach((value, className) => {
            labels.push(className);
            data.push(value.count > 0 ? value.totalAttendance / value.count : 0);
        });

        // Met à jour le graphique
        classAttendanceChart.data.labels = labels;
        classAttendanceChart.data.datasets[0].data = data;
        classAttendanceChart.update();
    }

    function updateGradesChart() {
        if (!currentStats || !currentStats.detailed) return;

        const grades = [];
        const labels = [];

        // Calcule les notes pour les cours normaux
        currentStats.detailed.forEach(student => {
            const grade = calculateAttendanceGrade(student.attended_sessions, student.total_sessions);
            grades.push(grade);
            labels.push(student.student_name);
        });

        // Calcule les notes pour les workshops et e-learning
        if (workshopElearningStats) {
            workshopElearningStats.forEach(session => {
                session.students.forEach(student => {
                    const grade = calculateAttendanceGrade(
                        student.status === 'present' ? 1 : 0,
                        1
                    );
                    grades.push(grade);
                    labels.push(student.student_name);
                });
            });
        }

        // Trie les données
        const sortedData = labels.map((label, i) => ({
            label,
            grade: grades[i]
        })).sort((a, b) => b.grade - a.grade);

        // Met à jour le graphique
        attendanceGradesChart.data.labels = sortedData.map(d => d.label);
        attendanceGradesChart.data.datasets[0].data = sortedData.map(d => d.grade);
        attendanceGradesChart.update();
    }

    // Configuration des écouteurs d'événements
    function setupEventListeners() {
        // Écouteurs existants
        periodFilter.addEventListener('change', handlePeriodChange);
        classFilter.addEventListener('change', updateStatistics);
        courseFilter.addEventListener('change', updateStatistics);

        // Nouveaux écouteurs
        startDateFilter.addEventListener('change', handleDateChange);
        endDateFilter.addEventListener('change', handleDateChange);
        statusFilter.addEventListener('change', updateStatistics);
        attendanceRangeFilter.addEventListener('change', updateStatistics);
    }

    // Gestion du changement de période
    function handlePeriodChange(event) {
        const customPeriod = event.target.value === 'custom';
        startDateFilter.disabled = !customPeriod;
        endDateFilter.disabled = !customPeriod;
        customDateRange = customPeriod;
        updateStatistics();
    }

    // Gestion du changement de dates personnalisées
    function handleDateChange() {
        if (startDateFilter.value && endDateFilter.value) {
            updateStatistics();
        }
    }

    // Affichage des erreurs
    function showError(message) {
        console.error(message);
        alert(message);
    }

    // Système de notifications
    function showNotification(title, message, type = 'info', duration = 5000, isPersistent = false) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}${isPersistent ? ' persistent' : ''}`;
        
        const icon = type === 'error' ? '❌' :
                    type === 'warning' ? '⚠️' :
                    type === 'success' ? '✅' : 'ℹ️';

        notification.innerHTML = `
            <div class="notification-header">
                <span class="notification-icon">${icon}</span>
                <div class="notification-title">${title}</div>
                <button class="notification-close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="notification-content">
                ${message}
            </div>
            ${isPersistent ? `
                <div class="notification-actions">
                    <button class="notification-action-btn acknowledge">
                        <i class="fas fa-check"></i> J'ai compris
                    </button>
                </div>
            ` : ''}
        `;

        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => removeNotification(notification));

        if (isPersistent) {
            const acknowledgeBtn = notification.querySelector('.acknowledge');
            acknowledgeBtn.addEventListener('click', () => removeNotification(notification));
        }

        notificationsContainer.appendChild(notification);
        
        if (!isPersistent) {
            setTimeout(() => {
                if (notification.parentElement === notificationsContainer) {
                    removeNotification(notification);
                }
            }, duration);
        }

        return notification;
    }

    function removeNotification(notification) {
        notification.style.animation = 'slideOut 0.3s ease-out forwards';
        setTimeout(() => {
            if (notification.parentElement === notificationsContainer) {
                notificationsContainer.removeChild(notification);
            }
            notifications = notifications.filter(n => n !== notification);
        }, 300);
    }

    // Démarrage de l'application
    initialize().catch(error => {
        console.error('Erreur lors de l\'initialisation:', error);
        showError('Erreur lors de l\'initialisation de l\'application');
    });
});

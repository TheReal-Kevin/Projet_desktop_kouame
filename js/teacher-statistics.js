let attendanceGradesChart;
let classAttendanceChart;

document.addEventListener('DOMContentLoaded', async () => {
    // initialisation des graphiques
    const gradesCtx = document.getElementById('attendanceGradesChart').getContext('2d');
    attendanceGradesChart = new Chart(gradesCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Notes d\'assiduité',
                data: [],
                backgroundColor: '#3498db'
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

    const classCtx = document.getElementById('classAttendanceChart').getContext('2d');
    classAttendanceChart = new Chart(classCtx, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [
                    '#2ecc71',
                    '#3498db',
                    '#e74c3c',
                    '#f1c40f',
                    '#9b59b6'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });

    // initialisation des filtres et chargement des données
    await loadFilters();
    await loadStatistics();

    // écouteurs d'événements pour les filtres
    document.querySelectorAll('.filter-select').forEach(filter => {
        filter.addEventListener('change', async () => {
            await loadStatistics();
        });
    });
});

// fonction pour initialiser les graphiques
function initializeCharts() {
    // graphique des notes d'assiduité
    const gradesCtx = document.getElementById('attendanceGradesChart').getContext('2d');
    attendanceGradesChart = new Chart(gradesCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Notes d\'assiduité',
                data: [],
                backgroundColor: '#3498db'
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

    // graphique du taux de présence par classe
    const classCtx = document.getElementById('classAttendanceChart').getContext('2d');
    classAttendanceChart = new Chart(classCtx, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [
                    '#2ecc71',
                    '#3498db',
                    '#e74c3c',
                    '#f1c40f',
                    '#9b59b6'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

// fonction pour charger les filtres
async function loadFilters() {
    try {
        // charger les matières
        const courses = await window.connect.getCourses();
        const courseFilter = document.getElementById('courseFilter');
        courses.forEach(course => {
            const option = document.createElement('option');
            option.value = course.id;
            option.textContent = course.name;
            courseFilter.appendChild(option);
        });

        // charger les classes
        const classes = await window.connect.getClasses();
        const classFilter = document.getElementById('classFilter');
        classes.forEach(classe => {
            const option = document.createElement('option');
            option.value = classe.id;
            option.textContent = classe.name;
            classFilter.appendChild(option);
        });
    } catch (error) {
        console.error('Erreur lors du chargement des filtres:', error);
        showNotification('Erreur lors du chargement des filtres', 'error');
    }
}

// fonction pour calculer la note d'assiduité
function calculateAttendanceGrade(totalSessions, attendedSessions) {
    if (totalSessions === 0) return 0;
    // Règle de trois pour calculer la note sur 20
    return (attendedSessions / totalSessions) * 20;
}

// fonction pour calculer le taux de présence
function calculateAttendanceRate(totalSessions, attendedSessions) {
    if (totalSessions === 0) return 0;
    return (attendedSessions / totalSessions) * 100;
}

// constantes pour les seuils
const DROPPED_THRESHOLD = 30;
const WARNING_THRESHOLD = 85;

// fonction pour déterminer le statut d'un étudiant
function getStudentStatus(attendanceRate) {
    if (attendanceRate < DROPPED_THRESHOLD) return 'dropped';
    if (attendanceRate < WARNING_THRESHOLD) return 'warning';
    return 'normal';
}

// fonction pour charger les statistiques
async function loadStatistics() {
    try {
        const courseId = document.getElementById('courseFilter').value;
        const period = document.getElementById('periodFilter').value;
        const classId = document.getElementById('classFilter').value;

        // récupère les statistiques
        const stats = await window.connect.getAttendanceStatistics(courseId, period, classId);
        
        if (!stats) {
            showNotification('Aucune donnée disponible', 'warning');
            return;
        }

        // met à jour les graphiques
        updateAttendanceGradesChart(stats.detailed);
        updateClassAttendanceChart(stats.classStats);
        
        // mettre à jour le tableau des étudiants
        updateStudentTable(stats.detailed);
        
        // met à jour les alertes
        updateAlerts(stats.alerts);
        
        // met à jour le tableau détaillé
        updateDetailedStats(stats.detailed);

    } catch (error) {
        console.error('Erreur lors du chargement des statistiques:', error);
        showNotification('Erreur lors du chargement des statistiques', 'error');
    }
}

// fonction pour mettre à jour le graphique des notes d'assiduité
function updateAttendanceGradesChart(detailedStats) {
    if (!detailedStats || detailedStats.length === 0) {
        attendanceGradesChart.data.labels = [];
        attendanceGradesChart.data.datasets[0].data = [];
        attendanceGradesChart.update();
        return;
    }

    const grades = detailedStats.map(student => {
        const grade = calculateAttendanceGrade(student.attended_sessions, student.total_sessions);
        return {
            student_name: student.student_name,
            grade: grade
        };
    });

    // Trie les notes par ordre décroissant
    grades.sort((a, b) => b.grade - a.grade);

    attendanceGradesChart.data.labels = grades.map(g => g.student_name);
    attendanceGradesChart.data.datasets[0].data = grades.map(g => g.grade);
    attendanceGradesChart.update();
}

// fonction pour mettre à jour le tableau des étudiants
function updateStudentTable(detailedStats) {
    const tbody = document.querySelector('#studentAttendanceTable tbody');
    tbody.innerHTML = '';

    if (!detailedStats || detailedStats.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="3" class="no-data">
                    <i class="fas fa-info-circle"></i>
                    Aucune donnée disponible
                </td>
            </tr>
        `;
        return;
    }

    // Calcule les taux de présence par étudiant
    const studentRates = detailedStats.map(student => {
        const rate = (student.attended_sessions / student.total_sessions) * 100;
        return {
            student_name: student.student_name,
            attendance_rate: rate,
            status: getStudentStatus(rate)
        };
    });

    // Trie par taux de présence décroissant
    studentRates.sort((a, b) => b.attendance_rate - a.attendance_rate);

    studentRates.forEach(student => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${student.student_name}</td>
            <td>${student.attendance_rate.toFixed(1)}%</td>
            <td>
                <span class="status-badge status-${student.status}">
                    ${student.status === 'dropped' ? 'Droppé (<30%)' : 
                      student.status === 'warning' ? 'Attention' : 'Normal'}
                </span>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// fonction pour mettre à jour le graphique des classes
function updateClassAttendanceChart(classStats) {
    if (!classStats || classStats.length === 0) {
        classAttendanceChart.data.labels = [];
        classAttendanceChart.data.datasets[0].data = [];
        classAttendanceChart.update();
        return;
    }

    // Trie par taux de présence décroissant
    const sortedStats = [...classStats].sort((a, b) => b.attendance_rate - a.attendance_rate);

    classAttendanceChart.data.labels = sortedStats.map(c => c.class_name);
    classAttendanceChart.data.datasets[0].data = sortedStats.map(c => c.attendance_rate);
    classAttendanceChart.update();
}

// fonction pour mettre à jour les alertes
function updateAlerts(alerts) {
    const container = document.querySelector('.alerts-container');
    container.innerHTML = '';

    if (!alerts || alerts.length === 0) {
        container.innerHTML = `
            <div class="alert-item">
                <i class="fas fa-check-circle"></i>
                <div>Aucune alerte à signaler</div>
            </div>
        `;
        return;
    }

    alerts.forEach(alert => {
        const alertElement = document.createElement('div');
        alertElement.className = 'alert-item alert-dropped';
        alertElement.innerHTML = `
            <i class="fas fa-ban"></i>
            <div>
                <strong>${alert.student_name}</strong> est droppé de la matière 
                <strong>${alert.course_name}</strong>
                (Taux de présence: ${alert.attendance_rate.toFixed(1)}%)
                <br>
                <small class="drop-info">L'étudiant n'est plus autorisé à suivre ce module et devra le reprendre l'année suivante.</small>
            </div>
        `;
        container.appendChild(alertElement);
    });
}

// fonction pour mettre à jour le tableau détaillé
function updateDetailedStats(detailedStats) {
    const tbody = document.querySelector('#detailedStatsTable tbody');
    tbody.innerHTML = '';

    if (!detailedStats || detailedStats.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="no-data">
                    <i class="fas fa-info-circle"></i>
                    Aucune donnée détaillée disponible
                </td>
            </tr>
        `;
        return;
    }

    detailedStats.forEach(stat => {
        const attendanceRate = (stat.attended_sessions / stat.total_sessions) * 100;
        const grade = calculateAttendanceGrade(stat.attended_sessions, stat.total_sessions);
        const status = getStudentStatus(attendanceRate);
        const gradeClass = getGradeClass(grade);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${stat.student_name}</td>
            <td>${stat.course_name}</td>
            <td>
                <div class="grade-container">
                    <div class="grade-value ${gradeClass}">
                        ${grade.toFixed(2)}
                    </div>
                    <div class="grade-info">
                        <span class="grade-label">Note d'assiduité</span>
                        <span class="grade-details">${stat.attended_sessions}/${stat.total_sessions} séances</span>
                    </div>
                </div>
            </td>
            <td>${stat.total_sessions || 0}</td>
            <td>${stat.attended_sessions || 0}</td>
            <td>${attendanceRate.toFixed(1)}%</td>
            <td>
                <span class="status-badge status-${status}">
                    ${status === 'dropped' ? 'Droppé (<30%)' : 
                      status === 'warning' ? 'Attention' : 'Normal'}
                </span>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Fonction pour afficher les notifications
function showNotification(message, type = 'success') {
    const toast = document.getElementById('notification-toast');
    const messageElement = toast.querySelector('.notification-message');
    messageElement.textContent = message;
    
    toast.className = `notification-toast show ${type}`;
    setTimeout(() => {
        toast.className = 'notification-toast';
    }, 3000);
}

// Style pour les messages "pas de données"
const style = document.createElement('style');
style.textContent = `
    .no-data {
        text-align: center;
        padding: 2rem;
        color: #666;
        font-style: italic;
    }
    .no-data i {
        margin-right: 0.5rem;
        color: #999;
    }
`;
document.head.appendChild(style);

// styles additionnels pour les alertes de drop
const dropStyles = document.createElement('style');
dropStyles.textContent = `
    .alert-dropped {
        background-color: #fee2e2 !important;
        border-left: 4px solid #dc2626;
    }

    .alert-dropped i {
        color: #dc2626;
    }

    .drop-info {
        display: block;
        margin-top: 0.5rem;
        color: #dc2626;
        font-style: italic;
    }

    .status-dropped {
        background-color: #fee2e2 !important;
        color: #dc2626 !important;
        font-weight: bold;
    }
`;
document.head.appendChild(dropStyles);

// fonction pour obtenir la classe de note
function getGradeClass(grade) {
    if (grade >= 16) return 'grade-excellent';
    if (grade >= 14) return 'grade-good';
    if (grade >= 10) return 'grade-average';
    return 'grade-poor';
}

// fonction pour notifier le drop d'un étudiant
async function notifyStudentDropped(studentName, courseName, rate) {
    try {
        // envoi la notification au coordinateur
        await window.connect.notifyCoordinator({
            type: 'student_dropped',
            student_name: studentName,
            course_name: courseName,
            attendance_rate: rate,
            message: `L'étudiant ${studentName} est droppé du module ${courseName} (Taux de présence: ${rate.toFixed(1)}%)`
        });

        showNotification(`Notification envoyée au coordinateur pour ${studentName}`, 'info');
    } catch (error) {
        console.error('Erreur lors de l\'envoi de la notification:', error);
    }
}

// Ajoute la légende des notes après le tableau détaillé
function addGradeLegend() {
    if (!document.querySelector('.grade-legend')) {
        const legend = document.createElement('div');
        legend.className = 'grade-legend';
        legend.innerHTML = `
            <div class="legend-item">
                <span class="legend-color legend-excellent"></span>
                <span>Excellent (≥16)</span>
            </div>
            <div class="legend-item">
                <span class="legend-color legend-good"></span>
                <span>Bien (14-15)</span>
            </div>
            <div class="legend-item">
                <span class="legend-color legend-average"></span>
                <span>Moyen (10-13)</span>
            </div>
            <div class="legend-item">
                <span class="legend-color legend-poor"></span>
                <span>Insuffisant (<10)</span>
            </div>
        `;
        document.querySelector('#detailedStatsTable').parentNode.appendChild(legend);
    }
}

// Appelle addGradeLegend après la mise à jour du tableau détaillé
const originalUpdateDetailedStats = updateDetailedStats;
updateDetailedStats = function(detailedStats) {
    originalUpdateDetailedStats(detailedStats);
    addGradeLegend();
}; 
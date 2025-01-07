document.addEventListener('DOMContentLoaded', () => {
    // Déclaration des graphiques
    let studentAttendanceChart;
    let classAttendanceChart;
    let courseVolumeChart;
    let trimesterVolumeChart;

    // Éléments du DOM
    const periodFilter = document.getElementById('periodFilter');
    const classFilter = document.getElementById('classFilter');

    // Couleurs pour les taux de présence
    const attendanceColors = {
        high: '#27ae60',    // Vert foncé pour >= 70%
        good: '#2ecc71',    // Vert clair pour 50.1% - 69.9%
        medium: '#f39c12',  // Orange pour 30.1% - 50%
        low: '#e74c3c'      // Rouge pour <= 30%
    };

    // Couleurs pour les types de cours
    const courseTypeColors = {
        presentiel: '#3498db',
        elearning: '#9b59b6',
        workshop: '#1abc9c'
    };

    // Initialisation de l'application
    async function initialize() {
        try {
            // Initialiser les filtres
            await initializeFilters();
            
            // Initialise les graphiques
            initializeCharts();
            
            // Configure les écouteurs d'événements
            setupEventListeners();
            
            // Met à jour les graphiques
            await updateAllCharts();
        } catch (error) {
            console.error('Erreur lors de l\'initialisation:', error);
            showError('Erreur lors de l\'initialisation');
        }
    }

    // Initialisation des filtres
    async function initializeFilters() {
        try {
            // Récupère la liste des classes
            const classes = await window.connect.getAllClasses();
            
            // Vider le filtre de classe
            classFilter.innerHTML = '<option value="">Toutes les classes</option>';
            
            // Ajouter les options de classe
            classes.forEach(classItem => {
                const option = document.createElement('option');
                option.value = classItem.value;
                option.textContent = classItem.name;
                classFilter.appendChild(option);
            });
        } catch (error) {
            console.error('Erreur lors de l\'initialisation des filtres:', error);
            showError('Erreur lors de l\'initialisation des filtres');
        }
    }

    // Initialisation des graphiques
    function initializeCharts() {
        // Graphique de présence de chaque étudiant
        const studentCtx = document.getElementById('studentAttendanceChart').getContext('2d');
        studentAttendanceChart = new Chart(studentCtx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Taux de présence (%)',
                    data: [],
                    backgroundColor: []
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Taux de présence (%)'
                        }
                    },
                    x: {
                        ticks: {
                            autoSkip: false,
                            maxRotation: 45,
                            minRotation: 45
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });

        // Graphique de présence par classe
        const classCtx = document.getElementById('classAttendanceChart').getContext('2d');
        classAttendanceChart = new Chart(classCtx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Taux de présence moyen (%)',
                    data: [],
                    backgroundColor: courseTypeColors.presentiel
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Taux de présence moyen (%)'
                        }
                    }
                }
            }
        });

        // Graphique de volume par type de cours
        const volumeCtx = document.getElementById('courseVolumeChart').getContext('2d');
        courseVolumeChart = new Chart(volumeCtx, {
            type: 'doughnut',
            data: {
                labels: ['Présentiel', 'E-learning', 'Workshop'],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        courseTypeColors.presentiel,
                        courseTypeColors.elearning,
                        courseTypeColors.workshop
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });

        // Graphique de volume par trimestre
        const trimesterCtx = document.getElementById('trimesterVolumeChart').getContext('2d');
        trimesterVolumeChart = new Chart(trimesterCtx, {
            type: 'bar',
            data: {
                labels: ['Trimestre 1', 'Trimestre 2', 'Total'],
                datasets: [
                    {
                        label: 'Présentiel',
                        backgroundColor: courseTypeColors.presentiel,
                        data: []
                    },
                    {
                        label: 'E-learning',
                        backgroundColor: courseTypeColors.elearning,
                        data: []
                    },
                    {
                        label: 'Workshop',
                        backgroundColor: courseTypeColors.workshop,
                        data: []
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Nombre d\'heures'
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    // Met à jour tous les graphiques
    async function updateAllCharts() {
        const period = periodFilter.value;
        const classId = classFilter.value;

        try {
            // Récupère les statistiques de présence
            const stats = await window.connect.getAttendanceStatistics(null, period, classId);
            
            if (stats) {
                // Met à jour les graphiques de présence
                await updateStudentAttendanceChart(stats);
                await updateClassAttendanceChart(stats);
            }

            // Met à jour les graphiques de volume séparément
            await updateCourseVolumeChart();
            await updateTrimesterVolumeChart();
            
        } catch (error) {
            console.error('Erreur lors de la mise à jour des graphiques:', error);
            showError('Erreur lors de la mise à jour des graphiques');
        }
    }

    // Mise à jour du graphique de présence de chaque étudiant
    async function updateStudentAttendanceChart(stats) {
        if (!stats || !stats.detailed) return;
        
        const selectedClassId = classFilter.value;
        
        // Filtre les données par classe si une classe est sélectionnée
        let filteredData = stats.detailed;
        if (selectedClassId) {
            filteredData = stats.detailed.filter(student => student.class_id === parseInt(selectedClassId));
        }
        
        // Trie les données par taux de présence décroissant
        const sortedData = filteredData.sort((a, b) => {
            const rateA = (a.attended_sessions / a.total_sessions) * 100;
            const rateB = (b.attended_sessions / b.total_sessions) * 100;
            return rateB - rateA;
        });

        const labels = sortedData.map(s => `${s.student_name} (${s.class_name})`);
        const data = sortedData.map(s => (s.attended_sessions / s.total_sessions) * 100);
        const colors = data.map(rate => {
            if (rate >= 70) return attendanceColors.high;      // Vert foncé
            if (rate > 50) return attendanceColors.good;       // Vert clair
            if (rate > 30) return attendanceColors.medium;     // Orange
            return attendanceColors.low;                       // Rouge
        });

        
        studentAttendanceChart.options.plugins.tooltip = {
            callbacks: {
                label: function(context) {
                    const student = sortedData[context.dataIndex];
                    return [
                        `Étudiant: ${student.student_name}`,
                        `Classe: ${student.class_name}`,
                        `Taux de présence: ${context.parsed.y.toFixed(1)}%`,
                        `Sessions présent: ${student.attended_sessions}/${student.total_sessions}`
                    ];
                }
            }
        };

        studentAttendanceChart.data.labels = labels;
        studentAttendanceChart.data.datasets[0].data = data;
        studentAttendanceChart.data.datasets[0].backgroundColor = colors;
        studentAttendanceChart.update();
    }

    
    async function updateClassAttendanceChart(stats) {
        if (!stats || !stats.classStats) return;
        
        const classData = new Map();
        
        // récupère les données par classe
        stats.classStats.forEach(classStat => {
            if (!classData.has(classStat.class_name)) {
                classData.set(classStat.class_name, {
                    totalRate: 0,
                    count: 0
                });
            }
            const data = classData.get(classStat.class_name);
            data.totalRate += classStat.attendance_rate || 0;
            data.count++;
        });

        // Calcule les moyennes
        const labels = Array.from(classData.keys());
        const data = Array.from(classData.values()).map(v => v.count > 0 ? v.totalRate / v.count : 0);

        classAttendanceChart.data.labels = labels;
        classAttendanceChart.data.datasets[0].data = data;
        classAttendanceChart.update();
    }

    // Met à jour graphique par volume et type de cours
    async function updateCourseVolumeChart(stats) {
        try {
            // Récupérer les volumes directement depuis la base de données
            const courseVolumes = await window.connect.getCourseVolumes(periodFilter.value);
            
            // Calcule le total des heures par type de cours
            const volumes = {
                presentiel: courseVolumes.filter(c => c.type === 'presentiel')
                    .reduce((sum, course) => sum + course.hours, 0),
                elearning: courseVolumes.filter(c => c.type === 'elearning')
                    .reduce((sum, course) => sum + course.hours, 0),
                workshop: courseVolumes.filter(c => c.type === 'workshop')
                    .reduce((sum, course) => sum + course.hours, 0)
            };

            
            courseVolumeChart.data.datasets[0].data = [
                volumes.presentiel,
                volumes.elearning,
                volumes.workshop
            ];

            // Ajoute les pourcentages dans les labels
            const total = volumes.presentiel + volumes.elearning + volumes.workshop;
            courseVolumeChart.data.labels = [
                `Présentiel (${Math.round(volumes.presentiel / total * 100)}%)`,
                `E-learning (${Math.round(volumes.elearning / total * 100)}%)`,
                `Workshop (${Math.round(volumes.workshop / total * 100)}%)`
            ];

            courseVolumeChart.update();
        } catch (error) {
            console.error('Erreur lors de la mise à jour du graphique de volume:', error);
        }
    }

    // Mise à jour du graphique par trimestre
    async function updateTrimesterVolumeChart(stats) {
        try {
            
            const trimesterVolumes = await window.connect.getTrimesterVolumes();
            
            const datasets = trimesterVolumeChart.data.datasets;
            
            // Données pour les cours en présentiel
            datasets[0].data = [
                trimesterVolumes.trimester1.presentiel || 0,
                trimesterVolumes.trimester2.presentiel || 0,
                (trimesterVolumes.trimester1.presentiel || 0) + (trimesterVolumes.trimester2.presentiel || 0)
            ];

            // Données pour l'e-learning
            datasets[1].data = [
                trimesterVolumes.trimester1.elearning || 0,
                trimesterVolumes.trimester2.elearning || 0,
                (trimesterVolumes.trimester1.elearning || 0) + (trimesterVolumes.trimester2.elearning || 0)
            ];

            // Données pour les workshops
            datasets[2].data = [
                trimesterVolumes.trimester1.workshop || 0,
                trimesterVolumes.trimester2.workshop || 0,
                (trimesterVolumes.trimester1.workshop || 0) + (trimesterVolumes.trimester2.workshop || 0)
            ];

            
            const totals = {
                trimester1: datasets.reduce((sum, dataset) => sum + dataset.data[0], 0),
                trimester2: datasets.reduce((sum, dataset) => sum + dataset.data[1], 0),
                total: datasets.reduce((sum, dataset) => sum + dataset.data[2], 0)
            };

            trimesterVolumeChart.data.labels = [
                `Trimestre 1 (${totals.trimester1}h)`,
                `Trimestre 2 (${totals.trimester2}h)`,
                `Total (${totals.total}h)`
            ];

            
            trimesterVolumeChart.options.scales.y.title.text = 'Nombre d\'heures';
            trimesterVolumeChart.options.plugins.tooltip = {
                callbacks: {
                    label: function(context) {
                        const label = context.dataset.label || '';
                        const value = context.parsed.y || 0;
                        return `${label}: ${value}h`;
                    }
                }
            };

            trimesterVolumeChart.update();
        } catch (error) {
            console.error('Erreur lors de la mise à jour du graphique des trimestres:', error);
        }
    }

    // filtrage des données des graphiques
    function setupEventListeners() {
        periodFilter.addEventListener('change', updateAllCharts);
        classFilter.addEventListener('change', updateAllCharts);
    }

    // Affichage des erreurs
    function showError(message) {
        console.error(message);
        alert(message);
    }

    
    initialize().catch(error => {
        console.error('Erreur lors de l\'initialisation:', error);
        showError('Erreur lors de l\'initialisation de l\'application');
    });
}); 
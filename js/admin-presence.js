document.addEventListener('DOMContentLoaded', () => {
    // Éléments du DOM
    const classFilter = document.getElementById('classFilter');
    const sessionFilter = document.getElementById('sessionFilter');
    const studentsTable = document.getElementById('studentsTable').getElementsByTagName('tbody')[0];
    const saveButton = document.getElementById('saveAttendanceBtn');
    const searchInput = document.getElementById('searchInput');
    const headerCheckbox = document.getElementById('headerCheckbox');

    // Variables globales
    let currentTimetableId = null;
    let currentStudents = [];
    let filteredStudents = [];

    // Fonction de recherche
    function filterStudents(searchTerm) {
        searchTerm = searchTerm.toLowerCase();
        filteredStudents = currentStudents.filter(student => 
            student.student_name.toLowerCase().includes(searchTerm) ||
            student.class_name.toLowerCase().includes(searchTerm)
        );
        displayStudents(filteredStudents);
    }

    // Fonction pour afficher les étudiants
    function displayStudents(students) {
        studentsTable.innerHTML = '';
        students.forEach(student => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <input type="checkbox" class="student-checkbox" data-student-id="${student.student_id}">
                </td>
                <td>${student.student_name}</td>
                <td>${student.class_name}</td>
                <td>
                    <span class="status-badge status-${student.status}">${formatStatus(student.status)}</span>
                </td>
                <td>
                    <div class="status-buttons">
                        <button class="status-button present" onclick="markStatus(${student.student_id}, 'present')">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="status-button late" onclick="markStatus(${student.student_id}, 'late')">
                            <i class="fas fa-clock"></i>
                        </button>
                        <button class="status-button absent" onclick="markStatus(${student.student_id}, 'absent')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </td>
            `;
            studentsTable.appendChild(row);
        });
        updateSelectAllCheckbox();
    }

    // Fonction pour marquer le statut des étudiants sélectionnés
    window.markSelectedStatus = async (status) => {
        const selectedCheckboxes = document.querySelectorAll('.student-checkbox:checked');
        const selectedIds = Array.from(selectedCheckboxes).map(cb => cb.dataset.studentId);

        if (selectedIds.length === 0) {
            alert('Veuillez sélectionner au moins un étudiant.');
            return;
        }

        try {
            for (const studentId of selectedIds) {
                await markStatus(studentId, status);
            }
            await loadStudents(currentTimetableId);
        } catch (error) {
            console.error('Erreur lors du marquage des présences en lot:', error);
            alert('Une erreur est survenue lors du marquage des présences en lot.');
        }
    };

    // Fonction pour mettre à jour l'état de la checkbox "Tout sélectionner"
    function updateSelectAllCheckbox() {
        const checkboxes = document.querySelectorAll('.student-checkbox');
        const checkedBoxes = document.querySelectorAll('.student-checkbox:checked');
        
        if (checkboxes.length === 0) {
            headerCheckbox.checked = false;
            headerCheckbox.indeterminate = false;
        } else if (checkedBoxes.length === 0) {
            headerCheckbox.checked = false;
            headerCheckbox.indeterminate = false;
        } else if (checkedBoxes.length === checkboxes.length) {
            headerCheckbox.checked = true;
            headerCheckbox.indeterminate = false;
        } else {
            headerCheckbox.checked = false;
            headerCheckbox.indeterminate = true;
        }
    }

    // écouteurs d'événements pour la recherche
    searchInput.addEventListener('input', (e) => {
        filterStudents(e.target.value);
    });

    // Event Listener pour la checkbox "Tout sélectionner"
    headerCheckbox.addEventListener('change', (e) => {
        const checkboxes = document.querySelectorAll('.student-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = e.target.checked;
        });
        updateSelectAllCheckbox();
    });

    // Event Listener pour les checkboxes des étudiants
    studentsTable.addEventListener('change', (e) => {
        if (e.target.classList.contains('student-checkbox')) {
            updateSelectAllCheckbox();
        }
    });

    // Charge les classes E-learning et Workshop
    async function loadClasses() {
        try {
            const classes = await window.connect.getElearningWorkshopClasses();
            classFilter.innerHTML = '<option value="">Sélectionner une classe</option>';
            
            const uniqueClasses = new Map();
            classes.forEach(session => {
                if (!uniqueClasses.has(session.class_id)) {
                    uniqueClasses.set(session.class_id, session.class_name);
                }
            });

            uniqueClasses.forEach((className, classId) => {
                const option = document.createElement('option');
                option.value = classId;
                option.textContent = className;
                classFilter.appendChild(option);
            });
        } catch (error) {
            console.error('Erreur lors du chargement des classes:', error);
        }
    }

    // Charge les sessions pour une classe
    async function loadSessions(classId) {
        try {
            const sessions = await window.connect.getElearningWorkshopClasses();
            const filteredSessions = sessions.filter(session => session.class_id === parseInt(classId));
            
            sessionFilter.innerHTML = '<option value="">Sélectionner une session</option>';
            filteredSessions.forEach(session => {
                const option = document.createElement('option');
                option.value = session.timetable_id;
                option.textContent = `${session.course_name} - ${session.day_name} ${session.start_time}`;
                sessionFilter.appendChild(option);
            });
        } catch (error) {
            console.error('Erreur lors du chargement des sessions:', error);
        }
    }

    // Charge les étudiants pour une session
    async function loadStudents(timetableId) {
        try {
            currentTimetableId = timetableId;
            const students = await window.connect.getElearningWorkshopStudents(timetableId);
            currentStudents = students;
            filteredStudents = students;
            displayStudents(students);
            updateStats();
        } catch (error) {
            console.error('Erreur lors du chargement des étudiants:', error);
        }
    }

    // Formate le statut pour l'affichage
    function formatStatus(status) {
        const statusMap = {
            'present': 'Présent',
            'absent': 'Absent',
            'late': 'Retard',
            'not_marked': 'Non marqué'
        };
        return statusMap[status] || status;
    }

    // Marque le statut d'un étudiant
    window.markStatus = async (studentId, status) => {
        if (!currentTimetableId) return;
    
        const userId = localStorage.getItem('userId'); // Récupération de l'ID de l'utilisateur
        if (!userId) {
            console.error('Utilisateur non authentifié');
            alert('Veuillez vous reconnecter');
            return;
        }
    
        try {
            const attendanceData = {
                timetable_id: currentTimetableId,
                student_id: studentId,
                status: status,
                marked_by: parseInt(userId),
                marked_at: new Date().toISOString()
            };
    
            await window.connect.markAttendance(attendanceData);
            
            
            const student = currentStudents.find(s => s.student_id === studentId);
            if (student) {
                addHistoryEntry(status, student.student_name, status);
            }
    
            await loadStudents(currentTimetableId);
            updateStats();
        } catch (error) {
            console.error('Erreur lors du marquage de la présence:', error);
        }
    };

    
    classFilter.addEventListener('change', (e) => {
        if (e.target.value) {
            loadSessions(e.target.value);
        } else {
            sessionFilter.innerHTML = '<option value="">Sélectionner une session</option>';
            studentsTable.innerHTML = '';
        }
    });

    sessionFilter.addEventListener('change', (e) => {
        if (e.target.value) {
            loadStudents(e.target.value);
        } else {
            studentsTable.innerHTML = '';
        }
    });

    saveButton.addEventListener('click', async () => {
        if (!currentTimetableId || currentStudents.length === 0) {
            alert('Veuillez sélectionner une session et des étudiants.');
            return;
        }

        try {
            // Recharge les données pour confirmer que tout est à jour
            await loadStudents(currentTimetableId);
            alert('Les présences ont été enregistrées avec succès.');
        } catch (error) {
            console.error('Erreur lors de l\'enregistrement des présences:', error);
            alert('Une erreur est survenue lors de l\'enregistrement des présences.');
        }
    });

    // Fonction pour mettre à jour les statistiques
    function updateStats() {
        const stats = {
            total: currentStudents.length,
            present: currentStudents.filter(s => s.status === 'present').length,
            late: currentStudents.filter(s => s.status === 'late').length,
            absent: currentStudents.filter(s => s.status === 'absent').length
        };

        document.getElementById('totalStudents').textContent = stats.total;
        document.getElementById('presentCount').textContent = stats.present;
        document.getElementById('lateCount').textContent = stats.late;
        document.getElementById('absentCount').textContent = stats.absent;
    }

    // Fonction pour filtrer les étudiants
    function applyFilters() {
        const statusFilter = document.getElementById('statusFilter').value;
        const dateFilter = document.getElementById('dateFilter').value;
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();

        filteredStudents = currentStudents.filter(student => {
            const matchesStatus = !statusFilter || student.status === statusFilter;
            const matchesSearch = student.student_name.toLowerCase().includes(searchTerm) ||
                                student.class_name.toLowerCase().includes(searchTerm);
            
            // Filtre de date
            let matchesDate = true;
            if (dateFilter) {
                const today = new Date();
                const studentDate = new Date(student.marked_at);
                
                switch(dateFilter) {
                    case 'today':
                        matchesDate = isSameDay(today, studentDate);
                        break;
                    case 'week':
                        matchesDate = isThisWeek(studentDate);
                        break;
                    case 'month':
                        matchesDate = isSameMonth(today, studentDate);
                        break;
                }
            }

            return matchesStatus && matchesSearch && matchesDate;
        });

        displayStudents(filteredStudents);
        updateStats();
    }

    // Fonctions utilitaires pour les dates
    function isSameDay(d1, d2) {
        return d1.getFullYear() === d2.getFullYear() &&
               d1.getMonth() === d2.getMonth() &&
               d1.getDate() === d2.getDate();
    }

    function isThisWeek(date) {
        const today = new Date();
        const firstDay = new Date(today.setDate(today.getDate() - today.getDay()));
        const lastDay = new Date(firstDay);
        lastDay.setDate(lastDay.getDate() + 6);
        
        return date >= firstDay && date <= lastDay;
    }

    function isSameMonth(d1, d2) {
        return d1.getFullYear() === d2.getFullYear() &&
               d1.getMonth() === d2.getMonth();
    }

    // Fonction pour ajouter une entrée dans l'historique
    function addHistoryEntry(action, studentName, status) {
        const historyList = document.getElementById('historyList');
        const entry = document.createElement('div');
        entry.className = 'history-item';
        
        const time = new Date().toLocaleTimeString();
        const userName = localStorage.getItem('userName') || 'Coordinateur';
        
        entry.innerHTML = `
            <span class="time">${time}</span>
            <span class="action">
                <span class="user">${userName}</span> a marqué 
                <strong>${studentName}</strong> comme 
                <span class="status-badge status-${status}">${formatStatus(status)}</span>
            </span>
        `;

        historyList.insertBefore(entry, historyList.firstChild);

        // Limite le nombre d'entrées dans l'historique
        if (historyList.children.length > 50) {
            historyList.removeChild(historyList.lastChild);
        }
    }

    // écouteurs d'événements pour les nouveaux filtres
    document.getElementById('statusFilter').addEventListener('change', applyFilters);
    document.getElementById('dateFilter').addEventListener('change', applyFilters);

    // Initialisation
    loadClasses();
}); 
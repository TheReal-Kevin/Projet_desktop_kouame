document.addEventListener('DOMContentLoaded', async () => {
    // récupère le nom et l'ID de l'enseignant depuis le localStorage
    const teacherName = localStorage.getItem('userName');
    const teacherEmail = localStorage.getItem('userEmail');
    
    if (teacherName) {
        document.getElementById('teacher-name').textContent = teacherName;
    }

    try {
        // Récupére l'emploi du temps et les créneaux horaires
        const timetable = await window.connect.getTeacherTimetable(teacherEmail);
        const timeSlots = await window.api.getTimeSlots();
        
        if (timetable && timetable.length > 0) {
            createTimetableGrid(timeSlots, timetable);
            updateStats(timetable);
        } else {
            showNoClassesMessage();
            updateStats([]);
        }
    } catch (error) {
        console.error('Error loading timetable:', error);
        showErrorMessage();
        updateStats([]);
    }
});

function showNoClassesMessage() {
    const timetableGrid = document.getElementById('timetable-grid');
    timetableGrid.innerHTML = `
        <div class="no-classes-message">
            <i class="fas fa-info-circle"></i>
            <p>No classes have been assigned to you yet.</p>
        </div>
    `;
}

function showErrorMessage() {
    const timetableGrid = document.getElementById('timetable-grid');
    timetableGrid.innerHTML = `
        <div class="error-message">
            <i class="fas fa-exclamation-circle"></i>
            <p>An error occurred while loading your timetable. Please try again later.</p>
        </div>
    `;
}

function createTimetableGrid(timeSlots, timetable) {
    const timetableGrid = document.getElementById('timetable-grid');
    timetableGrid.innerHTML = ''; // nettoie le contenu existant

    timeSlots.forEach(timeSlot => {
        const timeSlotCell = document.createElement('div');
        timeSlotCell.className = 'time-slot';
        timeSlotCell.textContent = `${timeSlot.start_time} - ${timeSlot.end_time}`;
        timetableGrid.appendChild(timeSlotCell);

        for (let day = 1; day <= 5; day++) {
            const classCell = document.createElement('div');
            classCell.className = 'class-slot';

            const classEntries = timetable.filter(entry => 
                entry.time_slot_id === timeSlot.id && 
                entry.day_id === day
            );

            if (classEntries.length > 0) {
                const entry = classEntries[0];
                classCell.style.backgroundColor = entry.color || '#e3f2fd';
                
                // Vérifie si le cours est de type e-learning ou workshop
                const isElearningOrWorkshop = entry.course_name.toLowerCase().includes('e-learning') || 
                                            entry.course_name.toLowerCase().includes('workshop');
                
                let attendanceButton = '';
                if (!isElearningOrWorkshop) {
                    attendanceButton = `
                        <button class="attendance-btn">
                            <i class="fas fa-user-check"></i> Take Attendance
                        </button>
                    `;
                }

                classCell.innerHTML = `
                    <div class="class-entry" data-session-id="${entry.id}">
                        <div class="class-name">${entry.course_name}</div>
                        <div class="class-info">
                            <span class="class-group">${entry.class_name}</span>
                        </div>
                        ${attendanceButton}
                    </div>
                `;

                // événement pour ouvrir le formulaire de présence seulement si ce n'est pas un cours e-learning ou workshop
                if (!isElearningOrWorkshop) {
                    const attendanceBtn = classCell.querySelector('.attendance-btn');
                    if (attendanceBtn) {
                        attendanceBtn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            openAttendanceModal(entry);
                        });
                    }
                }
            }

            timetableGrid.appendChild(classCell);
        }
    });
}

// Fonction pour ouvrir la modal de présence
async function openAttendanceModal(sessionData) {
    const modal = document.createElement('div');
    modal.className = 'attendance-modal';
    
    try {
        const students = await window.connect.getCourseStudents(sessionData.id);
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${sessionData.course_name} - ${sessionData.class_name}</h2>
                    <button class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="attendance-form">
                        <div class="students-list">
                            ${students.map(student => `
                                <div class="student-row" data-student-id="${student.user_id}">
                                    <span class="student-name">${student.name}</span>
                                    <div class="attendance-options">
                                        <label class="attendance-label">
                                            <input type="checkbox" 
                                                class="attendance-checkbox" 
                                                name="attendance-${student.user_id}"
                                                data-student-id="${student.user_id}"
                                                data-status="present">
                                            <span class="attendance-btn-custom present">
                                                <i class="fas fa-check"></i> Present
                                            </span>
                                        </label>
                                        <label class="attendance-label">
                                            <input type="checkbox" 
                                                class="attendance-checkbox" 
                                                name="attendance-${student.user_id}"
                                                data-student-id="${student.user_id}"
                                                data-status="absent">
                                            <span class="attendance-btn-custom absent">
                                                <i class="fas fa-times"></i> Absent
                                            </span>
                                        </label>
                                        <label class="attendance-label">
                                            <input type="checkbox" 
                                                class="attendance-checkbox" 
                                                name="attendance-${student.user_id}"
                                                data-student-id="${student.user_id}"
                                                data-status="late">
                                            <span class="attendance-btn-custom late">
                                                <i class="fas fa-clock"></i> Late
                                            </span>
                                        </label>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                        <div class="form-actions">
                            <div class="quick-actions">
                                <button type="button" class="quick-action-btn present" data-status="present">
                                    <i class="fas fa-check-double"></i> Mark All Present
                                </button>
                                <button type="button" class="quick-action-btn absent" data-status="absent">
                                    <i class="fas fa-times"></i> Mark All Absent
                                </button>
                                <button type="button" class="quick-action-btn late" data-status="late">
                                    <i class="fas fa-clock"></i> Mark All Late
                                </button>
                            </div>
                            <button type="submit" class="submit-btn">
                                <i class="fas fa-save"></i> Save Attendance
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Gérer les clics sur les checkboxes
        const checkboxes = modal.querySelectorAll('.attendance-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                const studentId = this.dataset.studentId;
                
                // Décocher les autres options pour le même étudiant
                checkboxes.forEach(cb => {
                    if (cb.dataset.studentId === studentId && cb !== this) {
                        cb.checked = false;
                    }
                });
            });
        });

        // Gérer la fermeture de la modal
        const closeBtn = modal.querySelector('.close-btn');
        closeBtn.addEventListener('click', () => {
            modal.remove();
        });

        // Gérer les boutons "Mark All"
        const quickActionBtns = modal.querySelectorAll('.quick-action-btn');
        quickActionBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const status = btn.dataset.status;
                students.forEach(student => {
                    // Décocher toutes les options
                    const studentCheckboxes = modal.querySelectorAll(`input[data-student-id="${student.user_id}"]`);
                    studentCheckboxes.forEach(cb => {
                        cb.checked = cb.dataset.status === status;
                    });
                });
            });
        });

        // Gérer la soumission du formulaire
        const form = modal.querySelector('#attendance-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const userId = parseInt(localStorage.getItem('userId'));
            if (!userId || isNaN(userId)) {
                showNotification('User ID not found. Please log in again.', 'error');
                return;
            }

            const now = new Date().toISOString();
            const attendanceData = students.map(student => {
                const checkedBox = Array.from(checkboxes)
                    .find(cb => cb.dataset.studentId === student.user_id.toString() && cb.checked);
                
                return {
                    timetable_id: sessionData.id,
                    student_id: student.user_id,
                    status: checkedBox ? checkedBox.dataset.status : 'absent',
                    marked_by: userId,
                    marked_at: now
                };
            });

            try {
                // Enregistrer les présences
                for (const data of attendanceData) {
                    await window.connect.markAttendance(data);
                }
                
                showNotification('Attendance saved successfully', 'success');
                modal.remove();
            } catch (error) {
                showNotification('Error saving attendance: ' + error.message, 'error');
                console.error('Error:', error);
            }
        });

    } catch (error) {
        console.error('Error loading students:', error);
        showNotification('Error loading students', 'error');
    }
}

// Fonction pour afficher les notifications
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function animateNumber(element, finalNumber) {
    const duration = 1000; // Durée de l'animation en millisecondes
    const steps = 60; // Nombre d'étapes de l'animation
    const stepDuration = duration / steps;
    let currentNumber = 0;
    
    const increment = finalNumber / steps;
    
    const timer = setInterval(() => {
        currentNumber += increment;
        if (currentNumber >= finalNumber) {
            clearInterval(timer);
            element.textContent = finalNumber;
        } else {
            element.textContent = Math.floor(currentNumber);
        }
    }, stepDuration);
}

function updateStats(timetable) {
    if (!timetable) return;

    const totalCourses = timetable.length;
    const uniqueClasses = new Set(timetable.map(entry => entry.class_id)).size;
    
    // Calculate total weekly hours
    const weeklyHours = timetable.reduce((total, entry) => {
        // Assuming each session is 1 hour, adjust if your time slots have different durations
        return total + 1;
    }, 0);

    const coursesElement = document.getElementById('total-courses');
    const classesElement = document.getElementById('total-classes');
    const weeklyHoursElement = document.getElementById('weekly-hours');

    animateNumber(coursesElement, totalCourses);
    animateNumber(classesElement, uniqueClasses);
    animateNumber(weeklyHoursElement, weeklyHours);
}

// Gestionnaire pour la déconnexion
document.querySelector('.logout-btn').addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.clear();
    window.connect.navigateTo('index');
});

// Gestionnaire pour la navigation dans la barre latérale
document.querySelectorAll('.sidebar-nav li').forEach(item => {
    item.addEventListener('click', () => {
        const page = item.dataset.page;
        window.connect.navigateTo(`teacher-${page}`);
    });
}); 
document.addEventListener('DOMContentLoaded', async () => {
    // affiche le nom de l'étudiant
    const studentName = localStorage.getItem('userName');
    const userEmail = localStorage.getItem('userEmail');
    
    if (studentName) {
        document.getElementById('student-name').textContent = studentName;
    }

    // récupère et affiche l'emploi du temps
    try {
        // récupère d'abord la classe de l'étudiant
        const studentClass = await window.api.getStudentClass(userEmail);
        console.log('Classe de l\'étudiant:', studentClass);

        if (!studentClass) {
            console.error('Classe de l\'étudiant non trouvée');
            return;
        }

        // récupère l'emploi du temps complet
        const timetableData = await window.api.getTimetable();
        console.log('Emploi du temps complet:', timetableData);

        if (!timetableData) {
            console.error('Aucun emploi du temps trouvé');
            return;
        }

        // filtre l'emploi du temps pour ne montrer que les cours de la classe de l'étudiant
        const studentTimetable = timetableData.filter(entry => 
            parseInt(entry.class_id) === parseInt(studentClass)
        );
        console.log('Emploi du temps filtré:', studentTimetable);

        // affiche le nom de la classe
        if (studentTimetable.length > 0) {
            const className = studentTimetable[0].class_name;
            document.getElementById('student-class-name').textContent = className;
        }

        // crée la grille des créneaux horaires
        const timeSlots = await window.api.getTimeSlots();
        const timetableGrid = document.getElementById('timetable-grid');
        
        // génère les cellules de l'emploi du temps
        timeSlots.forEach(timeSlot => {
            // ajoute la cellule du créneau horaire
            const timeCell = document.createElement('div');
            timeCell.className = 'time-slot';
            timeCell.textContent = `${timeSlot.start_time} - ${timeSlot.end_time}`;
            timetableGrid.appendChild(timeCell);

            // ajoute les cellules pour chaque jour
            for (let day = 1; day <= 5; day++) {
                const cell = document.createElement('div');
                cell.className = 'course-cell empty-cell';

                // trouve le cours pour ce créneau et ce jour
                const course = studentTimetable.find(entry => 
                    entry.time_slot_id === timeSlot.id && 
                    entry.day_id === day
                );

                if (course) {
                    cell.className = 'course-cell';
                    cell.style.backgroundColor = course.color || '#f0f0f0';
                    
                    cell.innerHTML = `
                        <div class="course-name">
                            <i class="fas fa-book"></i> ${course.course_name}
                        </div>
                        <div class="course-teacher">
                            <i class="fas fa-chalkboard-teacher"></i> ${course.teacher_name}
                        </div>
                    `;
                }

                timetableGrid.appendChild(cell);
            }
        });

    } catch (error) {
        console.error('Erreur lors du chargement de l\'emploi du temps:', error);
        // affiche un message d'erreur à l'utilisateur
        const timetableGrid = document.getElementById('timetable-grid');
        timetableGrid.innerHTML = `
            <div class="error-message">
                Unable to load timetable. Please try again later.
            </div>
        `;
    }
}); 
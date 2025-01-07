document.addEventListener('DOMContentLoaded', () => {
    // Fonction pour charger les options dans un élément <select>
    function loadOptions(selectElement, data, valueKey, textKey) {
        // Vider d'abord le select sauf la première option (si elle existe)
        const firstOption = selectElement.firstElementChild;
        selectElement.innerHTML = '';
        if (firstOption) {
            selectElement.appendChild(firstOption);
        }

        data.forEach(item => {
            const option = document.createElement('option');
            option.value = item[valueKey];

            if (textKey === 'start_time') {
                // Format spécial pour les créneaux horaires
                option.textContent = `${item.start_time} - ${item.end_time}`;
            } else if (textKey === 'name' && item.user_id) {
                // format spécial pour les enseignants
                option.textContent = `${item.name} (User ID: ${item.user_id})`;
                // stocke les informations supplémentaires comme attributs de données
                option.dataset.userId = item.user_id;
                option.dataset.createdAt = item.created_at;
                option.dataset.updatedAt = item.updated_at;
            } else {
                const text = textKey.split('.').reduce((obj, key) => obj ? obj[key] : null, item);
                option.textContent = text || 'N/A';
            }
            
            selectElement.appendChild(option);
        });
    }

    // Charger les classes
    window.api.getClasses().then(classes => {
        console.log('Classes received:', classes);
        const classSelectCreate = document.getElementById('class-name');
        const classSelectEdit = document.getElementById('edit-class');
        loadOptions(classSelectCreate, classes, 'id', 'name');
        loadOptions(classSelectEdit, classes, 'id', 'name');
    }).catch(error => console.error('Error loading classes:', error));

    // Charger les cours
    window.api.getCourses().then(courses => {
        console.log('Courses received:', courses);
        const courseSelectCreate = document.getElementById('course');
        const courseSelectEdit = document.getElementById('edit-course');
        loadOptions(courseSelectCreate, courses, 'id', 'name');
        loadOptions(courseSelectEdit, courses, 'id', 'name');
    }).catch(error => console.error('Error loading courses:', error));

    // Charger les jours
    window.api.getDays().then(days => {
        console.log('Days received:', days);
        const daySelectCreate = document.getElementById('day');
        const daySelectEdit = document.getElementById('edit-day');
        loadOptions(daySelectCreate, days, 'id', 'name');
        loadOptions(daySelectEdit, days, 'id', 'name');
    }).catch(error => console.error('Error loading days:', error));

    // Charger les créneaux horaires
    window.api.getTimeSlots().then(timeSlots => {
        console.log('Time slots received:', timeSlots);
        const timeSelectCreate = document.getElementById('time');
        const timeSelectEdit = document.getElementById('edit-time');
        loadOptions(timeSelectCreate, timeSlots, 'id', 'start_time', 'end_time');
        loadOptions(timeSelectEdit, timeSlots, 'id', 'start_time', 'end_time');
    }).catch(error => console.error('Error loading time slots:', error));

    // Charger les enseignants
    window.api.getTeachers().then(teachers => {
        console.log('Teachers received:', teachers);
        const teacherSelectCreate = document.getElementById('teacher');
        const teacherSelectEdit = document.getElementById('edit-teacher');
        
        // option par défaut pour le select
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Select a teacher';
        defaultOption.disabled = true;
        defaultOption.selected = true;
        teacherSelectCreate.appendChild(defaultOption);
        
        const defaultOptionEdit = defaultOption.cloneNode(true);
        teacherSelectEdit.appendChild(defaultOptionEdit);
        
        // utilise l'ID de la table teachers comme valeur
        loadOptions(teacherSelectCreate, teachers, 'id', 'name');
        loadOptions(teacherSelectEdit, teachers, 'id', 'name');
    }).catch(error => console.error('Error loading teachers:', error));

    // Fonction pour mettre à jour la prévisualisation de la couleur
    function updateColorPreview(inputElement, previewElement) {
        inputElement.addEventListener('input', () => {
            previewElement.style.backgroundColor = inputElement.value;
        });
    }

    // Prévisualisation de la couleur pour le formulaire de création
    const colorInputCreate = document.getElementById('color');
    const colorPreviewCreate = colorInputCreate.nextElementSibling;
    updateColorPreview(colorInputCreate, colorPreviewCreate);

    // Prévisualisation de la couleur pour le formulaire d'édition
    const colorInputEdit = document.getElementById('edit-color');
    const colorPreviewEdit = colorInputEdit.nextElementSibling;
    updateColorPreview(colorInputEdit, colorPreviewEdit);

    // Fonction pour afficher l'emploi du temps
    async function displayTimetable() {
        try {
            const timetable = await window.api.getTimetable();
            const timetableBody = document.getElementById('timetable-body');
            timetableBody.innerHTML = '';

            // Grouper par créneau horaire
            const timeSlotGroups = {};
            timetable.forEach(entry => {
                const timeKey = `${entry.start_time}-${entry.end_time}`;
                if (!timeSlotGroups[timeKey]) {
                    timeSlotGroups[timeKey] = {
                        timeSlot: { start: entry.start_time, end: entry.end_time },
                        days: {}
                    };
                }
                if (!timeSlotGroups[timeKey].days[entry.day_id]) {
                    timeSlotGroups[timeKey].days[entry.day_id] = [];
                }
                timeSlotGroups[timeKey].days[entry.day_id].push(entry);
            });

            // crée les lignes du tableau
            Object.entries(timeSlotGroups).forEach(([timeKey, data]) => {
                const row = document.createElement('tr');
                
                // cellule de l'heure
                const timeCell = document.createElement('td');
                timeCell.textContent = `${data.timeSlot.start} - ${data.timeSlot.end}`;
                row.appendChild(timeCell);

                // cellules pour chaque jour (1 à 5 pour lundi à vendredi)
                for (let dayId = 1; dayId <= 5; dayId++) {
                    const dayCell = document.createElement('td');
                    const entries = data.days[dayId] || [];
                    
                    entries.forEach(entry => {
                        const courseDiv = document.createElement('div');
                        courseDiv.className = 'course-entry';
                        courseDiv.style.backgroundColor = entry.color;
                        
                        // ajoute les boutons d'action
                        const actionsDiv = document.createElement('div');
                        actionsDiv.className = 'course-actions';
                        
                        const editBtn = document.createElement('button');
                        editBtn.className = 'btn-edit-course';
                        editBtn.innerHTML = '<i class="fas fa-edit"></i>';
                        editBtn.onclick = (e) => {
                            e.stopPropagation();
                            editCourse(entry);
                        };
                        
                        const deleteBtn = document.createElement('button');
                        deleteBtn.className = 'btn-delete-course';
                        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
                        deleteBtn.onclick = async (e) => {
                            e.stopPropagation();
                            if (confirm('Are you sure you want to delete this course?')) {
                                try {
                                    await window.api.deleteTimetable(entry.id);
                                    await displayTimetable(); // Rafraîchir l'affichage
                                } catch (error) {
                                    console.error('Error deleting timetable entry:', error);
                                    alert('Error deleting the course');
                                }
                            }
                        };
                        
                        actionsDiv.appendChild(editBtn);
                        actionsDiv.appendChild(deleteBtn);
                        
                        courseDiv.innerHTML = `
                            <div class="course-content">
                                <div class="course-header">
                                    <i class="fas fa-book"></i>
                                    <strong>${entry.course_name}</strong>
                                </div>
                                <div class="course-info">
                                    <div class="info-item">
                                        <i class="fas fa-school"></i>
                                        <span>${entry.class_name}</span>
                                    </div>
                                    <div class="info-item">
                                        <i class="fas fa-chalkboard-teacher"></i>
                                        <span>${entry.teacher_name}</span>
                                    </div>
                                </div>
                            </div>
                        `;
                        
                        courseDiv.appendChild(actionsDiv);
                        dayCell.appendChild(courseDiv);
                    });
                    
                    row.appendChild(dayCell);
                }

                timetableBody.appendChild(row);
            });
        } catch (error) {
            console.error('Error displaying timetable:', error);
        }
    }

    // appele la fonction au chargement de la page
    displayTimetable();

    // creation de l'emploi du temps
    document.getElementById('add-class-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const classId = document.getElementById('class-name').value;
        const courseId = document.getElementById('course').value;
        const dayId = document.getElementById('day').value;
        const timeSlotId = document.getElementById('time').value;
        const teacherId = document.getElementById('teacher').value;
        const color = document.getElementById('color').value;

        try {
            const result = await window.api.createTimetable(classId, courseId, dayId, timeSlotId, teacherId, color);
            console.log('Timetable created:', result);
            alert('Timetable entry created successfully!');
            
            // Réinitialiser le formulaire
            const form = event.target;
            form.reset();
            document.getElementById('color').value = '#3498db';
            const colorPreview = document.getElementById('color').nextElementSibling;
            colorPreview.style.backgroundColor = '#3498db';
            
            // Rafraîchir l'affichage de l'emploi du temps
            await displayTimetable();
        } catch (error) {
            console.error('Error creating timetable:', error);
            alert(error.message || 'This time slot is already occupied for this class. Please choose another time slot.');
        }
    });

    // edition de l'emploi du temps
    document.getElementById('edit-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const timetableId = document.getElementById('edit-id').value;
        const classId = document.getElementById('edit-class').value;
        const courseId = document.getElementById('edit-course').value;
        const dayId = document.getElementById('edit-day').value;
        const timeSlotId = document.getElementById('edit-time').value;
        const teacherId = document.getElementById('edit-teacher').value;
        const color = document.getElementById('edit-color').value;

        try {
            const result = await window.api.updateTimetable(timetableId, classId, courseId, dayId, timeSlotId, teacherId, color);
            console.log('Timetable updated:', result);
            
            // affiche l'alerte de succès
            alert('Timetable updated successfully!');
            
            // Cacher le formulaire d'édition
            document.getElementById('edit-class-form').style.display = 'none';
            
            // Réinitialiser le formulaire
            event.target.reset();
            
            // Rafraîchir l'affichage de l'emploi du temps
            await displayTimetable();
        } catch (error) {
            console.error('Error updating timetable:', error);
            alert('Error updating timetable. Please try again.');
        }
    });

    // Fonction pour éditer un cours
    function editCourse(entry) {
        // Remplir le formulaire d'édition avec les données du cours
        document.getElementById('edit-id').value = entry.id;
        document.getElementById('edit-class').value = entry.class_id;
        document.getElementById('edit-course').value = entry.course_id;
        document.getElementById('edit-day').value = entry.day_id;
        document.getElementById('edit-time').value = entry.time_slot_id;
        document.getElementById('edit-teacher').value = entry.teacher_id;
        document.getElementById('edit-color').value = entry.color;
        
        // Met à jour la prévisualisation de la couleur
        const colorPreview = document.getElementById('edit-color').nextElementSibling;
        colorPreview.style.backgroundColor = entry.color;
        
        // affiche le formulaire d'édition
        document.getElementById('edit-class-form').style.display = 'block';
        
        // Fait défiler jusqu'au formulaire
        document.getElementById('edit-class-form').scrollIntoView({ behavior: 'smooth' });
    }
});

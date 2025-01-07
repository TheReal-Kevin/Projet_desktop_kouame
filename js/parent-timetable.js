
document.addEventListener('DOMContentLoaded', async () => {
    const userName = localStorage.getItem('userName');
    const userId = localStorage.getItem('userId');
    const parentNameElement = document.getElementById('parent-name');
    const timetableContainer = document.getElementById('timetable-container');

    if (userName) {
        parentNameElement.textContent = userName;
    }

    try {
        if (!userId) {
            throw new Error('User ID not found in localStorage');
        }

        console.log('Loading students with timetables for parent:', userId);
        const studentsWithTimetables = await window.connect.getParentStudentsWithTimetable(userId);
        console.log('Students with timetables loaded:', studentsWithTimetables);

        if (!studentsWithTimetables || studentsWithTimetables.length === 0) {
            timetableContainer.innerHTML = `
                <div class="no-data-message">
                    <i class="fas fa-user-graduate"></i>
                    <p>No students assigned to this parent</p>
                </div>
            `;
            return;
        }

        // Affiche les emplois du temps de tous les étudiants
        timetableContainer.innerHTML = studentsWithTimetables.map(student => `
            <div class="student-timetable-section">
                <h2 class="student-name">
                    <i class="fas fa-user-graduate"></i>
                    ${student.name}'s Timetable
                </h2>
                <div class="timetable-wrapper">
                    <table class="timetable">
                        <thead>
                            <tr>
                                <th>Time</th>
                                <th>Monday</th>
                                <th>Tuesday</th>
                                <th>Wednesday</th>
                                <th>Thursday</th>
                                <th>Friday</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${generateTimetableHTML(student.timetable)}
                        </tbody>
                    </table>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error loading students with timetables:', error);
        timetableContainer.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <p>Error loading timetables: ${error.message}</p>
            </div>
        `;
    }
});

function generateTimetableHTML(timetable) {
    const timeSlots = organizeTimetable(timetable);
    let html = '';

    timeSlots.forEach(timeSlot => {
        html += '<tr>';
        html += `<td>${timeSlot.startTime} - ${timeSlot.endTime}</td>`;

        for (let day = 1; day <= 5; day++) {
            const course = timeSlot.days[day];
            if (course) {
                html += `
                    <td>
                        <div class="course-block" style="background-color: ${course.color}20">
                            <div class="course-name">${course.courseName}</div>
                            <div class="teacher-name">${course.teacherName}</div>
                        </div>
                    </td>
                `;
            } else {
                html += '<td></td>';
            }
        }
        html += '</tr>';
    });

    return html;
}

function organizeTimetable(timetable) {
    //  stocker les créneaux horaires
    const timeSlotMap = new Map();

    // Organise les cours par créneau horaire et jour
    timetable.forEach(entry => {
        const timeKey = `${entry.start_time}-${entry.end_time}`;
        
        if (!timeSlotMap.has(timeKey)) {
            timeSlotMap.set(timeKey, {
                startTime: entry.start_time,
                endTime: entry.end_time,
                days: {}
            });
        }

        // Ajoute le cours au jour correspondant
        timeSlotMap.get(timeKey).days[entry.day_id] = {
            courseName: entry.course_name,
            teacherName: entry.teacher_name,
            color: entry.color
        };
    });

    // Convertir la Map en tableau trié par heure de début
    return Array.from(timeSlotMap.values()).sort((a, b) => {
        return a.startTime.localeCompare(b.startTime);
    });
}
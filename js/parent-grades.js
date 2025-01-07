document.addEventListener('DOMContentLoaded', async () => {
    const parentEmail = localStorage.getItem('userEmail');
    console.log('Parent email from localStorage:', parentEmail);
    
    window.allGrades = [];
    let selectedStudentId = null;

    try {
        if (!window.connect.getUserId) {
            throw new Error('La fonction getUserId n\'est pas disponible');
        }
        // Récupére d'abord l'ID du parent
        const parentId = await window.connect.getUserId(parentEmail);
        console.log('Parent ID:', parentId);
        
        if (!parentId) {
            throw new Error('Impossible de récupérer l\'ID du parent');
        }
        
        // Récupére les étudiants avec l'ID du parent
        const students = await window.connect.getParentStudents(parentId);
        console.log('Students found:', students);

        if (!students || students.length === 0) {
            showError('Aucun élève assigné à ce compte parent.');
            return;
        }

        // Remplit le sélecteur d'élèves
        populateStudentSelect(students);

        // Ajoute l'écouteur d'événements pour le changement d'élève
        const studentSelect = document.getElementById('studentSelect');
        studentSelect.addEventListener('change', async () => {
            selectedStudentId = studentSelect.value;
            if (selectedStudentId) {
                await loadStudentGrades(selectedStudentId);
            } else {
                clearGradesDisplay();
            }
        });

        // Configure les écouteurs pour les filtres
        setupFilterListeners();

    } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
        showError(`Erreur: ${error.message}`);
    }
});

function populateStudentSelect(students) {
    const select = document.getElementById('studentSelect');
    select.innerHTML = '<option value="">Sélectionner un élève</option>';
    
    students.forEach(student => {
        const option = document.createElement('option');
        option.value = student.id;
        option.textContent = student.name;
        select.appendChild(option);
    });
}

async function loadStudentGrades(studentId) {
    try {
        window.allGrades = await window.connect.getStudentGrades(studentId);
        console.log('Grades loaded:', window.allGrades);

        if (!window.allGrades || window.allGrades.length === 0) {
            showError('Aucune note disponible pour cet élève.');
            return;
        }

        populateYearFilter(window.allGrades);
        displayGrades(window.allGrades);
        updateSummary(window.allGrades);

    } catch (error) {
        console.error('Erreur lors du chargement des notes:', error);
        showError(`Impossible de charger les notes: ${error.message}`);
    }
}

// pour réutiliser les fonctions de student-grades.js
function populateYearFilter(grades) {
    const yearFilter = document.getElementById('yearFilter');
    const years = [...new Set(grades.map(grade => grade.academic_year))];
    
    yearFilter.innerHTML = '<option value="">Toutes les années</option>';
    years.sort((a, b) => b - a);
    years.forEach(year => {
        const option = document.createElement('option');
        option.value = year.toString();
        option.textContent = `Année ${year}`;
        yearFilter.appendChild(option);
    });
}

function displayGrades(grades) {
    const tbody = document.querySelector('#gradesTable tbody');
    tbody.innerHTML = '';
    
    grades.forEach(grade => {
        const row = document.createElement('tr');
        const gradeClass = getGradeClass(grade.grade);
        
        row.innerHTML = `
            <td>${grade.course_name}</td>
            <td><span class="grade-badge ${gradeClass}">${grade.grade}/20</span></td>
            <td>${grade.total_sessions}</td>
            <td>${grade.attended_sessions}</td>
            <td>${grade.attendance_rate}%</td>
            <td>Semestre ${grade.semester}</td>
            <td>${grade.academic_year}</td>
        `;
        
        tbody.appendChild(row);
    });
}

function updateSummary(grades) {
    const averageGrade = grades.reduce((sum, grade) => sum + grade.grade, 0) / grades.length;
    const averageAttendance = grades.reduce((sum, grade) => sum + grade.attendance_rate, 0) / grades.length;
    
    document.getElementById('averageGrade').textContent = `${averageGrade.toFixed(2)}/20`;
    document.getElementById('globalAttendance').textContent = `${averageAttendance.toFixed(2)}%`;
}

function getGradeClass(grade) {
    if (grade >= 16) return 'grade-excellent';
    if (grade >= 14) return 'grade-good';
    if (grade >= 12) return 'grade-average';
    return 'grade-poor';
}

function setupFilterListeners() {
    const yearFilter = document.getElementById('yearFilter');
    const semesterFilter = document.getElementById('semesterFilter');
    
    yearFilter.value = '';
    semesterFilter.value = '';
    
    yearFilter.addEventListener('change', filterGrades);
    semesterFilter.addEventListener('change', filterGrades);
}

function filterGrades() {
    const yearFilter = document.getElementById('yearFilter');
    const semesterFilter = document.getElementById('semesterFilter');
    
    let filteredGrades = [...window.allGrades];
    
    if (yearFilter.value) {
        filteredGrades = filteredGrades.filter(grade => 
            grade.academic_year.toString() === yearFilter.value);
    }
    
    if (semesterFilter.value) {
        filteredGrades = filteredGrades.filter(grade => 
            grade.semester.toString() === semesterFilter.value);
    }
    
    displayGrades(filteredGrades);
    updateSummary(filteredGrades);
}

function clearGradesDisplay() {
    document.querySelector('#gradesTable tbody').innerHTML = '';
    document.getElementById('averageGrade').textContent = '-';
    document.getElementById('globalAttendance').textContent = '-';
    document.getElementById('yearFilter').innerHTML = '<option value="">Toutes les années</option>';
    document.getElementById('semesterFilter').value = '';
}

function showError(message) {
    const container = document.querySelector('.container');
    const error = document.createElement('div');
    error.className = 'error-message';
    error.style.backgroundColor = '#fce8e6';
    error.style.color = '#d93025';
    error.style.padding = '1rem';
    error.style.borderRadius = '8px';
    error.style.marginBottom = '1rem';
    error.textContent = message;
    container.insertBefore(error, container.firstChild);
} 
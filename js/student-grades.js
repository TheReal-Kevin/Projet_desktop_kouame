document.addEventListener('DOMContentLoaded', async () => {
    const userEmail = localStorage.getItem('userEmail');
    console.log('User email from localStorage:', userEmail);
    console.log('Window connect methods:', Object.keys(window.connect));

    window.allGrades = []; // Stockage global des notes pour le filtrage

    try {
        console.log('Fetching grades for:', userEmail);
        if (!window.connect.getStudentGrades) {
            throw new Error('getStudentGrades function not found in window.connect');
        }
        window.allGrades = await window.connect.getStudentGrades(userEmail);
        console.log('Received grades:', window.allGrades);

        if (!window.allGrades || window.allGrades.length === 0) {
            showError('Aucune note disponible pour le moment.');
            return;
        }
        
        // Remplit les filtres d'années
        populateYearFilter(window.allGrades);
        
        // Affiche les notes
        displayGrades(window.allGrades);
        updateSummary(window.allGrades);
        
        // Ajoute les écouteurs d'événements pour les filtres
        setupFilterListeners();
        
    } catch (error) {
        console.error('Erreur lors du chargement des notes:', error);
        showError(`Impossible de charger les notes: ${error.message}`);
    }
});

function populateYearFilter(grades) {
    const yearFilter = document.getElementById('yearFilter');
    const years = [...new Set(grades.map(grade => grade.academic_year))];
    
    yearFilter.innerHTML = '<option value="">Toutes les années</option>';
    years.sort((a, b) => b - a); // Trier les années par ordre décroissant
    years.forEach(year => {
        const option = document.createElement('option');
        option.value = year.toString(); // Convertir en string
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
    
    // Réinitialiser les filtres
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
    
    console.log('Filtering with year:', yearFilter.value, 'semester:', semesterFilter.value);
    console.log('Filtered grades:', filteredGrades);
    
    displayGrades(filteredGrades);
    updateSummary(filteredGrades);
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
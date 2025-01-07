document.addEventListener('DOMContentLoaded', () => {
    // Récupérer l'ID du parent depuis localStorage
    const parentId = localStorage.getItem('userId');
    if (parentId) {
        loadStudentsAbsences(parentId);
    } else {
        console.error('Aucun parent connecté');
    }
});

// Fonction pour charger les absences de tous les étudiants du parent
async function loadStudentsAbsences(parentId) {
    try {
        // Récupérer la liste des étudiants du parent
        const students = await window.connect.getParentStudents(parentId);
        const container = document.querySelector('.students-container');
        const template = document.getElementById('student-template');

        // Pour chaque étudiant
        for (const student of students) {
            // Créer une section pour l'étudiant
            const studentSection = template.content.cloneNode(true);
            
            // Définir le nom de l'étudiant
            studentSection.querySelector('.student-name').textContent = student.name;
            
            // Récupérer les absences de l'étudiant
            const absences = await window.connect.getStudentAbsences(student.id);
            
            // Séparer les absences justifiées et non justifiées
            const justifiedAbsences = absences.filter(absence => absence.justification_id);
            const unjustifiedAbsences = absences.filter(absence => !absence.justification_id);
            
            // Mettre à jour les compteurs
            studentSection.querySelector('.justified-count').textContent = justifiedAbsences.length;
            studentSection.querySelector('.unjustified-count').textContent = unjustifiedAbsences.length;
            
            // Ajouter les événements pour les menus déroulants
            const dropdownHeaders = studentSection.querySelectorAll('.dropdown-header');
            dropdownHeaders.forEach(header => {
                header.addEventListener('click', () => {
                    const content = header.nextElementSibling;
                    content.classList.toggle('active');
                    const arrow = header.querySelector('.fa-chevron-down');
                    arrow.style.transform = content.classList.contains('active') ? 'rotate(180deg)' : 'rotate(0deg)';
                });
            });
            
            // Afficher les absences
            displayAbsences(studentSection.querySelector('.justified-absences'), justifiedAbsences);
            displayAbsences(studentSection.querySelector('.unjustified-absences'), unjustifiedAbsences);
            
            // Ajouter la section au conteneur
            container.appendChild(studentSection);
        }
    } catch (error) {
        console.error('Erreur lors du chargement des absences:', error);
    }
}

// Fonction pour afficher les absences dans une section
function displayAbsences(container, absences) {
    if (absences.length === 0) {
        container.innerHTML = `
            <div class="no-absences">
                Aucune absence à afficher
            </div>
        `;
        return;
    }
    
    absences.forEach(absence => {
        const date = new Date(absence.marked_at);
        const formattedDate = date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const absenceElement = document.createElement('div');
        absenceElement.className = 'absence-item';
        absenceElement.innerHTML = `
            <div class="absence-details">
                <div class="absence-course">${absence.course_name}</div>
                <div class="absence-date">${formattedDate}</div>
                ${absence.justification_id ? `
                    <div class="absence-reason">
                        <strong>Raison:</strong> ${absence.reason}
                    </div>
                ` : ''}
            </div>
            <div class="badge ${absence.justification_id ? 'badge-justified' : 'badge-unjustified'}">
                ${absence.justification_id ? 'Justifiée' : 'Non justifiée'}
            </div>
        `;
        
        container.appendChild(absenceElement);
    });
} 
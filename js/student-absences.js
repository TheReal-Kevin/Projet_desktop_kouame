document.addEventListener('DOMContentLoaded', () => {
    // Récupérer l'ID de l'utilisateur directement depuis localStorage
    const userId = localStorage.getItem('userId');
    if (userId) {
        loadAbsences(userId);
    } else {
        console.error('Aucun utilisateur connecté');
    }
});

// Fonction pour charger les absences
async function loadAbsences(userId) {
    try {
        // Récupérer toutes les absences de l'étudiant
        const absences = await window.connect.getStudentAbsences(userId);
        
        // Séparer les absences justifiées et non justifiées
        const justifiedAbsences = absences.filter(absence => absence.justification_id);
        const unjustifiedAbsences = absences.filter(absence => !absence.justification_id);
        
        // Mettre à jour les compteurs
        document.getElementById('justified-count').textContent = justifiedAbsences.length;
        document.getElementById('unjustified-count').textContent = unjustifiedAbsences.length;
        
        // Afficher les absences dans leurs sections respectives
        displayAbsences('justified-absences', justifiedAbsences);
        displayAbsences('unjustified-absences', unjustifiedAbsences);
    } catch (error) {
        console.error('Erreur lors du chargement des absences:', error);
    }
}

// Fonction pour afficher les absences dans une section
function displayAbsences(containerId, absences) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
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
            <div class="badge ${containerId === 'justified-absences' ? 'badge-justified' : 'badge-unjustified'}">
                ${containerId === 'justified-absences' ? 'Justifiée' : 'Non justifiée'}
            </div>
        `;
        
        container.appendChild(absenceElement);
    });
}

// Fonction pour gérer l'ouverture/fermeture des menus déroulants
function toggleDropdown(type) {
    const content = document.getElementById(`${type}-absences`);
    const allContents = document.querySelectorAll('.dropdown-content');
    
    // Fermer tous les autres menus déroulants
    allContents.forEach(element => {
        if (element.id !== `${type}-absences`) {
            element.classList.remove('active');
        }
    });
    
    // Basculer l'état du menu cliqué
    content.classList.toggle('active');
    
    // Mettre à jour l'icône de la flèche
    const header = content.previousElementSibling;
    const arrow = header.querySelector('.fas.fa-chevron-down');
    arrow.style.transform = content.classList.contains('active') ? 'rotate(180deg)' : 'rotate(0deg)';
} 
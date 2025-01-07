document.addEventListener('DOMContentLoaded', () => {
    // Éléments du DOM
    const studentSearch = document.getElementById('studentSearch');
    const absencesTable = document.getElementById('absencesTable').getElementsByTagName('tbody')[0];
    const modal = document.getElementById('justificationModal');
    const closeBtn = document.getElementsByClassName('close')[0];
    const justificationForm = document.getElementById('justificationForm');
    const courseTypeFilter = document.getElementById('courseTypeFilter');
    const classFilter = document.getElementById('classFilter');
    const dateFilter = document.getElementById('dateFilter');

    let currentAbsences = [];

    // Fonction pour charger les classes
    async function loadClasses() {
        try {
            const classes = await window.connect.getAllClasses();
            classFilter.innerHTML = '<option value="">Toutes les classes</option>';
            classes.forEach(classe => {
                const option = document.createElement('option');
                option.value = classe.name;
                option.textContent = classe.name;
                classFilter.appendChild(option);
            });
        } catch (error) {
            console.error('Erreur lors du chargement des classes:', error);
        }
    }

    // Fonction pour charger toutes les absences
    async function loadAllAbsences() {
        try {
            console.log('Chargement des absences...');
            const absences = await window.connect.getAllAbsentStudents();
            console.log('Absences reçues:', absences);
            currentAbsences = absences;
            applyFilters();
            updateStats();
        } catch (error) {
            console.error('Erreur lors du chargement des absences:', error);
        }
    }

    // Fonction pour mettre à jour les statistiques
    function updateStats() {
        console.log('Mise à jour des statistiques...');
        console.log('Absences actuelles:', currentAbsences);
        
        const totalAbsences = currentAbsences.length;
        const justifiedAbsences = currentAbsences.filter(a => a.justification_id).length;
        const pendingAbsences = totalAbsences - justifiedAbsences;

        console.log('Stats calculées:', {
            total: totalAbsences,
            justified: justifiedAbsences,
            pending: pendingAbsences
        });

        document.getElementById('totalAbsences').textContent = totalAbsences;
        document.getElementById('justifiedCount').textContent = justifiedAbsences;
        document.getElementById('pendingCount').textContent = pendingAbsences;
    }

    // Fonction pour déterminer le type de cours
    function getCourseType(courseName) {
        courseName = courseName.toLowerCase();
        if (courseName.includes('e-learning')) return 'elearning';
        if (courseName.includes('workshop')) return 'workshop';
        return 'other';
    }

    // Fonction pour filtrer les absences
    function applyFilters() {
        const searchTerm = studentSearch.value.toLowerCase();
        const courseType = courseTypeFilter.value;
        const classValue = classFilter.value;
        const dateValue = dateFilter.value;

        let filteredAbsences = [...currentAbsences];

        // Filtre par recherche
        if (searchTerm) {
            filteredAbsences = filteredAbsences.filter(absence =>
                absence.student_name.toLowerCase().includes(searchTerm)
            );
        }

        // Filtre par type de cours
        if (courseType) {
            filteredAbsences = filteredAbsences.filter(absence =>
                getCourseType(absence.course_name) === courseType
            );
        }

        // Filtre par classe
        if (classValue) {
            filteredAbsences = filteredAbsences.filter(absence =>
                absence.class_name === classValue
            );
        }

        // Filtre par date
        if (dateValue) {
            const today = new Date();
            const absenceDate = new Date();
            filteredAbsences = filteredAbsences.filter(absence => {
                const absenceDate = new Date(absence.marked_at);
                switch (dateValue) {
                    case 'today':
                        return absenceDate.toDateString() === today.toDateString();
                    case 'week':
                        const weekAgo = new Date(today.setDate(today.getDate() - 7));
                        return absenceDate >= weekAgo;
                    case 'month':
                        const monthAgo = new Date(today.setMonth(today.getMonth() - 1));
                        return absenceDate >= monthAgo;
                    default:
                        return true;
                }
            });
        }

        displayAbsences(filteredAbsences);
    }

    // Fonction pour afficher les absences
    function displayAbsences(absences) {
        console.log('Affichage des absences:', absences);
        absencesTable.innerHTML = '';
        if (absences.length === 0) {
            absencesTable.innerHTML = '<tr><td colspan="7" class="no-data">Aucune absence trouvée</td></tr>';
            return;
        }

        absences.forEach(absence => {
            const row = document.createElement('tr');
            const date = new Date(absence.marked_at);
            const formattedDate = date.toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            const isJustified = absence.justification_id !== null;
            const statusClass = isJustified ? 'status-justified' : 'status-absent';
            const statusText = isJustified ? 'Justifiée' : 'Non justifiée';

            row.innerHTML = `
                <td>${absence.student_name}</td>
                <td>${absence.class_name}</td>
                <td>${formattedDate}</td>
                <td>${absence.course_name}</td>
                <td>${getCourseType(absence.course_name)}</td>
                <td>
                    <span class="status-badge ${statusClass}">
                        ${statusText}
                    </span>
                </td>
                <td>
                    ${!isJustified ? 
                        `<button class="btn-justify" onclick="openJustificationModal('${absence.attendance_id}')">
                            <i class="fas fa-check"></i> Justifier
                        </button>` :
                        `<button class="btn-view" onclick="viewJustification('${absence.attendance_id}')">
                            <i class="fas fa-eye"></i> Voir détails
                        </button>`
                    }
                </td>
            `;
            absencesTable.appendChild(row);
        });
    }

    // Fonction pour ouvrir le modal de justification
    window.openJustificationModal = async (absenceId) => {
        try {
            const absenceDetails = await window.connect.getAbsenceDetails(absenceId);
            if (absenceDetails) {
                document.getElementById('absenceId').value = absenceId;
                document.getElementById('studentName').value = absenceDetails.student_name;
                document.getElementById('className').value = absenceDetails.class_name;
                document.getElementById('absenceDate').value = new Date(absenceDetails.marked_at)
                    .toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                document.getElementById('courseName').value = absenceDetails.course_name;
                document.getElementById('justificationDate').value = new Date().toISOString().split('T')[0];
                modal.style.display = 'block';
            }
        } catch (error) {
            console.error('Erreur lors du chargement des détails de l\'absence:', error);
        }
    };

    // Fonction pour voir les détails d'une justification
    window.viewJustification = async (absenceId) => {
        try {
            const absenceDetails = await window.connect.getAbsenceDetails(absenceId);
            if (absenceDetails) {
                document.getElementById('absenceId').value = absenceId;
                document.getElementById('studentName').value = absenceDetails.student_name;
                document.getElementById('className').value = absenceDetails.class_name;
                document.getElementById('absenceDate').value = new Date(absenceDetails.marked_at)
                    .toLocaleDateString('fr-FR');
                document.getElementById('courseName').value = absenceDetails.course_name;
                document.getElementById('justificationReason').value = absenceDetails.reason;
                document.getElementById('justificationReason').readOnly = true;
                document.getElementById('justificationDate').value = new Date(absenceDetails.date)
                    .toISOString().split('T')[0];
                document.getElementById('justificationDate').readOnly = true;
                
                // Désactiver le bouton de soumission
                document.querySelector('#justificationForm button[type="submit"]').style.display = 'none';
                
                modal.style.display = 'block';
            }
        } catch (error) {
            console.error('Erreur lors du chargement des détails de la justification:', error);
        }
    };

    // Fonction pour fermer le modal
    window.closeModal = () => {
        modal.style.display = 'none';
        justificationForm.reset();

        document.getElementById('justificationReason').readOnly = false;
        document.getElementById('justificationDate').readOnly = false;
        document.querySelector('#justificationForm button[type="submit"]').style.display = 'block';
    };

    // Gestionnaire de soumission du formulaire
    justificationForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const student_presence_id = document.getElementById('absenceId').value;
        const reason = document.getElementById('justificationReason').value.trim();
        const date = document.getElementById('justificationDate').value;

        // Validation des données
        if (!reason) {
            alert('Veuillez entrer une raison pour la justification.');
            return;
        }

        if (!date) {
            alert('Veuillez sélectionner une date de justification.');
            return;
        }

        // Désactive le bouton de soumission pendant le traitement
        const submitButton = document.querySelector('#justificationForm button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Traitement en cours...';

        try {
            // Envoyer la justification
            await window.connect.justifyAbsence(
                student_presence_id,
                reason,
                date
            );
            
            // Fermer le modal et rafraîchir les données
            closeModal();
            await loadAllAbsences();
            
            // Afficher un message de succès
            alert('Justification enregistrée avec succès !');
        } catch (error) {
            console.error('Erreur lors de la justification de l\'absence:', error);
            alert('Une erreur est survenue lors de la justification de l\'absence. Veuillez réessayer.');
        } finally {
            // Réactiver le bouton de soumission
            submitButton.disabled = false;
            submitButton.textContent = 'Valider la justification';
        }
    });

    // Event Listeners pour les filtres
    courseTypeFilter.addEventListener('change', applyFilters);
    classFilter.addEventListener('change', applyFilters);
    dateFilter.addEventListener('change', applyFilters);
    studentSearch.addEventListener('input', applyFilters);

    // Fermer le modal quand on clique sur le X
    closeBtn.addEventListener('click', closeModal);

    // Fermer le modal quand on clique en dehors
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    // Initialisation
    loadClasses();
    loadAllAbsences();

    // Rafraîchir les données toutes les 30 secondes
    setInterval(loadAllAbsences, 30000);
}); 
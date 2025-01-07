// Attendre que le DOM soit chargé
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Récupère l'ID du parent depuis le localStorage
        const parentId = localStorage.getItem('userId');
        if (!parentId) {
            console.error('Parent ID not found');
            return;
        }

        // Récupère et affiche le nom du parent dans le header
        const parentName = localStorage.getItem('userName');
        if (parentName) {
            document.getElementById('parent-name').textContent = parentName;
            document.getElementById('parentFullName').textContent = parentName;
        }

        // Récupère l'email du parent depuis le localStorage
        const parentEmail = localStorage.getItem('userEmail');
        if (parentEmail) {
            document.getElementById('parentEmail').textContent = parentEmail;
        }

        // Récupère la liste des enfants du parent
        const children = await window.connect.getParentStudents(parentId);
        console.log('Children data:', children);

        if (children && children.length > 0) {
            const childrenListContainer = document.querySelector('.children-list');
            childrenListContainer.innerHTML = ''; 

            // Crée une carte pour chaque enfant
            children.forEach(child => {
                const childCard = document.createElement('div');
                childCard.className = 'child-card';
                childCard.innerHTML = `
                    <img src="../assets/default-avatar.png" alt="Student Avatar" class="student-avatar">
                    <div class="child-info">
                        <h3>${child.name}</h3>
                        <p><i class="fas fa-graduation-cap"></i> Class: ${child.class_name || 'Not assigned'}</p>
                        <p><i class="fas fa-id-card"></i> Student ID: ${child.id}</p>
                        <p><i class="fas fa-school"></i> Class ID: ${child.class_id}</p>
                    </div>
                `;
                childrenListContainer.appendChild(childCard);
            });
        } else {
            // Affiche un message si aucun enfant n'est trouvé
            const childrenListContainer = document.querySelector('.children-list');
            childrenListContainer.innerHTML = `
                <div class="no-children-message">
                    <i class="fas fa-info-circle"></i>
                    <p>No children are currently associated with this account.</p>
                </div>
            `;
        }

    } catch (error) {
        console.error('Error loading parent profile:', error);
        // Affiche un message d'erreur à l'utilisateur
        alert('An error occurred while loading the profile. Please try again later.');
    }
}); 
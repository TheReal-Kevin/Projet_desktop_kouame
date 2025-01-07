// logout.js
document.addEventListener('DOMContentLoaded', () => {
    const logoutButton = document.querySelector('.logout-btn'); 

    if (logoutButton) {
        logoutButton.addEventListener('click', (event) => {
            event.preventDefault(); 

            // Efface les données de l'utilisateur du stockage local
            localStorage.removeItem('userName');
            // Redirige vers le formulaire de connexion
            window.location.href = '../index.html'; 
        });
    }
});
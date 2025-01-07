document.addEventListener('DOMContentLoaded', () => {
});

document.getElementById('login-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const result = await window.connect.login(email, password);
        if (result.success) {
            localStorage.setItem('userName', result.name);
            localStorage.setItem('userRole', result.role);
            localStorage.setItem('userEmail', email);
            localStorage.setItem('userId', result.userId);

            // Redirection vers la page appropriée en fonction du rôle
            switch(result.role) {
                case 'coordinators':
                    window.location.href = 'pages/admin-dashboard.html';
                    break;
                case 'parents':
                    window.location.href = 'pages/parent-timetable.html';
                    break;
                case 'students':
                    window.location.href = 'pages/timetable-student.html';
                    break;
                case 'teachers':
                    window.location.href = 'pages/teacher-timetable.html';
                    break;
                default:
                    alert(`Rôle non reconnu: ${result.role}`);
                    console.error('Rôle non reconnu:', result.role);
            }
        } else {
            let errorMessage;
            switch(result.message) {
                case 'Invalid credentials':
                    errorMessage = 'Email ou mot de passe incorrect.';
                    break;
                case 'Role not found':
                    errorMessage = 'Erreur: Rôle utilisateur non trouvé.';
                    break;
                default:
                    errorMessage = result.message || 'Erreur de connexion inconnue.';
            }
            alert(errorMessage);
            console.error('Erreur de connexion:', result.message);
        }
    } catch (err) {
        console.error('Erreur lors de la connexion:', err);
        alert('Une erreur est survenue lors de la connexion. Veuillez réessayer.');
    }
});
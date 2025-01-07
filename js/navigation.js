function navigateTo(page, userRole) {
    console.log('Navigating to:', page);
    console.log('User role:', userRole);

    // Redirection spécifique pour la page timetable selon le rôle
    if (page === 'timetable') {
        switch(userRole) {
            case 'parents':
                page = 'parent-timetable';
                break;
            case 'students':
                page = 'timetable-student';
                break;
            case 'teachers':
                page = 'teacher-timetable';
                break;
            case 'coordinators':
                break;
        }
    }

    // les autorisations par rôle 
    const rolePermissions = {
        'coordinators': [
            'admin-dashboard', 
            'timetable',
            'admin-statistics',
            'admin-presence',
            'admin-graphs',
            'admin-justifications'
        ],
        'teachers': [
            'timetable',
            'presence',
            'attendance',
            'statistics',
            'teacher-timetable',
            'teacher-presence',
            'teacher-attendance',
            'teacher-statistics'
        ],
        'students': ['timetable-student', 'student-grades', 'student-absences'],
        'parents': [
            'parent-timetable', 
            'parent-profile',
            'parent-grades',
            'parent-absences',
            'profile',
        ]
    };

    // Mappe les noms de pages aux fichiers HTML pour les enseignants
    const teacherPageMapping = {
        'timetable': 'teacher-timetable',
        'presence': 'teacher-presence',
        'attendance': 'teacher-attendance',
        'statistics': 'teacher-statistics'
    };

    // Mappe les noms de pages aux fichiers HTML pour les coordinateurs
    const coordinatorPageMapping = {
        'presence': 'admin-presence',
        'statistics': 'admin-statistics'
    };

    // Mappe les noms de pages aux fichiers HTML pour les parents
    const parentPageMapping = {
        'timetable': 'parent-timetable',
        'profile': 'parent-profile'
    };

    // Sélectionne le mapping approprié selon le rôle
    let targetPage = page;
    if (userRole === 'teachers' && teacherPageMapping[page]) {
        targetPage = teacherPageMapping[page];
    } else if (userRole === 'coordinators' && coordinatorPageMapping[page]) {
        targetPage = coordinatorPageMapping[page];
    } else if (userRole === 'parents' && parentPageMapping[page]) {
        targetPage = parentPageMapping[page];
    }

    // Vérifie si le rôle a la permission d'accéder à la page
    if (rolePermissions[userRole] && (
        rolePermissions[userRole].includes(page) || 
        rolePermissions[userRole].includes(targetPage)
    )) {
        const currentPath = window.location.pathname;
        const isInPagesDirectory = currentPath.includes('/pages/');
        const targetPath = isInPagesDirectory ? `${targetPage}.html` : `pages/${targetPage}.html`;

        // Si on est sur la même page, recharger
        if (isSamePage(targetPath)) {
            window.location.reload();
        } else {
            window.location.href = targetPath;
        }
    } else {
        console.error('Access denied');
        alert(' you are not authorized to access this page.');
    }
}

function navigateBackToDashboard(userRole) {
    switch(userRole) {
        case 'coordinators':
            window.location.href = 'admin-dashboard.html';
            break;
        case 'teachers':
            window.location.href = 'teacher-timetable.html';
            break;
        case 'students':
            window.location.href = 'timetable-student.html';
            break;
        case 'parents':
            window.location.href = 'parent-dashboard.html';
            break;
        default:
            console.error('Role not recognized');
            alert(' you are not authorized.');
    }
}

// Fonction pour initialiser la navigation sécurisée
function initSecureNavigation() {
    const userRole = localStorage.getItem('userRole');
    
    // écouteurs d'événements avec le rôle pour tous les éléments de navigation
    document.querySelectorAll('[data-page]').forEach(element => {
        element.addEventListener('click', () => {
            const page = element.getAttribute('data-page');
            
            // Si on est déjà sur la page timetable-student et qu'on clique sur timetable
            if (window.location.pathname.includes('timetable-student.html') && page === 'timetable') {
                
                window.location.reload();
                return;
            }

            // Navigation normale pour les autres cas 
            navigateTo(page, userRole);
        });
    });

    // Bouton de retour au dashboard
    const backToDashboardButtons = document.querySelectorAll('.back-to-dashboard');
    backToDashboardButtons.forEach(button => {
        button.addEventListener('click', () => {
            navigateBackToDashboard(userRole);
        });
    });
}

// Fonction pour vérifier si nous sommes sur la même page
function isSamePage(targetPage) {
    const currentPath = window.location.pathname;
    return currentPath.includes(targetPage);
}

// Initialise la navigation sécurisée une fois le DOM chargé
document.addEventListener('DOMContentLoaded', initSecureNavigation);
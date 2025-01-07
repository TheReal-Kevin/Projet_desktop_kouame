// admin-dashboard.js
document.addEventListener('DOMContentLoaded', async () => {
    const userName = localStorage.getItem('userName');
    // const userRole = localStorage.getItem('userRole');
    // const userClass = localStorage.getItem('userClass');
    if (userName) {
        document.getElementById('user-name').textContent = userName; // Afficher le nom
    } else {
        document.getElementById('user-name').textContent = 'Guest'; // Affiche un message par défaut si aucun nom n'est trouvé
    }

// Charge les rôles dynamiquement lors du chargement de la page
    await loadRoles(); 
    await loadClasses(); 
    await updateUserStats();
});

// Chargez les utilisateurs
    loadUsers(); 


    // Écoute les changements sur le sélecteur de rôle
    document.getElementById('role').addEventListener('change', async (event) => {
        const selectedRole = event.target.value;
        const classContainer = document.getElementById('class-container');
        const studentContainer = document.getElementById('student-container');

        if (selectedRole === 'students') {
            classContainer.style.display = 'block';
            studentContainer.style.display = 'none';
            await loadClasses();
        } else if (selectedRole === 'parents') {
            classContainer.style.display = 'none';
            studentContainer.style.display = 'block';
            await loadStudents();
        } else {
            classContainer.style.display = 'none';
            studentContainer.style.display = 'none';
        }
    });


    // Gestion de la soumission du formulaire de création d'utilisateur
    document.querySelector('.create-user form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const password = document.getElementById('password').value;
        const strength = checkPasswordStrength(password);
        
        if (strength.label === 'weak') {
            if (!confirm('The password is weak. Are you sure you want to continue?')) {
                return;
            }
        }
        
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const role = document.getElementById('role').value;

        try {
            const userId = await window.connect.createUser(name, email, password, role);
            
            if (role === 'parents') {
                const studentSelect = document.getElementById('student-select');
                const selectedStudents = Array.from(studentSelect.selectedOptions).map(option => option.value);
                await window.connect.assignStudentsToParent(userId, selectedStudents);
            }
            
            alert(`User created successfully`);
            await loadUsers();
        } catch (err) {
            console.error('Error creating user:', err);
            alert('Failed to create user.');
        }
    });

    // Gestion de la soumission du formulaire d'édition d'utilisateur
    document.querySelector('.edit-user form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const userId = document.getElementById('edit-user-id').value;
        const name = document.getElementById('edit-name').value;
        const email = document.getElementById('edit-email').value;
        const password = document.getElementById('edit-password').value;
        const role = document.getElementById('edit-role').value;
        const classId = role === 'students' ? document.getElementById('edit-class-select').value : null;

        if (password) {
            const strength = checkPasswordStrength(password);
            if (strength.label === 'weak') {
                if (!confirm('The password is weak. Are you sure you want to continue?')) {
                    return;
                }
            }
        }

        try {
            await window.connect.updateUser(userId, name, email, password, role, classId);
            alert(`User updated successfully.`);
            await loadUsers();
            document.querySelector('.edit-user').style.display = 'none';
        } catch (err) {
            console.error('Error updating user:', err);
            alert('Failed to update user.');
        }
    });


// Fonction pour charger les utilisateurs
async function loadUsers() {
    try {
        const users = await window.connect.getAllUsers();
        const userList = document.querySelector('.user-list tbody');
        userList.innerHTML = ''; // Vide la liste existante

        users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.name || 'N/A'}</td>
                <td>${user.role || 'N/A'}</td>
                <td>
                    <button class="btn-edit" onclick="editUser(${user.id}, '${user.name}', '${user.email}', '${user.password}', '${user.role}')">Edit</button>
                    <button class="btn-delete" onclick="deleteUser(${user.id})">Delete</button>
                </td>
            `;
            userList.appendChild(row);
        });
        
        await updateUserStats();
    } catch (err) {
        console.error('Error loading users:', err);
    }
}


// Fonction pour charger les rôles
async function loadRoles() {
    try {
        const roles = await window.connect.getDistinctRoles(); // Appel à la fonction pour récupérer les rôles
        console.log('Roles retrieved:', roles); // Affiche les rôles récupérés
        const roleSelect = document.getElementById('role'); // Sélectionne le champ de sélection des rôles

        // Vide les options existantes
        roleSelect.innerHTML = '';

        // Ajoute les rôles au select
        roles.forEach(role => {
            const option = document.createElement('option'); // Crée un nouvel élément <option>
            option.value = role.role; // Utilise la valeur du rôle
            option.textContent = role.role; // Affiche le rôle
            roleSelect.appendChild(option); // Ajoute l'option au champ de sélection
        });
    } catch (err) {
        console.error('Error loading roles:', err); 
    }
}


// Fonction pour éditer un utilisateur
async function editUser(id, name, email, password, role) {
    document.getElementById('edit-user-id').value = id;
    document.getElementById('edit-name').value = name;
    document.getElementById('edit-email').value = email;
    document.getElementById('edit-password').value = password;
    document.getElementById('edit-role').value = role;

    // Gère l'affichage du sélecteur de classe
    const classContainer = document.getElementById('edit-class-container');
    if (role === 'students') {
        classContainer.style.display = 'block';
        loadClassesForEdit(id); // Charge les classes et sélectionne celle de l'étudiant
    } else if (role === 'parents') {
        document.getElementById('edit-student-container').style.display = 'block';
        await loadStudents();
        const parentStudents = await window.connect.getParentStudents(id);
        const studentSelect = document.getElementById('edit-student-select');
        
        // Sélectionne les étudiants assignés
        parentStudents.forEach(student => {
            const option = studentSelect.querySelector(`option[value="${student.id}"]`);
            if (option) option.selected = true;
        });
    } else {
        classContainer.style.display = 'none';
    }

    // Charge les rôles pour le formulaire d'édition
    loadEditRoles().then(() => {
        document.getElementById('edit-role').value = role;
    });

    document.querySelector('.edit-user').style.display = 'block';
}

// Fonction pour supprimer un utilisateur
async function deleteUser(id) {
    if (confirm("Are you sure you want to delete this user?")) {
        try {
            const changes = await window.connect.deleteUser(id);
            alert(`User deleted: ${changes} row(s) removed`);
            await loadUsers(); // Recharge la liste des utilisateurs
        } catch (err) {
            console.error('Error deleting user:', err);
            alert('Failed to delete user.');
        }
    }
}


// Fonction pour charger les classes
async function loadClasses() {
    try {
        const classes = await window.connect.getAllClasses(); // Récupére les classes depuis le backend
        const classSelect = document.getElementById('class-select'); // Sélecteur pour les classes

        // Vide les options existantes
        classSelect.innerHTML = '';

        // Ajoute les classes dynamiquement
        classes.forEach(cls => {
            const option = document.createElement('option');
            option.value = cls.value; // ID de la classe
            option.textContent = cls.name; // Nom de la classe
            classSelect.appendChild(option);
        });
    } catch (err) {
        console.error('Error loading classes:', err);
    }
}

// Fonction pour charger les rôles dans le formulaire d'édition
async function loadEditRoles() {
    try {
        const roles = await window.connect.getDistinctRoles(); // Appel à la fonction pour récupérer les rôles
        const roleSelect = document.getElementById('edit-role'); // Sélectionne le champ de sélection des rôles

        // Vide les options existantes
        roleSelect.innerHTML = '';

        // Ajoute les rôles au select
        roles.forEach(role => {
            const option = document.createElement('option');
            option.value = role.role; // Utilise la valeur du rôle
            option.textContent = role.role; // Affiche le rôle
            roleSelect.appendChild(option); 
        });
    } catch (err) {
        console.error('Error loading edit roles:', err); 
    }
}

// Fonction pour vérifier la force du mot de passe
function checkPasswordStrength(password) {
    let strength = 0;
    
    // Vérifie la longueur
    if (password.length >= 8) strength += 1;
    
    // Vérifie les caractères spéciaux
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength += 1;
    
    // Vérifie le mélange de chiffres et de lettres
    if (/\d/.test(password) && /[a-zA-Z]/.test(password)) strength += 1;
    
    // Vérifie les majuscules et minuscules
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 1;
    
    return {
        score: strength,
        label: strength <= 1 ? 'weak' : strength <= 2 ? 'medium' : 'strong'
    };
}

// Ajoute l'écouteur d'événements pour le champ de mot de passe
document.getElementById('password').addEventListener('input', function(e) {
    const password = e.target.value;
    const strengthMeter = document.querySelector('.strength-meter');
    const strengthText = document.querySelector('.strength-text span');
    
    if (password === '') {
        strengthMeter.className = 'strength-meter';
        strengthText.textContent = 'None';
        return;
    }
    
    const strength = checkPasswordStrength(password);
    
    // Met à jour les classes CSS
    strengthMeter.className = 'strength-meter ' + strength.label;
    
    // Met à jour le texte
    strengthText.textContent = strength.label.charAt(0).toUpperCase() + strength.label.slice(1);
    strengthText.style.color = {
        'weak': '#ff4444',
        'medium': '#ffbb33',
        'strong': '#00C851'
    }[strength.label];
});

// Ajoute l'écouteur d'événements pour le champ de mot de passe dans le formulaire d'édition
document.getElementById('edit-password').addEventListener('input', function(e) {
    const password = e.target.value;
    const strengthMeter = document.querySelector('#edit-strength-meter');
    const strengthText = document.querySelector('#edit-strength-text');
    
    if (password === '') {
        strengthMeter.className = 'strength-meter';
        strengthText.textContent = 'None';
        return;
    }
    
    const strength = checkPasswordStrength(password);
    
    // Met à jour les classes CSS
    strengthMeter.className = 'strength-meter ' + strength.label;
    
    // Met à jour le texte
    strengthText.textContent = strength.label.charAt(0).toUpperCase() + strength.label.slice(1);
    strengthText.style.color = {
        'weak': '#ff4444',
        'medium': '#ffbb33',
        'strong': '#00C851'
    }[strength.label];
});

// Ajoute un écouteur pour le changement de rôle dans le formulaire d'édition
document.getElementById('edit-role').addEventListener('change', async (event) => {
    const selectedRole = event.target.value;
    const classContainer = document.getElementById('edit-class-container');

    if (selectedRole === 'students') {
        classContainer.style.display = 'block';
        await loadClasses(); // Charger les classes
    } else {
        classContainer.style.display = 'none';
    }
});

// Fonction pour charger les classes dans le formulaire d'édition
async function loadClassesForEdit(userId) {
    try {
        const classes = await window.connect.getAllClasses();
        const studentClass = await window.connect.getStudentClass(userId);
        const classSelect = document.getElementById('edit-class-select');

        // Vide les options existantes
        classSelect.innerHTML = '';

        // Ajoute les classes
        classes.forEach(cls => {
            const option = document.createElement('option');
            option.value = cls.value;
            option.textContent = cls.name;
            if (studentClass && cls.value === studentClass) {
                option.selected = true;
            }
            classSelect.appendChild(option);
        });
    } catch (err) {
        console.error('Error loading classes for edit:', err);
    }
}

// Fonction pour générer un mot de passe sécurisé
function generateSecurePassword() {
    const length = 16;
    const charset = {
        uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        lowercase: 'abcdefghijklmnopqrstuvwxyz',
        numbers: '0123456789',
        symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?'
    };

    let password = '';
    // Assure au moins un caractère de chaque type
    password += charset.uppercase.charAt(Math.floor(Math.random() * charset.uppercase.length));
    password += charset.lowercase.charAt(Math.floor(Math.random() * charset.lowercase.length));
    password += charset.numbers.charAt(Math.floor(Math.random() * charset.numbers.length));
    password += charset.symbols.charAt(Math.floor(Math.random() * charset.symbols.length));

    // Complète avec des caractères aléatoires
    const allChars = Object.values(charset).join('');
    for (let i = password.length; i < length; i++) {
        password += allChars.charAt(Math.floor(Math.random() * allChars.length));
    }

    // Mélange le mot de passe
    return password.split('').sort(() => Math.random() - 0.5).join('');
}

// gestionnaires d'événements
document.addEventListener('DOMContentLoaded', () => {
    const generateBtn = document.getElementById('generate-password');
    const toggleBtn = document.getElementById('toggle-password');
    const passwordInput = document.getElementById('password');
    const generatedDiv = document.querySelector('.generated-password');
    const generatedText = document.getElementById('generated-text');

    generateBtn.addEventListener('click', () => {
        const password = generateSecurePassword();
        passwordInput.value = password;
        generatedText.textContent = password;
        generatedDiv.style.display = 'block';
        
        // Déclenche l'événement input pour mettre à jour l'indicateur de force
        const inputEvent = new Event('input');
        passwordInput.dispatchEvent(inputEvent);
    });

    toggleBtn.addEventListener('click', () => {
        const type = passwordInput.type === 'password' ? 'text' : 'password';
        passwordInput.type = type;
        toggleBtn.innerHTML = type === 'password' ? 
            '<i class="fas fa-eye"></i>' : 
            '<i class="fas fa-eye-slash"></i>';
    });

    // Cache le mot de passe généré quand l'utilisateur modifie le champ
    passwordInput.addEventListener('input', () => {
        if (generatedDiv.style.display === 'block') {
            generatedDiv.style.display = 'none';
        }
    });
});


async function updateUserStats() {
    try {
        const users = await window.connect.getAllUsers();
        
        // Initialiser les compteurs
        let counts = {
            coordinators: 0,
            students: 0,
            teachers: 0,
            parents: 0
        };
        
        // Compte les utilisateurs par rôle
        users.forEach(user => {
            switch(user.role) {
                case 'coordinators':
                    counts.coordinators++;
                    break;
                case 'students':
                    counts.students++;
                    break;
                case 'teachers':
                    counts.teachers++;
                    break;
                case 'parents':
                    counts.parents++;
                    break;
            }
        });
        
        // Met à jour les compteurs dans le DOM
        document.getElementById('coordinator-count').textContent = counts.coordinators;
        document.getElementById('student-count').textContent = counts.students;
        document.getElementById('teacher-count').textContent = counts.teachers;
        document.getElementById('parent-count').textContent = counts.parents;
        
        // Ajoute une animation simple pour les nombres
        document.querySelectorAll('.stat-info p').forEach(p => {
            p.style.animation = 'none';
            p.offsetHeight; 
            p.style.animation = 'countUp 0.5s ease-out';
        });
    } catch (err) {
        console.error('Error updating user stats:', err);
    }
}

// animation CSS pour les nombres
const style = document.createElement('style');
style.textContent = `
    @keyframes countUp {
        from {
            transform: translateY(10px);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);


async function loadStudents() {
    try {
        console.log('Starting loadStudents function');
        if (!window.connect || !window.connect.getAllStudents) {
            throw new Error('getAllStudents method not found in window.connect');
        }
        
        const students = await window.connect.getAllStudents();
        console.log('Students received:', students);
        
        const studentSelect = document.getElementById('student-select');
        const editStudentSelect = document.getElementById('edit-student-select');
        
        if (!studentSelect || !editStudentSelect) {
            throw new Error('Student select elements not found');
        }
        
        // Vide les sélecteurs
        studentSelect.innerHTML = '';
        editStudentSelect.innerHTML = '';
        
        // Ajoute  des options
        if (students && Array.isArray(students)) {
            students.forEach(student => {
                const option = document.createElement('option');
                option.value = student.id;
                option.textContent = student.name;
                
                studentSelect.appendChild(option);
                editStudentSelect.appendChild(option.cloneNode(true));
            });
        } else {
            console.log('No students found or invalid data format');
        }
    } catch (err) {
        console.error('Error in loadStudents:', err);
        alert('Failed to load students. Please check the console for details.');
    }
}


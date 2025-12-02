// URL de votre Apps Script
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbylDOZOcMB7SqQ3aMR3skS6AfJrLMVVGqsrujHFsU4LyWsqnErr9qNiOP8KMEhB8cKr/exec"; 

// Variables globales pour stocker les listes chargées
let louveteaux = [];
let eclaireurs = [];

// --- 1. CHARGEMENT AU DÉMARRAGE ---
document.addEventListener('DOMContentLoaded', () => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('date-jour').innerText = new Date().toLocaleDateString('fr-FR', options);

    chargerListesDepuisGoogle();
});

function chargerListesDepuisGoogle() {
    // On utilise fetch classique (GET) pour récupérer les données JSON
    fetch(APPS_SCRIPT_URL)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                louveteaux = data.louveteaux;
                eclaireurs = data.eclaireurs;
                
                // Mettre à jour l'affichage
                genererListe('liste-louveteaux', louveteaux);
                genererListe('liste-eclaireurs', eclaireurs);
            } else {
                alert("Erreur de chargement des listes : " + data.message);
            }
        })
        .catch(error => {
            console.error('Erreur chargement:', error);
            // Fallback si échec (optionnel : mettre des listes vides ou un message)
            document.getElementById('liste-louveteaux').innerHTML = "<li>Erreur de connexion aux listes.</li>";
            document.getElementById('liste-eclaireurs').innerHTML = "<li>Erreur de connexion aux listes.</li>";
        });
}

function genererListe(elementId, tableauNoms) {
    const ul = document.getElementById(elementId);
    ul.innerHTML = ""; // Vider la liste existante (ex: "Chargement...")
    
    if (tableauNoms.length === 0) {
        ul.innerHTML = "<li>Aucun inscrit trouvé.</li>";
        return;
    }

    tableauNoms.forEach(nom => {
        let li = document.createElement('li');
        li.innerText = nom;
        li.onclick = function() {
            this.classList.toggle('present');
        };
        ul.appendChild(li);
    });
}

// --- 2. FONCTIONS UI ---
function openTab(evt, groupName) {
    var i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tab-content");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }
    tablinks = document.getElementsByClassName("tab-link");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    document.getElementById(groupName).style.display = "block";
    evt.currentTarget.className += " active";
}

// --- 3. EXPORTATION (MODE NO-CORS) ---
function exporterAppel() {
    let csvData = "\uFEFF" + "Groupe;Nom;Statut;Date\n";
    const dateJour = new Date().toLocaleDateString('fr-FR');
    const filename = "Appel_Scout_" + dateJour.replace(/\//g, '-') + ".csv";

    // Collecte des données affichées à l'écran
    processList('liste-louveteaux', 'Louveteau', csvData, dateJour, (res1) => {
        processList('liste-eclaireurs', 'Eclaireur', res1, dateJour, (finalCsv) => {
            
            // Préparation de l'envoi
            const payload = {
                action: 'EXPORT', // On précise l'action
                csvData: finalCsv,
                filename: filename
            };

            // Envoi
            fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify(payload)
            })
            .then(() => {
                alert("🚀 Appel enregistré dans Drive !");
            })
            .catch((error) => {
                alert("❌ Erreur réseau : " + error);
            });
        });
    });
}

function processList(ulId, groupeNom, currentCsv, date, callback) {
    const listItems = document.getElementById(ulId).getElementsByTagName('li');
    for (let item of listItems) {
        if (item.innerText === "Chargement..." || item.innerText.includes("Erreur")) continue;
        let statut = item.classList.contains('present') ? "PRESENT" : "ABSENT";
        currentCsv += `${groupeNom};${item.innerText};${statut};${date}\n`;
    }
    callback(currentCsv);
}

// --- 4. AJOUT D'ENFANT (NOUVEAU) ---
function ajouterEnfant() {
    const nomInput = document.getElementById('nouveau-nom');
    const groupeSelect = document.getElementById('nouveau-groupe');
    const nom = nomInput.value.trim();
    const groupe = groupeSelect.value;

    if (!nom) {
        alert("Veuillez entrer un nom.");
        return;
    }

    const payload = {
        action: 'ADD',
        nom: nom,
        groupe: groupe
    };

    // Envoi en mode no-cors
    fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
    })
    .then(() => {
        alert(`✅ ${nom} a été ajouté(e) aux ${groupe} !\n\nL'application va recharger les listes dans 2 secondes...`);
        nomInput.value = ""; // Vider le champ
        
        // On recharge la page après 2 secondes pour voir le nouveau nom
        setTimeout(() => {
            location.reload(); 
        }, 2000);
    })
    .catch((error) => {
        alert("❌ Erreur lors de l'ajout : " + error);
    });
}

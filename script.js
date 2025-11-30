// --- 1. CONFIGURATION DES NOMS ---

// Liste des Louveteaux & Louvettes
const louveteaux = [
    "ALEXANDERSSON Joakim",
    "LE GRAND Nathan",
    "FAVENNEL Louis",
    "GUILLOU Martin",
    "BALCON Evan",
    "THEPOT Soen",
    "ALEXANDERSSON Timéo",
    "SULLIVAN Joseph",
    "COATMELLEC Ulysse",
    "ABZIOU LE GUERN Kaw",
    "BARBER Benjamin",
    "LE MORTELLEC Elias",
    "BEAUMIN Lucas",
    "LE MORTELLEC Samuel",
    "SIBERIL Eflamm",
    "LE PANSE Léandre",
    "FOYER Félix",
    "ACHTAL Swan",
    "Aïdan",
    "SCHULZE Wendy",
    "HERVE Rose",
    "LANG Auxanne",
    "BROUSTAUT Eloïse",
    "GUYADER Zélie",
    "ARMAND Nolwenn",
    "KIPPER Alma",
    "KELLER Elenore",
    "LANG Ysaline",
    "BROUSTAUT Eleanor",
    "VIAL Pauline",
    "ALEXANDERSSON Erell",
    "FOYER Brune",
    "BARBER Mari"
];

// Liste des Eclaireurs & Eclaireuses
const eclaireurs = [
    "AXELSSON Louanne",
    "KELLER Gabrielle",
    "PRIGENT Mayalen",
    "BUSSIERE Camille",
    "BUSSIERE Sarah",
    "KELLER Bleunwenn",
    "LE PANSE Jade",
    "BICHAT Mélissa",
    "LANG Juliane",
    "CADEO CAMENEN Léonie",
    "BALCON Angie",
    "GOETHE Klara",
    "LE MORTELLEC Eve",
    "Libie",
    "FRAMMEZELLE Yani",
    "PONS Goulven",
    "SCHULZE Ghislain",
    "KELLER Louis",
    "SCHULTZ Titouan",
    "SCHULZE Melvin",
    "Guyader Augustin",
    "Guyader Joseph",
    "FER Quentin",
    "PHILIPPE Kelyan",
    "AVON Tyliann",
    "ARMAND Elouann",
    "LE MORTELLEC Paul",
    "GUEGUEN Briac",
    "Ilan"
];

// --- 2. FONCTIONNEMENT DE L'APP ---

document.addEventListener('DOMContentLoaded', () => {
    // Afficher la date
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('date-jour').innerText = new Date().toLocaleDateString('fr-FR', options);

    // Charger les listes
    // On trie les listes par ordre alphabétique pour faciliter la recherche
    louveteaux.sort();
    eclaireurs.sort();

    genererListe('liste-louveteaux', louveteaux);
    genererListe('liste-eclaireurs', eclaireurs);
});

function genererListe(elementId, tableauNoms) {
    const ul = document.getElementById(elementId);
    tableauNoms.forEach(nom => {
        let li = document.createElement('li');
        li.innerText = nom;
        li.onclick = function() {
            this.classList.toggle('present');
        };
        ul.appendChild(li);
    });
}

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

// --- 3. EXPORTATION (MODIFIÉE POUR APPS SCRIPT) ---

// URL de l'application Google Apps Script pour l'enregistrement sur Drive
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbylDOZOcMB7SqQ3aMR3skS6AfJrLMVVGqsrujHFsU4LyWsqnErr9qNiOP8KMEhB8cKr/exec"; 

function exporterAppel() {
    // Variable pour stocker le contenu CSV, y compris le caractère BOM (\uFEFF) pour les accents
    let csvData = "\uFEFF" + "Groupe;Nom;Statut;Date\n";

    const dateJour = new Date().toLocaleDateString('fr-FR');
    // Le nom de fichier est dynamique avec la date du jour
    const filename = "Appel_Scout_" + dateJour.replace(/\//g, '-') + ".csv";

    // Fonction pour collecter toutes les données des deux groupes
    function collectData(currentCsv, callback) {
        processList('liste-louveteaux', 'Louveteau', currentCsv, dateJour, (res1) => {
            processList('liste-eclaireurs', 'Eclaireur', res1, dateJour, (finalCsv) => {
                callback(finalCsv);
            });
        });
    }

    // 1. Collecter les données
    collectData(csvData, (finalCsvContent) => {
        // 2. Préparer les données pour l'envoi
        const payload = {
            csvData: finalCsvContent,
            filename: filename
        };

        // 3. Envoyer les données au script Google Apps
        fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'cors', 
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert("✅ Succès ! L'appel a été enregistré dans Google Drive sous le nom : " + filename);
            } else {
                alert("❌ Erreur lors de l'enregistrement sur Drive. Message : " + data.message);
                console.error(data.message);
            }
        })
        .catch((error) => {
            alert("❌ Erreur de communication avec le script Google. Le fichier n'a pas été enregistré. Vérifiez la console pour plus de détails.");
            console.error('Erreur:', error);
        });
    });
}

function processList(ulId, groupeNom, currentCsv, date, callback) {
    const listItems = document.getElementById(ulId).getElementsByTagName('li');
    for (let item of listItems) {
        let statut = item.classList.contains('present') ? "PRESENT" : "ABSENT";
        // On nettoie le nom (enlève le check visuel s'il y en a un)
        currentCsv += `${groupeNom};${item.innerText};${statut};${date}\n`;
    }
    callback(currentCsv);
}

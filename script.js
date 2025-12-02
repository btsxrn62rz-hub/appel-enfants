// L'URL de votre Apps Script (elle reste la même, l'Apps Script gère la version)
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbylDOZOcMB7SqQ3aMR3skS6AfJrLMVVGqsrujHFsU4LyWsqnErr9qNiOP8KMEhB8cKr/exec"; 

let louveteaux = [];
let eclaireurs = [];

document.addEventListener('DOMContentLoaded', () => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('date-jour').innerText = new Date().toLocaleDateString('fr-FR', options);
    chargerListesDepuisGoogle();
});

function chargerListesDepuisGoogle() {
    fetch(APPS_SCRIPT_URL)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                louveteaux = data.louveteaux;
                eclaireurs = data.eclaireurs;
                genererListe('liste-louveteaux', louveteaux, 'Louveteaux');
                genererListe('liste-eclaireurs', eclaireurs, 'Eclaireurs');
            } else {
                alert("Erreur chargement : " + data.message);
            }
        })
        .catch(error => {
            console.error(error);
            document.getElementById('liste-louveteaux').innerHTML = "<li>Erreur de connexion.</li>";
        });
}

function genererListe(elementId, tableauNoms, groupeNom) {
    const ul = document.getElementById(elementId);
    ul.innerHTML = "";
    
    if (tableauNoms.length === 0) {
        ul.innerHTML = "<li>Aucun inscrit trouvé.</li>";
        return;
    }

    tableauNoms.forEach(nom => {
        let li = document.createElement('li');
        
        // On construit le HTML avec le nom ET les boutons
        li.innerHTML = `
            <span class="nom-eleve">${nom}</span>
            <div class="item-actions">
                <button class="btn-mini" onclick="modifierEnfant(event, '${nom}', '${groupeNom}')">✏️</button>
                <button class="btn-mini" onclick="supprimerEnfant(event, '${nom}', '${groupeNom}')">🗑️</button>
            </div>
        `;

        // Le clic sur la ligne gère la présence
        li.onclick = function(e) {
            // Si on clique sur un bouton, on ne change pas la présence (arrêt de la propagation)
            if (e.target.tagName === 'BUTTON') return;
            this.classList.toggle('present');
        };
        
        ul.appendChild(li);
    });
}

// --- ACTIONS MODIFIER / SUPPRIMER ---

function modifierEnfant(event, ancienNom, groupe) {
    event.stopPropagation(); // Empêche de cocher "Présent" quand on clique sur modifier
    
    let nouveauNom = prompt("Modifier le nom de " + ancienNom + " :", ancienNom);
    
    if (nouveauNom && nouveauNom !== ancienNom) {
        envoyerAction({
            action: 'EDIT',
            groupe: groupe,
            nom: ancienNom,       // On envoie l'ancien nom pour le retrouver
            nouveauNom: nouveauNom // Et le nouveau pour le remplacer
        }, `Nom modifié : ${nouveauNom}`);
    }
}

function supprimerEnfant(event, nom, groupe) {
    event.stopPropagation(); // Empêche de cocher "Présent"
    
    if (confirm("Êtes-vous sûr de vouloir supprimer définitivement " + nom + " ?")) {
        envoyerAction({
            action: 'DELETE',
            groupe: groupe,
            nom: nom
        }, `Suppression de ${nom} effectuée.`);
    }
}

// Fonction générique pour envoyer les changements (ADD, EDIT, DELETE)
function envoyerAction(payload, messageSucces) {
    // Petit indicateur visuel
    document.body.style.cursor = "wait";
    
    fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
    })
    .then(() => {
        document.body.style.cursor = "default";
        alert("✅ " + messageSucces + "\nLa page va se recharger.");
        setTimeout(() => location.reload(), 1000);
    })
    .catch((error) => {
        document.body.style.cursor = "default";
        alert("❌ Erreur : " + error);
    });
}

// --- FONCTIONS EXISTANTES (Onglets, Export, Ajout) ---

function openTab(evt, groupName) {
    var i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tab-content");
    for (i = 0; i < tabcontent.length; i++) { tabcontent[i].style.display = "none"; }
    tablinks = document.getElementsByClassName("tab-link");
    for (i = 0; i < tablinks.length; i++) { tablinks[i].className = tablinks[i].className.replace(" active", ""); }
    document.getElementById(groupName).style.display = "block";
    evt.currentTarget.className += " active";
}

function exporterAppel() {
    let csvData = "\uFEFFGroupe;Nom;Statut;Date\n";
    const dateJour = new Date().toLocaleDateString('fr-FR');
    const filename = "Appel_Scout_" + dateJour.replace(/\//g, '-') + ".csv";

    processList('liste-louveteaux', 'Louveteau', csvData, dateJour, (res1) => {
        processList('liste-eclaireurs', 'Eclaireur', res1, dateJour, (finalCsv) => {
            envoyerAction({
                action: 'EXPORT',
                csvData: finalCsv,
                filename: filename
            }, "Appel enregistré dans Drive !");
        });
    });
}

function processList(ulId, groupeNom, currentCsv, date, callback) {
    const listItems = document.getElementById(ulId).getElementsByTagName('li');
    for (let item of listItems) {
        if (item.innerText.includes("Aucun inscrit")) continue;
        // On récupère juste le texte du SPAN .nom-eleve, pas tout le LI (qui contient les boutons)
        let nomEleve = item.querySelector('.nom-eleve').innerText;
        let statut = item.classList.contains('present') ? "PRESENT" : "ABSENT";
        currentCsv += `${groupeNom};${nomEleve};${statut};${date}\n`;
    }
    callback(currentCsv);
}

function ajouterEnfant() {
    const nom = document.getElementById('nouveau-nom').value.trim();
    const groupe = document.getElementById('nouveau-groupe').value;
    if (!nom) return alert("Nom vide !");
    
    envoyerAction({
        action: 'ADD',
        nom: nom,
        groupe: groupe
    }, `${nom} ajouté aux ${groupe} !`);
}

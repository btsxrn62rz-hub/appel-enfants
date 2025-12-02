// --- 3. EXPORTATION (MODE "NO-CORS" / ENVOI AVEUGLE) ---

// Votre URL (gardez bien celle qui finit par /exec)
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbylDOZOcMB7SqQ3aMR3skS6AfJrLMVVGqsrujHFsU4LyWsqnErr9qNiOP8KMEhB8cKr/exec"; 

function exporterAppel() {
    // Variable pour stocker le contenu CSV
    let csvData = "\uFEFF" + "Groupe;Nom;Statut;Date\n";

    const dateJour = new Date().toLocaleDateString('fr-FR');
    const filename = "Appel_Scout_" + dateJour.replace(/\//g, '-') + ".csv";

    // Fonction pour collecter toutes les données
    function collectData(currentCsv, callback) {
        processList('liste-louveteaux', 'Louveteau', currentCsv, dateJour, (res1) => {
            processList('liste-eclaireurs', 'Eclaireur', res1, dateJour, (finalCsv) => {
                callback(finalCsv);
            });
        });
    }

    // 1. Collecter les données
    collectData(csvData, (finalCsvContent) => {
        
        // 2. Préparer les données
        const payload = {
            csvData: finalCsvContent,
            filename: filename
        };

        // 3. ENVOI EN MODE "NO-CORS" (C'est la modification importante)
        // Cela permet de contourner l'erreur 405 / CORS
        fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors', // <--- C'est ici que la magie opère
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        })
        .then(() => {
            // En mode no-cors, on ne peut pas savoir si Google a dit "OK" ou "Erreur".
            // On considère que l'envoi est parti.
            alert("🚀 Envoi effectué !\n\nComme nous contournons la sécurité, nous ne pouvons pas avoir la confirmation directe.\n\nVeuillez vérifier dans votre Google Drive d'ici quelques secondes que le fichier '" + filename + "' est bien apparu.");
        })
        .catch((error) => {
            alert("❌ Erreur réseau critique : " + error);
            console.error('Erreur:', error);
        });
    });
}

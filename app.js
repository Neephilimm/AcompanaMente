// --- CONFIGURACIÓN DEL MAPA ---
// Coordenadas base en caso de que el usuario no de permisos (Santiago)
let map = L.map('map').setView([-33.4489, -70.6693], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

const btnUbicar = document.getElementById('btn-ubicar');

btnUbicar.addEventListener('click', () => {
    if (navigator.geolocation) {
        btnUbicar.innerText = "Buscando...";
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                
                // Centrar mapa en el usuario
                map.setView([lat, lng], 14);
                L.marker([lat, lng]).addTo(map).bindPopup("Tu ubicación").openPopup();
                
                // Buscar centros de salud mental cercanos
                buscarCentrosSalud(lat, lng);
                btnUbicar.innerText = "Ubicación encontrada";
            },
            () => {
                alert("No pudimos acceder a tu ubicación.");
                btnUbicar.innerText = "Buscar cerca de mi ubicación";
            }
        );
    } else {
        alert("Tu navegador no soporta geolocalización.");
    }
});

// Consulta a la API de Overpass para encontrar centros psicológicos/psiquiátricos
async function buscarCentrosSalud(lat, lng) {
    // Radio de 5000 metros buscando etiquetas específicas de salud mental
    const query = `
        [out:json];
        node(around:5000, ${lat}, ${lng})["healthcare"~"psychiatrist|psychotherapist|counselling"];
        out;
    `;
    const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if(data.elements.length === 0) {
            alert("No se encontraron centros específicos de salud mental en este radio.");
            return;
        }

        data.elements.forEach(element => {
            const nombre = element.tags.name || "Centro de Atención";
            const tipo = element.tags.healthcare || "Especialista";
            L.marker([element.lat, element.lon]).addTo(map)
             .bindPopup(`<b>${nombre}</b><br>Especialidad: ${tipo}`);
        });

    } catch (error) {
        console.error("Error al buscar centros:", error);
    }
}

// --- CONFIGURACIÓN DE LA IA (CARRIL GEMINI) ---
const btnEnviar = document.getElementById('btn-enviar');
const userInput = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');

// PEGA AQUÍ LA URL DE TU APLICACIÓN WEB DE GOOGLE APPS SCRIPT
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzbhgyb-eoQanSFXUcFbP-ouI_eNbArwOTvn7Bg0KwO-IyAfAm9pNr_vvxUml3476jhOQ/exec';

btnEnviar.addEventListener('click', async () => {
    const texto = userInput.value.trim();
    if (!texto) return;

    // Mostrar mensaje del usuario
    chatBox.innerHTML += `<div class="user-msg">${texto}</div>`;
    userInput.value = '';
    chatBox.scrollTop = chatBox.scrollHeight;

    // Mostrar indicador de carga
    const loadingId = 'loading-' + Date.now();
    chatBox.innerHTML += `<div id="${loadingId}" class="ai-msg">Escribiendo...</div>`;
    chatBox.scrollTop = chatBox.scrollHeight;

    try {
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ prompt: texto })
        });
        
        const data = await response.json();
        
        // Remover "Escribiendo..." y mostrar respuesta
        document.getElementById(loadingId).remove();
        chatBox.innerHTML += `<div class="ai-msg">${data.respuesta}</div>`;
        
    } catch (error) {
        document.getElementById(loadingId).innerText = "Error de conexión. Intenta de nuevo.";
        console.error("Error en IA:", error);
    }
    chatBox.scrollTop = chatBox.scrollHeight;
});

// Permitir enviar con la tecla Enter
userInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        btnEnviar.click();
    }
});

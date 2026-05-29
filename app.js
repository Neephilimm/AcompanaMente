// --- CONFIGURACIÓN DEL MAPA ---
// Coordenadas base (Providencia, Santiago) en caso de que el usuario no dé permisos de ubicación
let map = L.map('map').setView([-33.4263, -70.6123], 13);

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
                L.marker([lat, lng]).addTo(map).bindPopup("Tu ubicación actual").openPopup();
                
                // Buscar centros de salud cercanos con la nueva función
                buscarCentrosSalud(lat, lng);
                btnUbicar.innerText = "Ubicación encontrada";
            },
            () => {
                alert("No pudimos acceder a tu ubicación. El mapa mostrará la zona por defecto.");
                btnUbicar.innerText = "Buscar cerca de mi ubicación";
            }
        );
    } else {
        alert("Tu navegador no soporta geolocalización.");
    }
});

// Consulta ampliada a la API de Overpass para encontrar hospitales, clínicas y centros
async function buscarCentrosSalud(lat, lng) {
    // Ampliamos la consulta a nodos y áreas complejas en un radio de 5km
    const query = `
        [out:json][timeout:25];
        (
          node(around:5000, ${lat}, ${lng})["amenity"~"hospital|clinic|doctors"];
          way(around:5000, ${lat}, ${lng})["amenity"~"hospital|clinic|doctors"];
          node(around:5000, ${lat}, ${lng})["healthcare"];
          way(around:5000, ${lat}, ${lng})["healthcare"];
        );
        out center;
    `;
    const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (!data.elements || data.elements.length === 0) {
            alert("No se encontraron centros de salud en un radio de 5 km en esta zona de OpenStreetMap.");
            return;
        }

        data.elements.forEach(element => {
            // Si el elemento es un área (way), usamos las coordenadas centrales calculadas por la API
            const markerLat = element.lat || (element.center && element.center.lat);
            const markerLng = element.lon || (element.center && element.center.lng);
            
            if (markerLat && markerLng) {
                const nombre = element.tags.name || "Centro de Atención / Hospital";
                let tipo = element.tags.amenity || element.tags.healthcare || "Centro de salud";
                
                // Traducimos términos comunes para la interfaz
                if (tipo === "hospital") tipo = "Hospital / Urgencias";
                if (tipo === "clinic") tipo = "Clínica / Centro Médico";
                if (tipo === "doctors") tipo = "Consultorio / Consulta Médica";

                L.marker([markerLat, markerLng]).addTo(map)
                 .bindPopup(`<b>${nombre}</b><br>Tipo: ${tipo}`);
            }
        });

    } catch (error) {
        console.error("Error al conectar con la API de mapas:", error);
    }
}

// --- CONFIGURACIÓN DE LA IA (CARRIL GEMINI VÍA APPS SCRIPT) ---
const btnEnviar = document.getElementById('btn-enviar');
const userInput = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');

// ¡IMPORTANTE! Reemplaza esto con la URL de tu nueva implementación de Google Apps Script
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwisQSc2tkKcNhgNV1NRt7_s-nYE-2xbVhc8hD1euHRmHPQiMLwNbQKST2PmlRRtN_wuA/exec';

btnEnviar.addEventListener('click', async () => {
    const texto = userInput.value.trim();
    if (!texto) return;

    // Mostrar el mensaje del usuario en el chat
    chatBox.innerHTML += `<div class="user-msg">${texto}</div>`;
    userInput.value = '';
    chatBox.scrollTop = chatBox.scrollHeight;

    // Mostrar el indicador de carga de la IA
    const loadingId = 'loading-' + Date.now();
    chatBox.innerHTML += `<div id="${loadingId}" class="ai-msg">Escribiendo...</div>`;
    chatBox.scrollTop = chatBox.scrollHeight;

    try {
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ prompt: texto })
        });
        
        const data = await response.json();
        
        // Remover el mensaje de "Escribiendo..."
        document.getElementById(loadingId).remove();
        
        // Manejo de errores detallado
        if (data.error) {
            chatBox.innerHTML += `<div class="ai-msg" style="color: red;"><b>Error del servidor:</b> ${data.error}</div>`;
        } else if (data.respuesta) {
            chatBox.innerHTML += `<div class="ai-msg">${data.respuesta}</div>`;
        } else {
            chatBox.innerHTML += `<div class="ai-msg" style="color: orange;">Error: Respuesta con formato desconocido.</div>`;
        }
        
    } catch (error) {
        document.getElementById(loadingId).remove();
        chatBox.innerHTML += `<div class="ai-msg" style="color: red;">Error de conexión con Google Apps Script. Verifica la URL.</div>`;
        console.error("Error en IA:", error);
    }
    chatBox.scrollTop = chatBox.scrollHeight;
});

// Permitir enviar el mensaje al presionar la tecla Enter
userInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        btnEnviar.click();
    }
});

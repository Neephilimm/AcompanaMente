// ==========================================
// CONFIGURACIÓN GLOBAL (Enlace de Apps Script)
// ==========================================
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzw-Ojl3VhtKLOsZwJUE7WWT-xzNPU5b5WDtQskBgEzg1y1vw2H8ez5b6gOpCxlowow/exec';

// ==========================================
// 1. CONFIGURACIÓN DEL MAPA Y GOOGLE SHEETS
// ==========================================
let map = L.map('map').setView([-33.4263, -70.6123], 13); // Centrado inicial en Santiago (Providencia)

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
                
                // Mover el mapa a la posición real del usuario
                map.setView([lat, lng], 14);
                L.marker([lat, lng]).addTo(map).bindPopup("Tu ubicación actual").openPopup();
                
                // Cargar los centros desde tu Google Sheet
                buscarCentrosSalud();
                btnUbicar.innerText = "Ubicación encontrada";
            },
            () => {
                alert("No pudimos acceder a tu ubicación. Mostrando todos los centros registrados de todos modos.");
                buscarCentrosSalud();
                btnUbicar.innerText = "Buscar cerca de mi ubicación";
            }
        );
    } else {
        alert("Tu navegador no soporta geolocalización.");
    }
});

async function buscarCentrosSalud() {
    try {
        // Ejecuta automáticamente la función doGet() en tu Apps Script para traer las filas de Sheets
        const response = await fetch(APPS_SCRIPT_URL);
        const data = await response.json();

        if (data.error) {
            console.error("Error desde el servidor:", data.error);
            return;
        }

        data.forEach(centro => {
            const latitud = parseFloat(centro.Latitud);
            const longitud = parseFloat(centro.Longitud);
            
            // Si las coordenadas son válidas, dibuja el pin con la información comercial estructurada
            if (!isNaN(latitud) && !isNaN(longitud)) {
                L.marker([latitud, longitud]).addTo(map)
                 .bindPopup(`
                    <div style="font-family: 'Segoe UI', Arial, sans-serif; min-width: 230px; max-width: 290px;">
                        <b style="color: #2c3e50; font-size: 1.15em; display: block; margin-bottom: 5px;">${centro.Nombre || 'Centro de Salud'}</b>
                        <hr style="border: 0; border-top: 1px solid #eee; margin: 6px 0;">
                        <p style="margin: 4px 0;"><b>📋 Planes:</b><br><span style="color: #555; font-size: 0.95em;">${centro.Planes || 'No registra'}</span></p>
                        <p style="margin: 4px 0;"><b>💰 Valor Plan:</b> ${centro.Valor_Plan || 'No especificado'}</p>
                        <p style="margin: 4px 0;"><b>🧠 Cita Individual:</b> <span style="color: #2c3e50; font-weight: bold;">${centro.Valor_Individual || 'No especificado'}</span></p>
                        <hr style="border: 0; border-top: 1px solid #eee; margin: 6px 0;">
                        <p style="margin: 4px 0; font-size: 0.95em;"><b>📍 Ubicación:</b> ${centro.Ubicacion || 'No especificada'}</p>
                        <p style="margin: 4px 0; font-size: 0.95em;"><b>📞 Contacto:</b> ${centro.Contacto || 'No disponible'}</p>
                    </div>
                 `);
            }
        });
    } catch (error) {
        console.error("Error al conectar con el servidor de datos:", error);
    }
}

// ==========================================
// 2. CONFIGURACIÓN DEL CHAT DE IA (GROQ)
// ==========================================
const btnEnviar = document.getElementById('btn-enviar');
const userInput = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');

btnEnviar.addEventListener('click', async () => {
    const texto = userInput.value.trim();
    if (!texto) return;

    // Pintar mensaje del usuario
    chatBox.innerHTML += `<div class="user-msg">${texto}</div>`;
    userInput.value = '';
    chatBox.scrollTop = chatBox.scrollHeight;

    // Estado "Escribiendo..."
    const loadingId = 'loading-' + Date.now();
    chatBox.innerHTML += `<div id="${loadingId}" class="ai-msg">Escribiendo...</div>`;
    chatBox.scrollTop = chatBox.scrollHeight;

    try {
        // Envía un método POST que ejecuta la función doPost() en tu Apps Script (Conecta a Groq de forma segura)
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ prompt: texto })
        });
        
        const data = await response.json();
        document.getElementById(loadingId).remove();
        
        if (data.error) {
            chatBox.innerHTML += `<div class="ai-msg" style="color: red;"><b>Error:</b> ${data.error}</div>`;
        } else if (data.respuesta) {
            chatBox.innerHTML += `<div class="ai-msg">${data.respuesta}</div>`;
        }
        
    } catch (error) {
        document.getElementById(loadingId).remove();
        chatBox.innerHTML += `<div class="ai-msg" style="color: red;">Error de conexión con el asistente virtual.</div>`;
    }
    chatBox.scrollTop = chatBox.scrollHeight;
});

// Permitir el envío cómodo con la tecla Enter
userInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') btnEnviar.click();
});

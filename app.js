// ==========================================
// CONFIGURACIÓN GLOBAL 
// ==========================================
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzw-Ojl3VhtKLOsZwJUE7WWT-xzNPU5b5WDtQskBgEzg1y1vw2H8ez5b6gOpCxlowow/exec';

let currentLat = null;
let currentLng = null;
let userMarker = null;

// ==========================================
// 1. CONFIGURACIÓN DEL MAPA
// ==========================================
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
                currentLat = position.coords.latitude;
                currentLng = position.coords.longitude;
                
                map.setView([currentLat, currentLng], 14);
                
                // Borrar marcador anterior si existe
                if(userMarker) map.removeLayer(userMarker);
                
                // Círculo azul interactivo para el usuario
                userMarker = L.circleMarker([currentLat, currentLng], {
                    radius: 9,
                    fillColor: "#0078ff",
                    color: "#ffffff",
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 0.8
                }).addTo(map).bindPopup("<b>Estás aquí</b>").openPopup();
                
                buscarCentrosSalud();
                btnUbicar.innerText = "Ubicación encontrada";
            },
            () => {
                alert("Mostrando centros sin tu ubicación exacta.");
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
        const response = await fetch(APPS_SCRIPT_URL);
        const data = await response.json();

        if (data.error) {
            console.error("Error desde el servidor:", data.error);
            return;
        }

        data.forEach(centro => {
            const latitud = parseFloat(centro.Latitud);
            const longitud = parseFloat(centro.Longitud);
            
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
// 2. CONFIGURACIÓN DEL CHAT DE IA (GROQ + GRÁFICOS)
// ==========================================
const btnEnviar = document.getElementById('btn-enviar');
const userInput = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');

btnEnviar.addEventListener('click', async () => {
    const texto = userInput.value.trim();
    if (!texto) return;

    chatBox.innerHTML += `<div class="user-msg">${texto}</div>`;
    userInput.value = '';
    chatBox.scrollTop = chatBox.scrollHeight;

    const loadingId = 'loading-' + Date.now();
    chatBox.innerHTML += `<div id="${loadingId}" class="ai-msg">Escribiendo...</div>`;
    chatBox.scrollTop = chatBox.scrollHeight;

    try {
        // Se envía el prompt y la ubicación del usuario
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ 
                prompt: texto,
                userLat: currentLat,
                userLng: currentLng
            })
        });
        
        const data = await response.json();
        document.getElementById(loadingId).remove();
        
        if (data.error) {
            chatBox.innerHTML += `<div class="ai-msg" style="color: red;"><b>Error:</b> ${data.error}</div>`;
        } else if (data.respuesta) {
            let textoIA = data.respuesta;
            
            // NUEVA LÓGICA: Más inteligente y tolerante a errores de formato de la IA
            if (textoIA.includes("DATOS:")) {
                // Separamos el mensaje amigable de los datos matemáticos
                const partes = textoIA.split("DATOS:");
                textoIA = partes[0].trim(); // Nos quedamos solo con el texto para el usuario
                
                // Limpiamos los datos: quitamos corchetes (si los puso) y espacios extra
                const rawData = partes[1].replace(/\[|\]/g, '').trim(); 
                
                // Creamos el espacio para el gráfico
                const canvasId = 'chart-' + Date.now();
                chatBox.innerHTML += `<div class="ai-msg">${textoIA}<br><br><canvas id="${canvasId}" style="max-width: 100%;"></canvas></div>`;
                
                const etiquetas = [];
                const valores = [];
                
                // Procesamos las emociones
                rawData.split(',').forEach(item => {
                    const datosItem = item.split('-');
                    if(datosItem.length === 2) { // Verificamos que tenga el formato Palabra-Numero
                        etiquetas.push(datosItem[0].trim());
                        valores.push(parseInt(datosItem[1].trim()));
                    }
                });
                
                // Dibujamos el gráfico
                new Chart(document.getElementById(canvasId), {
                    type: 'bar', 
                    data: {
                        labels: etiquetas,
                        datasets: [{
                            label: 'Nivel Emocional',
                            data: valores,
                            backgroundColor: ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6']
                        }]
                    },
                    options: {
                        scales: {
                            y: { beginAtZero: true, max: 10 } // Forzamos a que el gráfico sea del 0 al 10
                        }
                    }
                });
            } else {
                // Si el mensaje no trae datos de gráfico, se imprime normal
                chatBox.innerHTML += `<div class="ai-msg">${textoIA}</div>`;
            }
        }
    } catch (error) {
        document.getElementById(loadingId).remove();
        chatBox.innerHTML += `<div class="ai-msg" style="color: red;">Error de conexión.</div>`;
    }
    chatBox.scrollTop = chatBox.scrollHeight;
});

userInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') btnEnviar.click();
});

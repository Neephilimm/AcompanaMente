// ==========================================
// CONFIGURACIÓN GLOBAL 
// ==========================================
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzw-Ojl3VhtKLOsZwJUE7WWT-xzNPU5b5WDtQskBgEzg1y1vw2H8ez5b6gOpCxlowow/exec';

let currentLat = null;
let currentLng = null;
let userMarker = null;

// ==========================================
// FUNCIÓN PARA FORMATEAR A PESOS CHILENOS (CLP)
// ==========================================
function formatearPesoChileno(valor) {
    if (!valor || valor === "") return 'No especificado';
    
    let valorLimpio = String(valor).trim().replace('$', '').replace(/\./g, ''); 
    let numero = parseInt(valorLimpio);

    if (isNaN(numero)) {
        return valor; 
    }

    return new Intl.NumberFormat('es-CL', { 
        style: 'currency', 
        currency: 'CLP',
        maximumFractionDigits: 0
    }).format(numero);
}

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
                
                if(userMarker) map.removeLayer(userMarker);
                
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
            // Mapeo tolerante a variaciones de mayúsculas y acentos en las columnas de la hoja
            const keys = Object.keys(centro);
            const latKey = keys.find(k => k.toLowerCase() === 'latitud') || 'Latitud';
            const lngKey = keys.find(k => k.toLowerCase() === 'longitud') || 'Longitud';
            const nombreKey = keys.find(k => k.toLowerCase() === 'nombre') || 'Nombre';
            const valorIndKey = keys.find(k => k.toLowerCase() === 'valor_individual') || 'Valor_Individual';
            const ubicacionKey = keys.find(k => k.toLowerCase().includes('ubicac')) || 'Ubicacion';
            const contactoKey = keys.find(k => k.toLowerCase() === 'contacto') || 'Contacto';

            const latitud = parseFloat(centro[latKey]);
            const longitud = parseFloat(centro[lngKey]);
            
            if (!isNaN(latitud) && !isNaN(longitud)) {
                const valorIndividualF = formatearPesoChileno(centro[valorIndKey]);

                L.marker([latitud, longitud]).addTo(map)
                 .bindPopup(`
                    <div style="font-family: 'Segoe UI', Arial, sans-serif; min-width: 230px; max-width: 290px;">
                        <b style="color: #2c3e50; font-size: 1.15em; display: block; margin-bottom: 5px;">${centro[nombreKey] || 'Centro de Salud'}</b>
                        <hr style="border: 0; border-top: 1px solid #eee; margin: 6px 0;">
                        
                        <p style="margin: 4px 0;"><b>🧠 Cita Individual:</b> <span style="color: #2c3e50; font-weight: bold;">${valorIndividualF}</span></p>
                        
                        <hr style="border: 0; border-top: 1px solid #eee; margin: 6px 0;">
                        <p style="margin: 4px 0; font-size: 0.95em;"><b>📍 Ubicación:</b> ${centro[ubicacionKey] || 'No especificada'}</p>
                        <p style="margin: 4px 0; font-size: 0.95em;"><b>📞 Contacto:</b> ${centro[contactoKey] || 'No disponible'}</p>
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
            
            if (textoIA.includes("DATOS:")) {
                const partes = textoIA.split("DATOS:");
                textoIA = partes[0].trim(); 
                
                const rawData = partes[1].replace(/\[|\]/g, '').trim(); 
                
                const canvasId = 'chart-' + Date.now();
                chatBox.innerHTML += `<div class="ai-msg">${textoIA}<br><br><canvas id="${canvasId}" style="max-width: 100%;"></canvas></div>`;
                
                const etiquetas = [];
                const valores = [];
                
                rawData.split(',').forEach(item => {
                    const datosItem = item.split('-');
                    if(datosItem.length === 2) { 
                        etiquetas.push(datosItem[0].trim());
                        valores.push(parseInt(datosItem[1].trim()));
                    }
                });
                
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
                            y: { beginAtZero: true, max: 10 } 
                        }
                    }
                });
            } else {
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

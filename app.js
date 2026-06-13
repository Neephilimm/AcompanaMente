function abrirPestana(evt, idPestana) {
    const contenidos = document.getElementsByClassName("tab-content");
    for (let i = 0; i < contenidos.length; i++) {
        contenidos[i].classList.remove("active");
    }

    const botones = document.getElementsByClassName("tab-btn");
    for (let i = 0; i < botones.length; i++) {
        botones[i].classList.remove("active");
    }

    document.getElementById(idPestana).classList.add("active");
    evt.currentTarget.classList.add("active");

    if (idPestana === 'tab-mapa' && map) {
        setTimeout(() => {
            map.invalidateSize();
        }, 100);
    }
}

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzw-Ojl3VhtKLOsZwJUE7WWT-xzNPU5b5WDtQskBgEzg1y1vw2H8ez5b6gOpCxlowow/exec';

let currentLat = null;
let currentLng = null;
let userMarker = null;

function formatearPesoChileno(valor) {
    if (valor === undefined || valor === null || valor === "") return 'No especificado';
    let soloNumeros = String(valor).replace(/\D/g, ''); 
    if (soloNumeros === "") return valor; 
    let numero = parseInt(soloNumeros, 10);
    return '$' + numero.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function formatearTelefonoExcel(valor) {
    if (valor === undefined || valor === null || valor === "") return 'No disponible';
    let texto = String(valor).trim();
    texto = texto.replace(/\.0+$/, ''); 
    texto = texto.replace(/,/g, '');    
    return texto;
}

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
            const keys = Object.keys(centro);
            const nombreKey = keys.find(k => k.toLowerCase().replace(/[\s_]/g, '') === 'nombre') || 'Nombre';
            const valorIndKey = keys.find(k => k.toLowerCase().replace(/[\s_]/g, '') === 'valorindividual') || 'Valor_Individual';
            const contactoKey = keys.find(k => k.toLowerCase().replace(/[\s_]/g, '') === 'contacto') || 'Contacto';
            const calificacionKey = keys.find(k => k.toLowerCase().includes('calific')) || 'Calificación';
            const resenasKey = keys.find(k => k.toLowerCase().includes('reseñ') || k.toLowerCase().includes('resen')) || 'Cantidad de Reseñas';
            const ubicacionKey = keys.find(k => k.toLowerCase().includes('ubicac')) || 'Ubicacion';
            const latKey = keys.find(k => k.toLowerCase().replace(/[\s_]/g, '') === 'latitud') || 'Latitud';
            const lngKey = keys.find(k => k.toLowerCase().replace(/[\s_]/g, '') === 'longitud') || 'Longitud';

            const latitud = parseFloat(centro[latKey]);
            const longitud = parseFloat(centro[lngKey]);
            
            if (!isNaN(latitud) && !isNaN(longitud)) {
                const valorIndividualF = formatearPesoChileno(centro[valorIndKey]);
                const telefonoF = formatearTelefonoExcel(centro[contactoKey]);
                
                let rawCalif = centro[calificacionKey];
                let calificacionF = "Sin registrar";
                if (rawCalif !== undefined && rawCalif !== null && String(rawCalif).trim() !== "") {
                    let numLimpio = String(rawCalif).replace('$', '').trim();
                    let valorNumerico = parseFloat(numLimpio);
                    if (!isNaN(valorNumerico)) {
                        calificacionF = `⭐ ${valorNumerico.toFixed(1)} / 5.0`;
                    } else {
                        calificacionF = numLimpio; 
                    }
                }

                let rawResenas = centro[resenasKey];
                let resenasF = "0";
                if (rawResenas !== undefined && rawResenas !== null && String(rawResenas).trim() !== "") {
                    let resLimpio = String(rawResenas).replace(/\.0+$/, '').replace(/,/g, '').trim();
                    if(resLimpio !== "") resenasF = resLimpio;
                }

                L.marker([latitud, longitud]).addTo(map)
                 .bindPopup(`
                    <div style="font-family: 'Segoe UI', Arial, sans-serif; min-width: 230px; max-width: 290px;">
                        <b style="color: #2c3e50; font-size: 1.15em; display: block; margin-bottom: 5px;">${centro[nombreKey] || 'Centro de Salud'}</b>
                        <hr style="border: 0; border-top: 1px solid #eee; margin: 6px 0;">
                        
                        <p style="margin: 4px 0;"><b>🧠 Valor Cita:</b> <span style="color: #2c3e50; font-weight: bold;">${valorIndividualF}</span></p>
                        <p style="margin: 4px 0;"><b>📊 Calificación:</b> <span style="color: #2c3e50; font-weight: bold;">${calificacionF}</span></p>
                        <p style="margin: 2px 0 4px 0; font-size: 0.9em; color: #666; padding-left: 2px;">💬 ${resenasF} reseñas totales</p>
                        
                        <hr style="border: 0; border-top: 1px solid #eee; margin: 6px 0;">
                        <p style="margin: 4px 0; font-size: 0.95em;"><b>📍 Ubicación:</b> ${centro[ubicacionKey] || 'No específica'}</p>
                        <p style="margin: 4px 0; font-size: 0.95em;"><b>📞 Contacto:</b> ${telefonoF}</p>
                    </div>
                 `);
            }
        });
    } catch (error) {
        console.error("Error al conectar con el servidor de datos:", error);
    }
}

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
            
            // LIMPIEZA ANTI-HUECOS: Reducimos cualquier salto de línea excesivo a un formato normal
            let textoIA = data.respuesta.replace(/\n{2,}/g, '\n\n');
            
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

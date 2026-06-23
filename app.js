document.addEventListener("DOMContentLoaded", function() {
    // ==========================================
    // 1. INICIALIZACIÓN DEL MAPA Y MEMORIA
    // ==========================================
    var map = L.map('map').setView([-33.4328, -70.6150], 14); 
    window.miMapaGlobal = map; 
    window.userLat = null; 
    window.userLng = null; 
    window.marcadoresCentros = {}; 
    window.historialChat = []; 

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
    var centrosLayer = L.layerGroup().addTo(map);

    const URL_APPS_SCRIPT = "https://script.google.com/macros/s/AKfycbzw-Ojl3VhtKLOsZwJUE7WWT-xzNPU5b5WDtQskBgEzg1y1vw2H8ez5b6gOpCxlowow/exec"; 
    let listaCentrosData = []; 

    // ==========================================
    // 2. CREACIÓN DE LISTA DE BÚSQUEDA
    // ==========================================
    const datalist = document.createElement('datalist');
    datalist.id = 'lista-centros-dinamica';
    document.body.appendChild(datalist);
    const inputBuscar = document.getElementById('buscador-centro');
    if (inputBuscar) inputBuscar.setAttribute('list', 'lista-centros-dinamica');

    async function preCargarDatos() {
        try {
            const respuesta = await fetch(URL_APPS_SCRIPT + "?action=getCentros"); 
            listaCentrosData = await respuesta.json();

            listaCentrosData.forEach(centro => {
                if(centro.Nombre) {
                    let opcion = document.createElement('option');
                    opcion.value = centro.Nombre;
                    datalist.appendChild(opcion);
                }
            });
        } catch (error) {
            console.error("Error al precargar datos:", error);
        }
    }
    preCargarDatos();

    // ==========================================
    // 3. FUNCIÓN PARA DIBUJAR LOS CENTROS
    // ==========================================
    function dibujarCentrosEnMapa() {
        if (Object.keys(window.marcadoresCentros).length > 0) return;

        listaCentrosData.forEach(centro => {
            if(centro.Latitud && centro.Longitud) {
                let lat = parseFloat(centro.Latitud);
                let lng = parseFloat(centro.Longitud);
                
                let infoHTML = `
                    <div style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 14px; line-height: 1.5; min-width: 200px;">
                        <h3 style="color: #315937; margin-bottom: 6px; font-size: 16px;">${centro.Nombre}</h3>
                        <b>📍 Dirección:</b> ${centro.Ubicación}<br>
                        <b>💰 Valor:</b> ${centro.Valor_Individual}<br>
                        <b>📞 Contacto:</b> <a href="tel:${centro.Contacto}" style="color: #56735D; font-weight: bold; text-decoration: underline;">${centro.Contacto}</a><br>
                        <b>⭐ Calificación:</b> ${centro['Calificación'] || 'N/A'}/5<br>
                        <a href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}" target="_blank" 
                           style="display: block; text-align: center; background-color: #315937; color: white; padding: 8px; border-radius: 5px; text-decoration: none; font-weight: bold; margin-top: 10px; transition: 0.3s;">
                           🚗 Pincha aquí para ir
                        </a>
                    </div>
                `;
                var marker = L.marker([lat, lng]).bindPopup(infoHTML);
                centrosLayer.addLayer(marker);
                window.marcadoresCentros[centro.Nombre] = marker;
            }
        });
    }

    // ==========================================
    // 4. BUSCADOR INTELIGENTE
    // ==========================================
    const btnBuscar = document.getElementById('btn-buscar-centro');
    function volarAlCentro() {
        dibujarCentrosEnMapa();
        const nombreSeleccionado = inputBuscar.value;
        const marcador = window.marcadoresCentros[nombreSeleccionado];
        if (marcador) {
            map.flyTo(marcador.getLatLng(), 16, { animate: true, duration: 1.5 });
            marcador.openPopup();
        } else {
            alert("Por favor, selecciona un centro válido de la lista.");
        }
    }
    if (btnBuscar) btnBuscar.addEventListener('click', volarAlCentro);
    if (inputBuscar) inputBuscar.addEventListener('keypress', e => { if (e.key === 'Enter') volarAlCentro(); });

    // ==========================================
    // 5. GPS: UBICACIÓN DEL USUARIO
    // ==========================================
    const btnUbicar = document.getElementById('btn-ubicar');
    if (btnUbicar) {
        btnUbicar.addEventListener('click', function() {
            dibujarCentrosEnMapa();
            map.locate({setView: true, maxZoom: 15});
        });
    }

    map.on('locationfound', function(e) {
        window.userLat = e.latlng.lat;
        window.userLng = e.latlng.lng;
        L.circleMarker(e.latlng, { radius: 8, fillColor: '#007bef', color: '#ffffff', weight: 3, opacity: 1, fillOpacity: 0.9 })
         .addTo(map).bindPopup("<b>Tu ubicación actual</b>").openPopup();
    });

    map.on('locationerror', function() {
        alert("No se pudo obtener tu ubicación. Mostrando los centros disponibles.");
        dibujarCentrosEnMapa(); 
    });

    // ==========================================
    // 6. CHATBOT Y MENSAJE DE INTRODUCCIÓN FUERA DEL CHAT
    // ==========================================
    const btnEnviar = document.getElementById('btn-enviar');
    const inputChat = document.getElementById('user-input');
    const chatBox = document.getElementById('chat-box');

    // 6.1 CREAR LA CAJA DE INSTRUCCIONES FUERA DEL CHAT
    const instruccionesCaja = document.createElement('div');
    instruccionesCaja.innerHTML = `
        <div style="background-color: #E8F5E9; border-left: 4px solid #315937; border-radius: 4px; padding: 12px; margin-bottom: 15px; font-size: 14px; color: #2E7D32; font-family: 'Segoe UI', Arial, sans-serif;">
            <b>💡 ¿Cómo usar a tu Asistente?</b><br>
            <span style="display: inline-block; margin-top: 5px;">🗣️ <b>Para conversar:</b> Cuéntale cómo te sientes si necesitas desahogarte.</span><br>
            <span style="display: inline-block; margin-top: 3px;">🏥 <b>Para buscar ayuda:</b> Pídele directamente un centro (ej: "Recomiéndame un lugar económico").</span><br>
            <span style="display: inline-block; margin-top: 3px;">📊 <b>Para graficar:</b> Dile tus emociones en números (ej: "Tengo 8 de ansiedad, dibuja un gráfico").</span>
        </div>
    `;
    
    // Insertar las instrucciones justo antes del contenedor del chat
    chatBox.parentNode.insertBefore(instruccionesCaja, chatBox);

    // 6.2 RESTAURAR EL SALUDO INICIAL DEL CHAT
    chatBox.innerHTML = `
        <div class="ai-msg">
            Hola, estoy aquí para escucharte y orientarte. ¿En qué te puedo ayudar hoy?
        </div>
    `;

    async function enviarMensaje() {
        const mensaje = inputChat.value.trim();
        if (!mensaje) return;

        window.historialChat.push({ "role": "user", "content": mensaje });

        chatBox.innerHTML += `<p class="user-msg">${mensaje}</p>`;
        inputChat.value = '';
        chatBox.scrollTop = chatBox.scrollHeight;

        const idEscribiendo = "typing-" + Date.now();
        chatBox.innerHTML += `<p class="ai-msg" id="${idEscribiendo}"><i>AcompañaMente está escribiendo...</i></p>`;
        chatBox.scrollTop = chatBox.scrollHeight;

        try {
            const peticion = await fetch(URL_APPS_SCRIPT, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' }, 
                body: JSON.stringify({ 
                    accion: "chat", 
                    historial: window.historialChat,
                    lat: window.userLat,
                    lng: window.userLng
                })
            });
            
            const data = await peticion.json();
            document.getElementById(idEscribiendo).remove();

            let textoRespuesta = data.respuesta;
            window.historialChat.push({ "role": "assistant", "content": textoRespuesta });

            let chartHTML = "";
            const chartMatch = textoRespuesta.match(/\[GR[AÁ]FICO:(.*?)\]/i);
            
            if (chartMatch) {
                let chartDataStr = chartMatch[1]; 
                textoRespuesta = textoRespuesta.replace(chartMatch[0], ''); 
                
                let labels = [];
                let values = [];
                
                chartDataStr.split(',').forEach(par => {
                    let partes = par.split('=');
                    if(partes.length === 2) { 
                        let emocion = partes[0].trim();
                        let valor = partes[1].replace(/[^0-9]/g, '').trim(); 
                        if(emocion && valor) {
                            labels.push(emocion); 
                            values.push(Number(valor)); 
                        }
                    }
                });

                if (labels.length > 0) {
                    let canvasId = 'chart-' + Date.now();
                    chartHTML = `
                        <div style="background: white; border-radius: 8px; padding: 10px; margin-top: 15px; border: 1px solid #ddd;">
                            <canvas id="${canvasId}" height="150"></canvas>
                        </div>`;
                    
                    setTimeout(() => {
                        let ctx = document.getElementById(canvasId).getContext('2d');
                        new Chart(ctx, {
                            type: 'bar',
                            data: {
                                labels: labels,
                                datasets: [{
                                    label: 'Intensidad Emocional',
                                    data: values,
                                    backgroundColor: ['#315937', '#6D8C72', '#E74C3C', '#94A696', '#56735D'],
                                    borderRadius: 4
                                }]
                            },
                            options: { 
                                responsive: true, 
                                scales: { y: { beginAtZero: true, max: 10 } },
                                plugins: { legend: { display: false } }
                            }
                        });
                    }, 150);
                }
            }

            let respuestaFormateada = textoRespuesta.replace(/(https?:\/\/[^\s]+)/g, '<br><a href="$1" target="_blank" style="display:inline-block; margin-top:10px; background:#56735D; color:white; padding:8px 12px; text-decoration:none; border-radius:5px; font-weight:bold;">📍 Ver Ruta en Google Maps</a>');
            
            chatBox.innerHTML += `<div class="ai-msg">${respuestaFormateada}${chartHTML}</div>`;
            chatBox.scrollTop = chatBox.scrollHeight;

        } catch (error) {
            document.getElementById(idEscribiendo).remove();
            chatBox.innerHTML += `<p class="ai-msg" style="color:#E74C3C;"><b>Error:</b> Problema de conexión.</p>`;
        }
    }

    if (btnEnviar) btnEnviar.addEventListener('click', enviarMensaje);
    if (inputChat) inputChat.addEventListener('keypress', e => { if (e.key === 'Enter') enviarMensaje(); });
});

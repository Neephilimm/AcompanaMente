document.addEventListener("DOMContentLoaded", function() {
    // ==========================================
    // 1. INICIALIZACIÓN DEL MAPA
    // ==========================================
    var map = L.map('map').setView([-33.4328, -70.6150], 14); 
    window.miMapaGlobal = map; 
    window.userLat = null; 
    window.userLng = null; 
    window.marcadoresCentros = {}; 

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
    var centrosLayer = L.layerGroup().addTo(map);

    const URL_APPS_SCRIPT = "https://script.google.com/macros/s/AKfycbzw-Ojl3VhtKLOsZwJUE7WWT-xzNPU5b5WDtQskBgEzg1y1vw2H8ez5b6gOpCxlowow/exec"; 
    let listaCentrosData = []; 

    // ==========================================
    // 2. CREACIÓN DE LISTA DE BÚSQUEDA (AUTOCOMPLETADO)
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
    // 3. FUNCIÓN PARA DIBUJAR LOS CENTROS (AL CLICAR)
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
    // 5. GPS: UBICACIÓN DEL USUARIO (PUNTO AZUL)
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

        L.circleMarker(e.latlng, {
            radius: 8,
            fillColor: '#007bef', 
            color: '#ffffff',    
            weight: 3,
            opacity: 1,
            fillOpacity: 0.9
        }).addTo(map).bindPopup("<b>Tu ubicación actual</b>").openPopup();
    });

    map.on('locationerror', function() {
        alert("No se pudo obtener tu ubicación. Mostrando los centros disponibles en la comuna.");
        dibujarCentrosEnMapa(); 
    });

    // ==========================================
    // 6. CHATBOT CON CONTEXTO
    // ==========================================
    const btnEnviar = document.getElementById('btn-enviar');
    const inputChat = document.getElementById('user-input');
    const chatBox = document.getElementById('chat-box');

    async function enviarMensaje() {
        const mensaje = inputChat.value.trim();
        if (!mensaje) return;

        chatBox.innerHTML += `<p class="user-msg">${mensaje}</p>`;
        inputChat.value = '';
        chatBox.scrollTop = chatBox.scrollHeight;

        const idEscribiendo = "typing-" + Date.now();
        // ESTA ES LA LÍNEA MODIFICADA CON EL TEXTO PROFESIONAL
        chatBox.innerHTML += `<p class="ai-msg" id="${idEscribiendo}"><i>AcompañaMente está escribiendo...</i></p>`;
        chatBox.scrollTop = chatBox.scrollHeight;

        try {
            const peticion = await fetch(URL_APPS_SCRIPT, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' }, 
                body: JSON.stringify({ 
                    accion: "chat", 
                    mensaje: mensaje,
                    lat: window.userLat,
                    lng: window.userLng
                })
            });
            
            const data = await peticion.json();
            document.getElementById(idEscribiendo).remove();

            let respuestaFormateada = data.respuesta.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" style="color: #315937; text-decoration: underline; font-weight: bold;">Ver en Google Maps</a>');
            
            chatBox.innerHTML += `<p class="ai-msg">${respuestaFormateada}</p>`;
            chatBox.scrollTop = chatBox.scrollHeight;

        } catch (error) {
            document.getElementById(idEscribiendo).remove();
            chatBox.innerHTML += `<p class="ai-msg" style="color:#E74C3C;"><b>Error:</b> Problema de conexión.</p>`;
        }
    }

    if (btnEnviar) btnEnviar.addEventListener('click', enviarMensaje);
    if (inputChat) inputChat.addEventListener('keypress', e => { if (e.key === 'Enter') enviarMensaje(); });
});

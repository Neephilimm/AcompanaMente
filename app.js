document.addEventListener("DOMContentLoaded", function() {
    // ==========================================
    // 1. INICIALIZACIÓN DEL MAPA
    // ==========================================
    var map = L.map('map').setView([-33.4328, -70.6150], 14); 
    window.miMapaGlobal = map; 
    window.userLat = null; // Guardará la latitud del usuario
    window.userLng = null; // Guardará la longitud del usuario
    window.marcadoresCentros = {}; // Guardará los centros para el buscador

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
    var centrosLayer = L.layerGroup().addTo(map);

    // ¡AQUÍ ESTÁ TU ENLACE INTEGRADO!
    const URL_APPS_SCRIPT = "https://script.google.com/macros/s/AKfycbzw-Ojl3VhtKLOsZwJUE7WWT-xzNPU5b5WDtQskBgEzg1y1vw2H8ez5b6gOpCxlowow/exec"; 

    // ==========================================
    // 2. CARGAR BASE DE DATOS Y CREAR LISTA DE BÚSQUEDA
    // ==========================================
    // Creamos la lista desplegable (datalist) invisible en el HTML
    const datalist = document.createElement('datalist');
    datalist.id = 'lista-centros-dinamica';
    document.body.appendChild(datalist);
    
    // Le asignamos esa lista al buscador que ya tienes en el HTML
    const inputBuscar = document.getElementById('buscador-centro');
    if (inputBuscar) inputBuscar.setAttribute('list', 'lista-centros-dinamica');

    async function cargarCentros() {
        try {
            const respuesta = await fetch(URL_APPS_SCRIPT + "?action=getCentros"); 
            const centros = await respuesta.json();

            centros.forEach(centro => {
                if(centro.Latitud && centro.Longitud) {
                    let lat = parseFloat(centro.Latitud);
                    let lng = parseFloat(centro.Longitud);
                    
                    // 1. Crear el marcador en el mapa
                    let infoHTML = `
                        <div style="font-family: Arial; font-size: 14px;">
                            <h3 style="color: #315937; margin-bottom: 5px;">${centro.Nombre}</h3>
                            <b>📍 Dirección:</b> ${centro.Ubicación}<br>
                            <b>💰 Valor:</b> ${centro.Valor_Individual}<br>
                            <b>📞 Contacto:</b> ${centro.Contacto}<br>
                            <b>⭐ Calificación:</b> ${centro.Calificacion}/5
                        </div>
                    `;
                    var marker = L.marker([lat, lng]).bindPopup(infoHTML);
                    centrosLayer.addLayer(marker);

                    // 2. Guardar el marcador en la memoria para el buscador
                    window.marcadoresCentros[centro.Nombre] = marker;

                    // 3. Agregar el nombre exacto a la lista desplegable
                    let opcion = document.createElement('option');
                    opcion.value = centro.Nombre;
                    datalist.appendChild(opcion);
                }
            });
        } catch (error) {
            console.error("Error al cargar Google Sheets:", error);
        }
    }
    
    // Ejecutamos la carga al iniciar
    cargarCentros();

    // ==========================================
    // 3. BUSCADOR DE CENTROS (AUTOCOMPLETADO)
    // ==========================================
    const btnBuscar = document.getElementById('btn-buscar-centro');

    function volarAlCentro() {
        const nombreSeleccionado = inputBuscar.value;
        const marcador = window.marcadoresCentros[nombreSeleccionado];
        
        if (marcador) {
            map.flyTo(marcador.getLatLng(), 16, { animate: true, duration: 1.5 });
            marcador.openPopup();
        } else {
            alert("Por favor, selecciona un centro válido de la lista desplegable.");
        }
    }

    if (btnBuscar) btnBuscar.addEventListener('click', volarAlCentro);
    if (inputBuscar) {
        inputBuscar.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') volarAlCentro();
        });
    }

    // ==========================================
    // 4. GPS Y UBICACIÓN DEL USUARIO
    // ==========================================
    const btnUbicar = document.getElementById('btn-ubicar');
    if (btnUbicar) {
        btnUbicar.addEventListener('click', function() {
            map.locate({setView: true, maxZoom: 16});
        });
    }

    map.on('locationfound', function(e) {
        var radius = e.accuracy / 2;
        L.marker(e.latlng).addTo(map).bindPopup("Estás aquí").openPopup();
        L.circle(e.latlng, radius).addTo(map);
        
        // ¡CRUCIAL! Guardamos las coordenadas para enviarlas al Chatbot
        window.userLat = e.latlng.lat;
        window.userLng = e.latlng.lng;
    });

    // ==========================================
    // 5. CHATBOT CON CONTEXTO COMPLETO
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
        chatBox.innerHTML += `<p class="ai-msg" id="${idEscribiendo}"><i>La IA está analizando tu consulta...</i></p>`;
        chatBox.scrollTop = chatBox.scrollHeight;

        try {
            const peticion = await fetch(URL_APPS_SCRIPT, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' }, 
                // ENVIAMOS EL MENSAJE + LAS COORDENADAS DEL USUARIO
                body: JSON.stringify({ 
                    accion: "chat", 
                    mensaje: mensaje,
                    lat: window.userLat,
                    lng: window.userLng
                })
            });
            
            const data = await peticion.json();
            document.getElementById(idEscribiendo).remove();

            // Convierte enlaces web en formato HTML para que sean clicables (como los links de Google Maps)
            let respuestaFormateada = data.respuesta.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" style="color: #315937; text-decoration: underline; font-weight: bold;">Ver en Google Maps</a>');
            
            chatBox.innerHTML += `<p class="ai-msg">${respuestaFormateada}</p>`;
            chatBox.scrollTop = chatBox.scrollHeight;

        } catch (error) {
            document.getElementById(idEscribiendo).remove();
            chatBox.innerHTML += `<p class="ai-msg" style="color:#E74C3C;"><b>Error:</b> Problema de conexión con el servidor.</p>`;
        }
    }

    if (btnEnviar) btnEnviar.addEventListener('click', enviarMensaje);
    if (inputChat) inputChat.addEventListener('keypress', e => { if (e.key === 'Enter') enviarMensaje(); });
});

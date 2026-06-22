document.addEventListener("DOMContentLoaded", function() {
    // ==========================================
    // 1. INICIALIZACIÓN DEL MAPA
    // ==========================================
    var map = L.map('map').setView([-33.4328, -70.6150], 14); // Centrado en Providencia
    window.miMapaGlobal = map; // Fundamental para que el buscador del HTML funcione

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
    }).addTo(map);

    var centrosLayer = L.layerGroup().addTo(map);

    // ==========================================
    // 2. CONEXIÓN A GOOGLE SHEETS (BASE DE DATOS)
    // ==========================================
    // PON AQUÍ TU ENLACE DE GOOGLE APPS SCRIPT
    const URL_APPS_SCRIPT = "https://script.google.com/macros/s/AKfycbzw-Ojl3VhtKLOsZwJUE7WWT-xzNPU5b5WDtQskBgEzg1y1vw2H8ez5b6gOpCxlowow/exec"; 

    async function cargarCentros() {
        try {
            // Hacemos la petición a tu script para traer los datos de Sheets
            const respuesta = await fetch(URL_APPS_SCRIPT + "?action=getCentros"); 
            const centros = await respuesta.json();

            centros.forEach(centro => {
                // Aquí usamos los nombres EXACTOS de las columnas de tu Google Sheet
                if(centro.Latitud && centro.Longitud) {
                    let infoHTML = `
                        <div style="font-family: Arial; font-size: 14px;">
                            <h3 style="color: #315937; margin-bottom: 5px;">${centro.Nombre}</h3>
                            <b>📍 Dirección:</b> ${centro.Ubicación}<br>
                            <b>💰 Valor:</b> ${centro.Valor_Individual}<br>
                            <b>📞 Contacto:</b> ${centro.Contacto}<br>
                            <b>⭐ Calificación:</b> ${centro.Calificacion}/5
                        </div>
                    `;
                    
                    var marker = L.marker([parseFloat(centro.Latitud), parseFloat(centro.Longitud)])
                                  .bindPopup(infoHTML);
                    centrosLayer.addLayer(marker);
                }
            });
        } catch (error) {
            console.error("Error al cargar los datos de Google Sheets:", error);
        }
    }
    
    // Si tienes tu URL puesta, esto cargará los pines automáticamente
    if (URL_APPS_SCRIPT !== "PEGA_TU_URL_AQUI") {
        cargarCentros();
    } else {
        console.warn("Falta agregar la URL de Google Apps Script para cargar los centros.");
    }

    // ==========================================
    // 3. BOTÓN DE UBICACIÓN GPS
    // ==========================================
    const btnUbicar = document.getElementById('btn-ubicar');
    if (btnUbicar) {
        btnUbicar.addEventListener('click', function() {
            map.locate({setView: true, maxZoom: 16});
        });
    }

    map.on('locationfound', function(e) {
        var radius = e.accuracy / 2;
        L.marker(e.latlng).addTo(map).bindPopup("Estás aquí (Aprox. " + Math.round(radius) + " metros)").openPopup();
        L.circle(e.latlng, radius).addTo(map);
    });

    map.on('locationerror', function(e) {
        alert("No pudimos obtener tu ubicación. Revisa si le diste permiso al navegador.");
    });

    // ==========================================
    // 4. CONEXIÓN CON EL CHATBOT (Llama 3.3 vía Groq)
    // ==========================================
    const btnEnviar = document.getElementById('btn-enviar');
    const inputChat = document.getElementById('user-input');
    const chatBox = document.getElementById('chat-box');

    async function enviarMensaje() {
        const mensaje = inputChat.value.trim();
        if (!mensaje) return;

        if (URL_APPS_SCRIPT === "PEGA_TU_URL_AQUI") {
            alert("Falta configurar la URL de Apps Script para usar el chatbot.");
            return;
        }

        // 1. Mostrar el mensaje del usuario en pantalla
        chatBox.innerHTML += `<p class="user-msg">${mensaje}</p>`;
        inputChat.value = '';
        chatBox.scrollTop = chatBox.scrollHeight;

        // 2. Mostrar indicador de "Escribiendo..."
        const idEscribiendo = "typing-" + Date.now();
        chatBox.innerHTML += `<p class="ai-msg" id="${idEscribiendo}"><i>La IA está analizando tu respuesta...</i></p>`;
        chatBox.scrollTop = chatBox.scrollHeight;

        try {
            // 3. Enviar el mensaje a tu Apps Script (que se conecta con Groq)
            const peticion = await fetch(URL_APPS_SCRIPT, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' }, 
                body: JSON.stringify({ accion: "chat", mensaje: mensaje })
            });
            
            const data = await peticion.json();
            
            // 4. Borrar "Escribiendo..."
            document.getElementById(idEscribiendo).remove();

            // 5. Mostrar la respuesta de la Inteligencia Artificial
            chatBox.innerHTML += `<p class="ai-msg">${data.respuesta}</p>`;
            chatBox.scrollTop = chatBox.scrollHeight;

        } catch (error) {
            document.getElementById(idEscribiendo).remove();
            chatBox.innerHTML += `<p class="ai-msg" style="color:#E74C3C;"><b>Error de conexión:</b> No pudimos comunicarnos con el servidor de IA en este momento.</p>`;
            console.error(error);
        }
    }

    if (btnEnviar) btnEnviar.addEventListener('click', enviarMensaje);
    if (inputChat) {
        inputChat.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') enviarMensaje();
        });
    }
});

document.addEventListener("DOMContentLoaded", function() {
    // 1. Inicializar el mapa y centrarlo en Providencia
    var map = L.map('map').setView([-33.4328, -70.6150], 14);

    // 2. Cargar el diseño visual del mapa (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
    }).addTo(map);

    // 3. Crear un grupo para guardar los marcadores
    var centrosLayer = L.layerGroup().addTo(map);

    // Marcadores de prueba (Aquí luego conectas tu Google Sheets de la arquitectura)
    var marcadoresPrueba = [
        { lat: -33.435, lng: -70.618, info: "<b>Cesfam Alfonso Leng</b><br>Atención primaria." },
        { lat: -33.428, lng: -70.605, info: "<b>Integramedica Providencia</b><br>Centro de atención privado." }
    ];

    // Dibujamos los pines en el mapa
    marcadoresPrueba.forEach(function(centro) {
        var marker = L.marker([centro.lat, centro.lng]).bindPopup(centro.info);
        centrosLayer.addLayer(marker);
    });

    // 4. GPS: Buscar mi ubicación
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
        alert("No pudimos obtener tu ubicación. Por favor, activa el GPS o dale permisos a tu navegador.");
    });

    // 5. Buscador de centros por texto
    const btnBuscar = document.getElementById('btn-buscar-centro');
    const inputBuscar = document.getElementById('buscador-centro');

    function buscarCentro() {
        const texto = inputBuscar.value.toLowerCase().trim();
        if (!texto) return;

        let encontrado = false;
        centrosLayer.eachLayer(function(layer) {
            if (layer.getPopup()) {
                const contenido = layer.getPopup().getContent().toLowerCase();
                if (contenido.includes(texto)) {
                    map.flyTo(layer.getLatLng(), 15, { animate: true, duration: 1.5 });
                    layer.openPopup();
                    encontrado = true;
                }
            }
        });

        if (!encontrado) alert("No encontramos ese centro. Intenta buscar por una sola palabra (ej: Cesfam).");
    }

    if (btnBuscar) btnBuscar.addEventListener('click', buscarCentro);
    if (inputBuscar) {
        inputBuscar.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') buscarCentro();
        });
    }

    // FIX: Hacemos que el mapa sea global para que las pestañas del HTML lo reconozcan
    window.miMapaGlobal = map;
});

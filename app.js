// ==========================================
// BUSCADOR DE CENTROS EN EL MAPA
// ==========================================
document.addEventListener("DOMContentLoaded", function() {
    const btnBuscar = document.getElementById('btn-buscar-centro');
    const inputBuscar = document.getElementById('buscador-centro');

    // Función que ejecuta la búsqueda
    function buscarEnMapa() {
        const textoBusqueda = inputBuscar.value.toLowerCase().trim();
        if (textoBusqueda === "") return;

        let encontrado = false;

        // Recorremos todas las capas del mapa buscando los marcadores
        map.eachLayer(function(layer) {
            // Verificamos si la capa es un marcador y si tiene un PopUp (el cuadro de texto)
            if (layer instanceof L.Marker && layer.getPopup() && layer.getPopup().getContent()) {
                const contenidoPopup = layer.getPopup().getContent().toLowerCase();
                
                // Si el texto del popup incluye lo que el usuario escribió
                if (contenidoPopup.includes(textoBusqueda)) {
                    // Volamos hacia las coordenadas de ese marcador
                    map.flyTo(layer.getLatLng(), 15, {
                        animate: true,
                        duration: 1.5 // Animación suave de 1.5 segundos
                    });
                    
                    // Abrimos la información del centro
                    layer.openPopup();
                    encontrado = true;
                }
            }
        });

        if (!encontrado) {
            alert("No encontramos ningún centro en el mapa con ese nombre. Intenta usar solo una palabra clave (ej: 'Integramedica').");
        }
    }

    // Activar búsqueda al hacer clic en el botón
    if (btnBuscar) {
        btnBuscar.addEventListener('click', buscarEnMapa);
    }

    // Activar búsqueda al presionar "Enter" en el teclado
    if (inputBuscar) {
        inputBuscar.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                buscarEnMapa();
            }
        });
    }
});

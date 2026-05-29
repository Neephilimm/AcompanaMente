async function buscarCentrosSalud(lat, lng) {
    // Ampliamos la consulta a hospitales, clínicas y centros médicos (nodos y áreas complejas)
    const query = `
        [out:json][timeout:25];
        (
          node(around:5000, ${lat}, ${lng})["amenity"~"hospital|clinic|doctors"];
          way(around:5000, ${lat}, ${lng})["amenity"~"hospital|clinic|doctors"];
          node(around:5000, ${lat}, ${lng})["healthcare"];
          way(around:5000, ${lat}, ${lng})["healthcare"];
        );
        out center;
    `;
    const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (!data.elements || data.elements.length === 0) {
            alert("No se encontraron centros de salud en un radio de 5 km en esta zona de OpenStreetMap.");
            return;
        }

        data.elements.forEach(element => {
            // Si el elemento es un área (way), 'out center' nos entrega la coordenada en element.center
            const markerLat = element.lat || (element.center && element.center.lat);
            const markerLng = element.lon || (element.center && element.center.lng);
            
            if (markerLat && markerLng) {
                const nombre = element.tags.name || "Centro de Atención / Hospital";
                let tipo = element.tags.amenity || element.tags.healthcare || "Centro de salud";
                
                // Traducimos términos comunes para mejorar la interfaz del usuario
                if (tipo === "hospital") tipo = "Hospital / Urgencias";
                if (tipo === "clinic") tipo = "Clínica / Centro Médico";
                if (tipo === "doctors") tipo = "Consultorio / Consulta Médica";

                L.marker([markerLat, markerLng]).addTo(map)
                 .bindPopup(`<b>${nombre}</b><br>Tipo: ${tipo}`);
            }
        });

    } catch (error) {
        console.error("Error al conectar con la API de mapas:", error);
    }
}

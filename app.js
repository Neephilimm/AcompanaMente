try {
    const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ prompt: texto })
    });
    
    const data = await response.json();
    document.getElementById(loadingId).remove();
    
    // Validamos qué estructura nos devolvió el servidor
    if (data.error) {
        chatBox.innerHTML += `<div class="ai-msg" style="color: red;"><b>Error del servidor:</b> ${data.error}</div>`;
    } else if (data.respuesta) {
        chatBox.innerHTML += `<div class="ai-msg">${data.respuesta}</div>`;
    } else {
        chatBox.innerHTML += `<div class="ai-msg" style="color: orange;">Error: Respuesta con formato desconocido.</div>`;
    }
    
} catch (error) {
    document.getElementById(loadingId).remove();
    chatBox.innerHTML += `<div class="ai-msg" style="color: red;">Error de conexión con Google Apps Script. Verifica la URL.</div>`;
    console.error("Error en IA:", error);
}

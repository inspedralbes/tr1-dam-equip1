import { defineStore } from 'pinia'
import { ref } from 'vue'

// provisional
const URL_SERVIDOR = 'ws://localhost:3000'

export const useConnectionStore = defineStore('connection', () => {
  const estat = ref('desconnectat') 
  let socket = null

  function connectar() {
    if (socket) return

    estat.value = 'connectant'
    socket = new WebSocket(URL_SERVIDOR)

    socket.onopen = () => {
      estat.value = 'connectat'
    }

    socket.onmessage = (event) => {
      try {
        const missatge = JSON.parse(event.data)
        gestionarMissatge(missatge)
      } catch (e) {
        console.error('Missatge no vàlid', event.data, e)
      }
    }

    socket.onclose = () => {
      estat.value = 'desconnectat'
      socket = null
    }

    socket.onerror = (e) => {
      console.error('Error de WebSocket', e)
    }
  }

  function enviar(missatge) {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      console.error('No es pot enviar: no hi ha connexió')
      return false
    }
    socket.send(JSON.stringify(missatge))
    return true
  }

  function desconnectar() {
    if (socket) socket.close()
  }

  function gestionarMissatge(missatge) {
    switch (missatge.type) {
      // aacabar de completar
      default:
        console.warn('Missatge desconegut', missatge)
    }
  }

  return { estat, connectar, enviar, desconnectar }
})
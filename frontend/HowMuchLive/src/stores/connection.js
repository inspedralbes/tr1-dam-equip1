import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useRoomStore } from '@/stores/room'
import { useGameStore } from '@/stores/game'

// provisonal, ordinador unai
const URL_SERVIDOR = 'ws://2.31.112.198:8090'

export const useConnectionStore = defineStore('connection', () => {
    const estat = ref('desconnectat')
    const errorServidor = ref(null)
    let socket = null
    let promesaConnexio = null

    function connectar() {
        if (promesaConnexio) return promesaConnexio

        promesaConnexio = new Promise((resolve, reject) => {
            estat.value = 'connectant'
            socket = new WebSocket(URL_SERVIDOR)

            socket.onopen = () => {
                estat.value = 'connectat'
                resolve()
            }

            socket.onmessage = (event) => {
                try {
                    const missatge = JSON.parse(event.data)
                    gestionarMissatge(missatge)
                } catch (e) {
                    console.error('Missatge no vàlid', event.data, e)
                }
            }

            socket.onerror = () => {
                reject(new Error('No s\'ha pogut connectar amb el servidor'))
            }

            socket.onclose = () => {
                estat.value = 'desconnectat'
                socket = null
                promesaConnexio = null
            }
        })

        return promesaConnexio
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
        const room = useRoomStore()
        const game = useGameStore()

        switch (missatge.type) {
            case 'roomCreated':
            case 'roomJoined':
                room.entrarSala(missatge)
                break
            case 'playerJoined':
            case 'playerLeft':
                room.actualitzarParticipants(missatge.players)
                break
            case 'categoryVoteStarted':
                game.iniciarVotacioCategories(missatge)
                break
            case 'categoryVoted':
                game.registrarVot(missatge)
                break
            case 'categorySelected':
                game.categoriaTriada(missatge)
                break
            case 'error':
                errorServidor.value = { code: missatge.code, message: missatge.message }
                break
            case 'roundStarted':
                game.iniciarRonda(missatge)
                break
            case 'playerVoted':
                game.registrarResposta(missatge)
                break
            case 'timerStarted':
                game.iniciarCompteEnrere(missatge.seconds)
                break
            case 'roundResults':
                game.mostrarResultats(missatge)
                break
            default:
                console.warn('Missatge desconegut', missatge)
        }
    }

    return { estat, errorServidor, connectar, enviar, desconnectar }
})
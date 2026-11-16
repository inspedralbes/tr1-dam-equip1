import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useGameStore = defineStore('game', () => {

    const fase = ref('LOBBY')
    const categories = ref([])
    const votsRebuts = ref(0)
    const totalJugadors = ref(0)
    const categoriaGuanyadora = ref('')
    const recompte = ref({})
    const vots = ref([])

    // Ronda de pregunta
    const ronda = ref(0)
    const totalRondes = ref(0)
    const pregunta = ref('')
    const minim = ref(null)
    const maxim = ref(null)
    const unitat = ref('')
    const respostes = ref([])

    function iniciarVotacioCategories(missatge) {
        categories.value = missatge.categories
        totalJugadors.value = missatge.totalPlayers
        votsRebuts.value = 0
        vots.value = []
        categoriaGuanyadora.value = ''
        recompte.value = {}
        fase.value = 'VOTING_CATEGORY'
    }

    function registrarVot(missatge) {
        const existent = vots.value.find((v) => v.id === missatge.id)
        if (existent) {
            existent.categoria = missatge.category
        } else {
            vots.value.push({ id: missatge.id, nom: missatge.name, categoria: missatge.category })
        }
        votsRebuts.value = missatge.votedCount
        totalJugadors.value = missatge.totalPlayers
    }

    function categoriaTriada(missatge) {
        categoriaGuanyadora.value = missatge.category
        recompte.value = missatge.votes
        fase.value = 'CATEGORY_CHOSEN'
    }

    function iniciarRonda(missatge) {
        ronda.value = missatge.round
        totalRondes.value = missatge.totalRounds ?? 0
        pregunta.value = missatge.question
        minim.value = missatge.min ?? null
        maxim.value = missatge.max ?? null
        unitat.value = missatge.unit ?? ''
        totalJugadors.value = missatge.totalPlayers
        respostes.value = []
        fase.value = 'QUESTION'
    }

    function registrarResposta(missatge) {
        if (!respostes.value.some((r) => r.id === missatge.id)) {
            respostes.value.push({ id: missatge.id, nom: missatge.name })
        }
        totalJugadors.value = missatge.totalPlayers
    }

    function reiniciar() {
        fase.value = 'LOBBY'
        categories.value = []
        votsRebuts.value = 0
        totalJugadors.value = 0
        categoriaGuanyadora.value = ''
        recompte.value = {}
        vots.value = []
        ronda.value = 0
        totalRondes.value = 0
        pregunta.value = ''
        minim.value = null
        maxim.value = null
        unitat.value = ''
        respostes.value = []
    }

    return {
        fase, categories, votsRebuts, totalJugadors, categoriaGuanyadora, recompte, vots,
        ronda, totalRondes, pregunta, minim, maxim, unitat, respostes,
        iniciarVotacioCategories, registrarVot, categoriaTriada, iniciarRonda, registrarResposta, reiniciar
    }
})
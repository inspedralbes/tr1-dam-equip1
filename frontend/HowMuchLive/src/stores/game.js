import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useGameStore = defineStore('game', () => {
    //Fase: 'LOBBY' | 'VOTING_CATEGORY' | 'CATEGORY_CHOSEN' | 'QUESTION' | 'ROUND_RESULTS'
    const fase = ref('LOBBY')

    //Per votar les categories
    const categories = ref([])
    const votsRebuts = ref(0)
    const totalJugadors = ref(0)
    const categoriaGuanyadora = ref('')
    const recompte = ref({})
    const vots = ref([])

    //Ronda de pregunta
    const ronda = ref(0)
    const totalRondes = ref(0)
    const pregunta = ref('')
    const minim = ref(null)
    const maxim = ref(null)
    const unitat = ref('')
    const respostes = ref([])
    const segonsRestants = ref(null)

    //Resultats de la ronda
    const respostaCorrecta = ref(null)
    const resultats = ref([])
    const classificacio = ref([])

    let intervalCompteEnrere = null

    function aturarCompteEnrere() {
        if (intervalCompteEnrere) {
            clearInterval(intervalCompteEnrere)
            intervalCompteEnrere = null
        }
        segonsRestants.value = null
    }

    function iniciarCompteEnrere(segons) {
        aturarCompteEnrere()
        segonsRestants.value = segons
        intervalCompteEnrere = setInterval(() => {
            segonsRestants.value--
            if (segonsRestants.value <= 0) {
                clearInterval(intervalCompteEnrere)
                intervalCompteEnrere = null
            }
        }, 1000)
    }

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
        aturarCompteEnrere()
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

    function mostrarResultats(missatge) {
        aturarCompteEnrere()
        ronda.value = missatge.round
        totalRondes.value = missatge.totalRounds ?? totalRondes.value
        unitat.value = missatge.unit ?? unitat.value
        respostaCorrecta.value = missatge.correctAnswer
        resultats.value = missatge.results
        classificacio.value = missatge.ranking
        fase.value = 'ROUND_RESULTS'
    }

    function reiniciar() {
        aturarCompteEnrere()
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
        respostaCorrecta.value = null
        resultats.value = []
        classificacio.value = []
    }

    return {
        fase, categories, votsRebuts, totalJugadors, categoriaGuanyadora, recompte, vots,
        ronda, totalRondes, pregunta, minim, maxim, unitat, respostes, segonsRestants,
        respostaCorrecta, resultats, classificacio,
        iniciarVotacioCategories, registrarVot, categoriaTriada, iniciarRonda, registrarResposta,
        iniciarCompteEnrere, mostrarResultats, reiniciar
    }
})
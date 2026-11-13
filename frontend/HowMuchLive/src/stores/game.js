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

    function reiniciar() {
        fase.value = 'LOBBY'
        categories.value = []
        votsRebuts.value = 0
        totalJugadors.value = 0
        categoriaGuanyadora.value = ''
        recompte.value = {}
        vots.value=[]
    }

    return { fase, categories, votsRebuts, totalJugadors, categoriaGuanyadora, recompte, vots, iniciarVotacioCategories, registrarVot, categoriaTriada, reiniciar }
})
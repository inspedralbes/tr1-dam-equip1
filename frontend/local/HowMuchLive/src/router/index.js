import { createRouter, createWebHistory, createWebHashHistory } from 'vue-router'
import { useRoomStore } from '@/stores/room'
import { useGameStore } from '@/stores/game'
import { useConnectionStore } from '@/stores/connection'

import IndexView from '@/views/IndexView.vue'
import SalaEsperaView from '@/views/SalaEsperaView.vue'
import VotacioCategoriesView from '@/views/VotacioCategoriesView.vue'
import PreguntaView from '@/views/PreguntaView.vue'
import ResultatsRondaView from '@/views/ResultatsRondaView.vue'
import FinalPartidaView from '@/views/FinalPartidaView.vue'
import AdminView from '@/views/AdminView.vue'

const isFileProtocol = typeof window !== 'undefined' && window.location.protocol === 'file:'
const useHashRouter = isFileProtocol || import.meta.env.VITE_ROUTER_MODE === 'hash'

const PHASE_TO_ROUTE = {
  LOBBY: 'sala-espera',
  VOTING_CATEGORY: 'categories',
  CATEGORY_CHOSEN: 'categories',
  QUESTION: 'pregunta',
  ROUND_RESULTS: 'resultats-ronda',
  GAME_OVER: 'final',
}

const router = createRouter({
  history: useHashRouter ? createWebHashHistory() : createWebHistory('/howmuch'),
  routes: [
    {
      path: '/',
      name: 'home',
      component: IndexView,
    },
    {
      path: '/game',
      redirect: '/',
    },
    {
      path: '/sala',
      name: 'sala-espera',
      component: SalaEsperaView,
    },
    {
      path: '/categories',
      name: 'categories',
      component: VotacioCategoriesView,
    },
    {
      path: '/pregunta',
      name: 'pregunta',
      component: PreguntaView,
    },
    {
      path: '/resultats',
      name: 'resultats-ronda',
      component: ResultatsRondaView,
    },
    {
      path: '/final',
      name: 'final',
      component: FinalPartidaView,
    },
    {
      path: '/admin',
      name: 'admin',
      component: AdminView,
    },
  ],
})

router.beforeEach((to) => {
  if (to.name === 'admin') return true

  const room = useRoomStore()
  const game = useGameStore()
  const connexio = useConnectionStore()

  if (!room.codi) {
    if (to.name !== 'home') {
      return { name: 'home', replace: true }
    }
    return true
  }

  if (to.name === 'home') {
    connexio.enviar({ type: 'leaveRoom' })
    connexio.desconnectar()
    game.reiniciar()
    room.sortir()
    return true
  }

  const expectedRoute = PHASE_TO_ROUTE[game.fase] || 'sala-espera'
  if (to.name !== expectedRoute) {
    return { name: expectedRoute, replace: true }
  }

  return true
})

export default router

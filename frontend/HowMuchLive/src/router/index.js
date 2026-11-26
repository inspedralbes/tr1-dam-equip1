import { createRouter, createWebHistory, createWebHashHistory } from 'vue-router'

import IndexView from '@/views/IndexView.vue'
import SalaEsperaView from '@/views/SalaEsperaView.vue'
import VotacioCategoriesView from '@/views/VotacioCategoriesView.vue'
import PreguntaView from '@/views/PreguntaView.vue'
import ResultatsRondaView from '@/views/ResultatsRondaView.vue'
import FinalPartidaView from '@/views/FinalPartidaView.vue'
import AdminView from '@/views/AdminView.vue'
import { useRoomStore } from '@/stores/room'
import { hiHaSessioGuardada } from '@/stores/connection'

// Pantalles que només tenen sentit si estàs dins d'una partida
const RUTES_PARTIDA = ['sala-espera', 'categories', 'pregunta', 'resultats-ronda', 'final']

const isFileProtocol = typeof window !== 'undefined' && window.location.protocol === 'file:'
const useHashRouter = isFileProtocol || import.meta.env.VITE_ROUTER_MODE === 'hash'

const router = createRouter({
  // En web fem servir /howmuch sense /#/; en Electron (file://) o mode local mantenim hash history
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
    // Qualsevol altra ruta -> inici
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

// Si no estàs en cap partida (ni n'hi ha cap de guardada per tornar-hi), cap a l'inici
router.beforeEach((to) => {
  if (!RUTES_PARTIDA.includes(to.name)) return true
  const room = useRoomStore()
  if (room.codi !== '' || hiHaSessioGuardada()) return true
  return { name: 'home' }
})

export default router

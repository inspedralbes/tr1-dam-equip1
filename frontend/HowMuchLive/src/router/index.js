import { createRouter, createWebHistory } from 'vue-router'

import IndexView from '@/views/IndexView.vue'
import SalaEsperaView from '@/views/SalaEsperaView.vue'
import VotacioCategoriesView from '@/views/VotacioCategoriesView.vue'
import PreguntaView from '@/views/PreguntaView.vue'
import ResultatsRondaView from '@/views/ResultatsRondaView.vue'
import FinalPartidaView from '@/views/FinalPartidaView.vue'


const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: IndexView,
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


  ],
})

export default router

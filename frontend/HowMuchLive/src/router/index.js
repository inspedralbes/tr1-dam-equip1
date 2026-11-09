import { createRouter, createWebHistory } from 'vue-router'

import IndexView from '@/views/IndexView.vue'
import SalaEsperaView from '@/views/SalaEsperaView.vue'


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


  ],
})

export default router

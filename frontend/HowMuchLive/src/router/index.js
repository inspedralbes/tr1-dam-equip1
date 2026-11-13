import { createRouter, createWebHistory } from 'vue-router'

import IndexView from '@/views/IndexView.vue'
import SalaEsperaView from '@/views/SalaEsperaView.vue'
import VotacioCategoriesView from '@/views/VotacioCategoriesView.vue'


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


  ],
})

export default router

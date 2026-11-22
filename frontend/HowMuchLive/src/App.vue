<script setup>
import { RouterView } from 'vue-router'
</script>

<template>
  <v-app>
    <RouterView v-slot="{ Component }">
      <Transition name="fade">
        <component :is="Component" />
      </Transition>
    </RouterView>
  </v-app>
</template>

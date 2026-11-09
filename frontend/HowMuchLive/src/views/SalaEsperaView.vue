<script setup>
import { useRoomStore } from '@/stores/room'

const room = useRoomStore()
</script>

<template>
    <v-container>
        <p>Sala {{ room.codi }}</p>
        <p>Participants: {{ room.nombreParticipants }}</p>
        <p v-for="p in room.participants" :key="p.nom">
            {{ p.nom }} <span v-if="p.esHost">(amfitrió)</span>
        </p>
    </v-container>
</template>
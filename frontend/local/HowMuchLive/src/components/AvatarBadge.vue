<script setup>
import { computed } from "vue";

const props = defineProps({
  avatarId: {
    type: Number,
    default: 0,
  },
  size: {
    type: Number,
    default: 44,
  },
  selected: {
    type: Boolean,
    default: false,
  },
  clickable: {
    type: Boolean,
    default: false,
  },
});

const AVATARS = [
  { id: 0, label: "Teal", bg: "#0d9488", ring: "#5eead4" },
  { id: 1, label: "Amber", bg: "#d97706", ring: "#fde68a" },
  { id: 2, label: "Cobalt", bg: "#2563eb", ring: "#93c5fd" },
  { id: 3, label: "Crimson", bg: "#e11d48", ring: "#fda4af" },
  { id: 4, label: "Violet", bg: "#7c3aed", ring: "#ddd6fe" },
  { id: 5, label: "Emerald", bg: "#059669", ring: "#a7f3d0" },
  { id: 6, label: "Coral", bg: "#ea580c", ring: "#fed7aa" },
  { id: 7, label: "Slate", bg: "#475569", ring: "#e2e8f0" },
];

const info = computed(() => AVATARS[Math.abs(Number(props.avatarId) || 0) % AVATARS.length]);
</script>

<template>
  <div
    class="avatar-badge"
    :class="{ 'is-clickable': clickable, 'is-selected': selected }"
    :style="{
      width: size + 'px',
      height: size + 'px',
      backgroundColor: info.bg,
      borderColor: selected ? '#ffffff' : info.ring,
    }"
  >
    <svg viewBox="0 0 36 36" class="avatar-svg" fill="none">
      <!-- 0: Concentric Target -->
      <template v-if="info.id === 0">
        <circle cx="18" cy="18" r="9.5" :stroke="info.ring" stroke-width="2.6" />
        <circle cx="18" cy="18" r="4" :fill="info.ring" />
      </template>
      <!-- 1: Diamond -->
      <template v-else-if="info.id === 1">
        <rect x="18" y="7" width="15.5" height="15.5" rx="2.5" transform="rotate(45 18 7)" :stroke="info.ring" stroke-width="2.5" />
        <circle cx="18" cy="18" r="3.2" :fill="info.ring" />
      </template>
      <!-- 2: Twin Vertical Bars -->
      <template v-else-if="info.id === 2">
        <rect x="10.5" y="9.5" width="5" height="17" rx="2.5" :fill="info.ring" />
        <rect x="20.5" y="9.5" width="5" height="17" rx="2.5" :fill="info.ring" />
      </template>
      <!-- 3: Crosshair -->
      <template v-else-if="info.id === 3">
        <rect x="15.5" y="8" width="5" height="20" rx="2.5" :fill="info.ring" />
        <rect x="8" y="15.5" width="20" height="5" rx="2.5" :fill="info.ring" />
      </template>
      <!-- 4: Prism Box -->
      <template v-else-if="info.id === 4">
        <rect x="9.5" y="9.5" width="17" height="17" rx="3.5" :stroke="info.ring" stroke-width="2.6" />
        <rect x="14.5" y="14.5" width="7" height="7" rx="1.5" :fill="info.ring" />
      </template>
      <!-- 5: Ascending Signal Bars -->
      <template v-else-if="info.id === 5">
        <rect x="8.5" y="19" width="4.5" height="8.5" rx="2" :fill="info.ring" />
        <rect x="15.75" y="14" width="4.5" height="13.5" rx="2" :fill="info.ring" />
        <rect x="23" y="9" width="4.5" height="18.5" rx="2" :fill="info.ring" />
      </template>
      <!-- 6: Dual Orbit -->
      <template v-else-if="info.id === 6">
        <circle cx="13" cy="18" r="4.5" :fill="info.ring" />
        <circle cx="23" cy="18" r="4.5" :stroke="info.ring" stroke-width="2.5" />
      </template>
      <!-- 7: Frame & Core -->
      <template v-else>
        <path d="M18 8L27 12.5V19.5C27 24.5 23 27.5 18 29C13 27.5 9 24.5 9 19.5V12.5L18 8Z" :stroke="info.ring" stroke-width="2.4" />
        <circle cx="18" cy="18.5" r="3.2" :fill="info.ring" />
      </template>
    </svg>
  </div>
</template>

<style scoped>
.avatar-badge {
  border-radius: 50%;
  border-style: solid;
  border-width: 2.5px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
}

.avatar-svg {
  width: 72%;
  height: 72%;
  display: block;
}

.is-clickable {
  cursor: pointer;
}

.is-clickable:hover {
  transform: translateY(-2px) scale(1.06);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.45);
}

.is-selected {
  box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.55), 0 6px 16px rgba(0, 0, 0, 0.45);
}
</style>

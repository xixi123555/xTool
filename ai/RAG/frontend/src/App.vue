<template>
  <div id="app-container" class="flex h-screen min-w-[900px] bg-white">
    <Sidebar />
    <main class="flex-1 overflow-hidden min-w-0">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import Sidebar from './components/Sidebar.vue'
</script>

<template>
  <aside class="w-[220px] h-screen bg-white border-r border-gray-200 flex flex-col shrink-0">
    <div class="px-5 pt-5 pb-4 border-b border-gray-100">
      <h1 class="text-lg font-bold text-gray-900 tracking-tight">AI 智能助手</h1>
    </div>

    <nav class="px-2.5 py-3 flex flex-col gap-1">
      <router-link to="/chat" class="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg no-underline text-gray-600 text-sm transition-colors hover:bg-gray-100 hover:text-gray-800 [&.router-link-active]:bg-green-50 [&.router-link-active]:text-green-500 [&.router-link-active]:font-medium">
        <span class="text-base w-5 text-center">💬</span>
        <span>AI 对话</span>
      </router-link>
      <router-link to="/upload" class="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg no-underline text-gray-600 text-sm transition-colors hover:bg-gray-100 hover:text-gray-800 [&.router-link-active]:bg-green-50 [&.router-link-active]:text-green-500 [&.router-link-active]:font-medium">
        <span class="text-base w-5 text-center">📁</span>
        <span>文件上传</span>
      </router-link>
    </nav>
  </aside>
</template>

<script setup>
</script>

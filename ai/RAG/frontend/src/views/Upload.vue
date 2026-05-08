<template>
  <div class="h-full overflow-y-auto bg-gray-100 flex justify-center py-10 px-6">
    <div class="w-full max-w-[640px] flex flex-col">
      <div class="flex items-baseline gap-3 mb-6">
        <h2 class="text-[22px] font-semibold text-gray-900">文件上传</h2>
        <span v-if="files.length" class="text-[13px] text-gray-400">{{ files.length }} 个文件</span>
      </div>

      <!-- 拖拽上传区域 -->
      <div
        class="border-2 border-dashed border-gray-300 rounded-xl py-12 px-6 text-center transition-all bg-white"
        :class="{ '!border-green-500 !bg-green-50': dragging }"
        @dragover.prevent="dragging = true"
        @dragleave.prevent="dragging = false"
        @drop.prevent="handleDrop"
      >
        <div class="text-5xl mb-3">📁</div>
        <p class="text-base text-gray-800 mb-1.5">拖拽 .txt / .md 文件到此处</p>
        <p class="text-[13px] text-gray-400 mb-4">或点击下方按钮选择文件</p>
        <label class="inline-block py-2 px-7 bg-green-500 text-white rounded-md text-sm cursor-pointer transition-colors hover:bg-green-600">
          选择文件
          <input
            type="file"
            accept=".txt,.md,.markdown,text/plain,text/markdown"
            multiple
            @change="handleFileSelect"
            hidden
          />
        </label>
      </div>

      <!-- 文件列表 -->
      <div v-if="files.length" class="mt-5">
        <div
          v-for="(file, idx) in files"
          :key="idx"
          class="flex items-center justify-between py-3.5 px-4 bg-white rounded-lg mb-2 border border-gray-100 gap-3"
        >
          <div class="flex flex-col gap-1 overflow-hidden flex-1">
            <span class="text-sm font-medium truncate" :title="file.name">{{ file.name }}</span>
            <span class="text-xs text-gray-400">{{ formatSize(file.size) }}</span>
          </div>
          <div class="flex items-center gap-3 shrink-0">
            <span
              class="text-xs"
              :class="{
                'text-gray-400': file.status === 'pending',
                'text-blue-500': file.status === 'uploading',
                'text-green-500': file.status === 'done',
                'text-red-500': file.status === 'error',
              }"
            >
              {{ statusText[file.status] }}
            </span>
            <button
              class="w-6 h-6 border-0 bg-transparent text-gray-300 text-sm cursor-pointer rounded-full flex items-center justify-center transition-all hover:text-red-500 hover:bg-red-50 disabled:cursor-not-allowed"
              @click="removeFile(idx)"
              :disabled="file.status === 'uploading'"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="mt-5 flex items-center justify-center text-gray-300 text-sm py-10">
        <p>暂无文件，请上传 .txt 或 Markdown（.md）文件</p>
      </div>

      <!-- 上传按钮 -->
      <button
        class="mt-5 w-full py-3 bg-green-500 text-white border-0 rounded-lg text-[15px] cursor-pointer transition-colors shrink-0 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
        :disabled="!files.length || uploading"
        @click="handleUpload"
      >
        {{ uploading ? '上传中...' : '开始上传' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { uploadFile } from '@/api/upload'

const dragging = ref(false)
const uploading = ref(false)
const files = ref([])

const statusText = {
  pending: '等待上传',
  uploading: '上传中',
  done: '已上传',
  error: '上传失败',
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

const markdownMime = new Set(['text/markdown', 'text/x-markdown', 'text/md'])

function isValidFile(file) {
  const name = (file.name || '').toLowerCase()
  return (
    name.endsWith('.txt') ||
    name.endsWith('.md') ||
    name.endsWith('.markdown') ||
    file.type === 'text/plain' ||
    markdownMime.has(file.type)
  )
}

function addFiles(fileList) {
  for (const f of fileList) {
    if (isValidFile(f)) {
      files.value.push({
        name: f.name,
        size: f.size,
        status: 'pending',
        raw: f,
      })
    }
  }
}

function handleDrop(e) {
  dragging.value = false
  addFiles(e.dataTransfer.files)
}

function handleFileSelect(e) {
  addFiles(e.target.files)
  e.target.value = ''
}

function removeFile(idx) {
  files.value.splice(idx, 1)
}

async function handleUpload() {
  uploading.value = true
  const pending = files.value.filter(f => f.status === 'pending')
  pending.forEach(f => (f.status = 'uploading'))

  for (const f of pending) {
    try {
      await uploadFile(f.raw)
      f.status = 'done'
    } catch {
      f.status = 'error'
    }
  }

  uploading.value = false
}
</script>

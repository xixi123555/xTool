<template>
  <div class="h-full flex flex-col bg-gray-100">
    <!-- 消息列表 -->
    <div class="flex-1 overflow-y-auto py-5 px-6 flex flex-col gap-5" ref="msgListRef">
      <div
        v-for="msg in messages"
        :key="msg.id"
        class="flex gap-2.5 max-w-[65%]"
        :class="msg.role === 'user' ? 'self-end flex-row-reverse' : 'self-start'"
      >
        <div class="w-9 h-9 rounded flex items-center justify-center text-lg shrink-0 select-none">
          {{ msg.role === 'user' ? '👤' : '🤖' }}
        </div>
        <div class="flex flex-col gap-1" :class="msg.role === 'user' ? 'items-end' : 'items-start'">
          <div
            class="px-3.5 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap break-words"
            :class="msg.role === 'user'
              ? 'bg-green-300 text-black rounded'
              : 'bg-white text-gray-800 rounded'"
          >
            {{ msg.content }}
          </div>
          <span class="text-[11px] text-gray-400 px-1">{{ msg.time }}</span>
        </div>
      </div>

      <!-- 正在输入 -->
      <div v-if="botTyping" class="flex gap-2.5 self-start max-w-[65%]">
        <div class="w-9 h-9 rounded flex items-center justify-center text-lg shrink-0">🤖</div>
        <div class="flex flex-col gap-1 items-start">
          <div class="px-4 py-3 bg-white rounded flex gap-1 items-center">
            <span class="dot w-2 h-2 rounded-full bg-gray-300 inline-block"></span>
            <span class="dot w-2 h-2 rounded-full bg-gray-300 inline-block"></span>
            <span class="dot w-2 h-2 rounded-full bg-gray-300 inline-block"></span>
          </div>
        </div>
      </div>
    </div>

    <!-- 输入区域 -->
    <div class="py-4 px-6 bg-white border-t border-gray-200 shrink-0">
      <div class="flex gap-3 items-center">
        <input
          v-model="inputText"
          class="flex-1 h-11 px-4 border border-gray-200 rounded-lg text-sm outline-none bg-gray-50 transition-colors focus:border-green-500"
          placeholder="输入消息..."
          @keyup.enter="sendMessage"
        />
        <button
          class="h-11 px-7 bg-green-500 text-white border-0 rounded-lg text-sm cursor-pointer transition-colors shrink-0 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          :disabled="!inputText.trim()"
          @click="sendMessage"
        >
          发送
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, nextTick, onMounted } from 'vue'
import { chatStream } from '@/api/chat'

let abortCtrl = null

const msgListRef = ref(null)
const inputText = ref('')
const botTyping = ref(false)

const messages = reactive([
  {
    id: 1,
    role: 'bot',
    content: '你好！我是 AI 智能助手 🤖\n有什么可以帮你的吗？',
    time: formatTime(new Date(Date.now() - 60000)),
  },
])

function formatTime(date) {
  const h = date.getHours().toString().padStart(2, '0')
  const m = date.getMinutes().toString().padStart(2, '0')
  return `${h}:${m}`
}

function scrollToBottom() {
  nextTick(() => {
    const el = msgListRef.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

function sendMessage() {
  const text = inputText.value.trim()
  if (!text) return

  messages.push({
    id: Date.now(),
    role: 'user',
    content: text,
    time: formatTime(new Date()),
  })
  inputText.value = ''
  scrollToBottom()

  botTyping.value = true
  scrollToBottom()

  // 创建一条空的 bot 消息，后续 SSE item 统一追加到这条消息
  const msgId = Date.now()
  messages.push({
    id: msgId,
    role: 'bot',
    content: '',
    time: formatTime(new Date()),
  })
  // 从 reactive 数组取代理引用，才能触发响应式更新
  const botMsg = messages[messages.length - 1]

  abortCtrl = chatStream(text, {
    onEvent: (sseItem) => {
      botTyping.value = false
      botMsg.content += sseItem.a
      scrollToBottom()
    },
    onDone: () => {
      botTyping.value = false
      abortCtrl = null
    },
    onError: () => {
      botTyping.value = false
      if (!botMsg.content) {
        botMsg.content = '请求失败，请稍后重试'
      }
      abortCtrl = null
      scrollToBottom()
    },
  })
}

onMounted(() => {
  scrollToBottom()
})
</script>

<style scoped>
.dot {
  animation: bounce 1.4s infinite ease-in-out both;
}

.dot:nth-child(1) { animation-delay: -0.32s; }
.dot:nth-child(2) { animation-delay: -0.16s; }

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}
</style>

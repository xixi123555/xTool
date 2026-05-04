import { createRouter, createWebHistory } from 'vue-router'
import Upload from '../views/Upload.vue'
import Chat from '../views/Chat.vue'

const routes = [
  { path: '/', redirect: '/chat' },
  { path: '/upload', component: Upload },
  { path: '/chat', component: Chat },
]

export default createRouter({
  history: createWebHistory(),
  routes,
})

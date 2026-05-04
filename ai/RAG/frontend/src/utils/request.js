import axios from 'axios'

class HttpClient {
  constructor() {
    this.instance = axios.create({
      baseURL: 'http://127.0.0.1:9000',
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' },
    })

    this.instance.interceptors.response.use(
      (res) => res.data,
      (err) => {
        console.error('[HTTP Error]', err.message)
        return Promise.reject(err)
      }
    )
  }

  get(url, params) {
    return this.instance.get(url, { params })
  }

  post(url, data, config = {}) {
    return this.instance.post(url, data, config)
  }

  put(url, data, config = {}) {
    return this.instance.put(url, data, config)
  }

  delete(url, params) {
    return this.instance.delete(url, { params })
  }
}

const http = new HttpClient()
export default http

import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json'
  }
})

export const createPayment = async (amount, authCode) => {
  try {
    const response = await api.post('/api/pay', {
      amount,
      authCode
    })
    return response.data
  } catch (error) {
    throw new Error(error.response?.data?.message || '支付请求失败')
  }
} 

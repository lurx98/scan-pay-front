import { defineStore } from 'pinia'
import { ref } from 'vue'

export const usePayStore = defineStore('pay', () => {
  const amount = ref('')
  const paymentStatus = ref('')
  
  function setAmount(newAmount) {
    amount.value = newAmount
  }
  
  function setPaymentStatus(status) {
    paymentStatus.value = status
  }

  return {
    amount,
    paymentStatus,
    setAmount,
    setPaymentStatus
  }
}) 

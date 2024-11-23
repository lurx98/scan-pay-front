<template>
  <div class="payment-view">
    <el-container>
      <el-header>
        <h2>扫码支付</h2>
      </el-header>
      <el-main>
        <QrCodePayment />
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import QrCodePayment from '../components/QrCodePayment.vue'
</script>

<style scoped>
.payment-view {
  padding: 20px;
}

.el-header {
  text-align: center;
  line-height: 60px;
}
</style> 

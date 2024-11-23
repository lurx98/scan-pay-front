<template>
  <div class="home">
    <el-container>
      <el-header>
        <h1>扫码支付系统</h1>
      </el-header>
      <el-main>
        <el-button type="primary" @click="goToPayment">
          开始支付
        </el-button>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const goToPayment = () => {
  router.push('/payment')
}
</script>

<style scoped>
.home {
  padding: 20px;
}

.el-header {
  text-align: center;
  line-height: 60px;
}

.el-main {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}
</style> 

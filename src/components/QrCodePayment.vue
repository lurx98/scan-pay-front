<template>
  <div class="payment-container">
    <!-- 支付表单 -->
    <div class="payment-form" :class="{ 'minimized': showScanner }">
      <el-form :model="formData" label-width="100px">
        <el-form-item label="支付金额">
          <el-input 
            v-model="formData.amount" 
            type="number" 
            placeholder="请输入支付金额"
          >
            <template #append>元</template>
          </el-input>
        </el-form-item>
        
        <el-form-item>
          <el-button 
            type="primary" 
            @click="startScan"
            :disabled="showScanner"
            :loading="scanning"
          >
            {{ showScanner ? '扫描中...' : '开始扫码' }}
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 扫码区域 -->
    <div v-show="showScanner" class="scanner-wrapper">
      <div class="scanner-container">
        <video 
          ref="videoRef"
          class="scanner-video"
          autoplay
          playsinline
        ></video>
        
        <!-- 用于处理视频帧的隐藏canvas -->
        <canvas 
          ref="canvasRef" 
          class="hidden-canvas"
          style="display: none;"
        ></canvas>
        
        <!-- 扫描框 -->
        <div class="scan-area">
          <div class="corner-lt"></div>
          <div class="corner-rt"></div>
          <div class="corner-lb"></div>
          <div class="corner-rb"></div>
          
          <!-- 扫描线动画 -->
          <div class="scan-line"></div>
        </div>

        <!-- 扫描状态提示 -->
        <div class="scan-status" :class="{ 'success': scanSuccess }">
          {{ scanStatusText }}
        </div>
      </div>

      <!-- 控制按钮 -->
      <div class="scanner-controls">
        <el-button 
          type="danger" 
          round 
          @click="stopScan"
          icon="Close"
        >
          停止扫描
        </el-button>
        
        <el-button 
          type="primary" 
          round 
          @click="toggleTorch"
          icon="Light"
          v-if="hasTorch"
        >
          {{ isTorchOn ? '关闭照明' : '打开照明' }}
        </el-button>
      </div>
    </div>

    <!-- 支付结果弹窗 -->
    <el-dialog
      v-model="paymentDialog.visible"
      :title="paymentDialog.title"
      width="80%"
      :show-close="false"
      center
    >
      <div class="payment-result">
        <el-icon :class="paymentDialog.iconClass" :size="50">
          <component :is="paymentDialog.icon"></component>
        </el-icon>
        <p>{{ paymentDialog.message }}</p>
      </div>
      <template #footer>
        <el-button @click="handlePaymentClose">关闭</el-button>
        <el-button 
          type="primary" 
          @click="startScan" 
          v-if="paymentDialog.showRetry"
        >
          重新扫码
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { 
  Check, 
  Warning,
} from '@element-plus/icons-vue'
import jsQR from 'jsqr'
import axios from 'axios'

// 响应式状态
const videoRef = ref(null)
const canvasRef = ref(null)
const showScanner = ref(false)
const scanning = ref(false)
const scanSuccess = ref(false)
const scanStatusText = ref('对准二维码/条码')
const hasTorch = ref(false)
const isTorchOn = ref(false)

// 支付表单数据
const formData = reactive({
  amount: ''
})

// 支付结果弹窗数据
const paymentDialog = reactive({
  visible: false,
  title: '',
  message: '',
  icon: '',
  iconClass: '',
  showRetry: false
})

// 全局变量
let stream = null
let scanInterval = null

// 显示支付结果
const showPaymentResult = (success, message) => {
  paymentDialog.visible = true
  paymentDialog.title = success ? '支付成功' : '支付失败'
  paymentDialog.message = message
  paymentDialog.icon = success ? Check : Warning
  paymentDialog.iconClass = success ? 'success-icon' : 'warning-icon'
  paymentDialog.showRetry = !success
}

// 关闭支付结果弹窗
const handlePaymentClose = () => {
  paymentDialog.visible = false
  if (!paymentDialog.showRetry) {
    // 支付成功后重置表单
    formData.amount = ''
    showScanner.value = false
  }
}

// 处理支付
const handlePayment = async (qrCode) => {
  try {
    scanStatusText.value = '正在处理支付...'
    scanSuccess.value = true
    
    // 停止扫描
    clearInterval(scanInterval)
    
    const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/pay`, {
      amount: formData.amount,
      authCode: qrCode
    })

    if (response.data.success) {
      showPaymentResult(true, '支付成功！')
    } else {
      throw new Error(response.data.message || '支付失败')
    }
  } catch (error) {
    console.error('支付错误:', error)
    showPaymentResult(false, error.message || '支付处理失败')
    scanSuccess.value = false
    scanStatusText.value = '支付失败，请重试'
  }
}

// 验证支付码格式
const isValidPaymentCode = (code) => {
  // 支付宝付款码格式为 25-30 位数字
  const paymentCodeRegex = /^\d{25,30}$/
  return paymentCodeRegex.test(code)
}

// 扫描二维码
const scanQRCode = () => {
  if (!videoRef.value || !canvasRef.value) return

  const video = videoRef.value
  const canvas = canvasRef.value
  const context = canvas.getContext('2d')

  // 设置 canvas 尺寸与视频一致
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight

  // 在 canvas 上绘制当前视频帧
  context.drawImage(video, 0, 0, canvas.width, canvas.height)
  
  // 获取图像数据
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
  
  // 使用 jsQR 识别二维码
  const code = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: "dontInvert",
  })

  if (code) {
      alert(code.data)
    // 检查是否是支付码格式
    if (isValidPaymentCode(code.data)) {
      handlePayment(code.data)
    }
  }
}

// 开始扫描
const startScan = async () => {
  if (!formData.amount) {
    ElMessage.warning('请先输入支付金额')
    return
  }

  scanning.value = true
  
  try {
    stream = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        facingMode: 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    })
    
    await nextTick()
    
    if (videoRef.value) {
      videoRef.value.srcObject = stream
      showScanner.value = true
      
      // 检查是否支持手电筒
      const track = stream.getVideoTracks()[0]
      const capabilities = track.getCapabilities()
      hasTorch.value = !!capabilities.torch
      
      // 等待视频加载完成
      videoRef.value.onloadedmetadata = () => {
        videoRef.value.play()
        // 开始定期扫描
        scanInterval = setInterval(scanQRCode, 200) // 每200ms扫描一次
      }
    }
  } catch (error) {
    console.error('摄像头访问错误:', error)
    ElMessage.error('无法访问摄像头：' + error.message)
  } finally {
    scanning.value = false
  }
}

// 停止扫描
const stopScan = () => {
  if (scanInterval) {
    clearInterval(scanInterval)
    scanInterval = null
  }
  
  if (stream) {
    stream.getTracks().forEach(track => track.stop())
    if (videoRef.value) {
      videoRef.value.srcObject = null
    }
    showScanner.value = false
    scanSuccess.value = false
    scanStatusText.value = '对准二维码/条码'
  }
}

// 切换手电筒
const toggleTorch = async () => {
  if (!stream) return
  
  const track = stream.getVideoTracks()[0]
  try {
    await track.applyConstraints({
      advanced: [{ torch: !isTorchOn.value }]
    })
    isTorchOn.value = !isTorchOn.value
    ElMessage.success(isTorchOn.value ? '已开启照明' : '已关闭照明')
  } catch (e) {
    ElMessage.error('无法控制闪光灯')
  }
}

// 组件卸载时清理资源
onUnmounted(() => {
  stopScan()
})
</script>

<style scoped>
.payment-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  min-height: 100vh;
}

.payment-form {
  transition: all 0.3s ease;
}

.payment-form.minimized {
  max-height: 100px;
  opacity: 0.8;
}

.scanner-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #000;
  z-index: 1000;
  display: flex;
  flex-direction: column;
}

.scanner-container {
  position: relative;
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
}

.scanner-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.scan-area {
  position: absolute;
  width: 70%;
  height: 40%;
  max-width: 300px;
  max-height: 300px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
}

/* 扫描框四角 */
.corner-lt, .corner-rt, .corner-lb, .corner-rb {
  position: absolute;
  width: 20px;
  height: 20px;
  border-color: #409EFF;
  border-style: solid;
  border-width: 3px;
}

.corner-lt {
  top: -3px;
  left: -3px;
  border-right: none;
  border-bottom: none;
}

.corner-rt {
  top: -3px;
  right: -3px;
  border-left: none;
  border-bottom: none;
}

.corner-lb {
  bottom: -3px;
  left: -3px;
  border-right: none;
  border-top: none;
}

.corner-rb {
  bottom: -3px;
  right: -3px;
  border-left: none;
  border-top: none;
}

/* 扫描线动画 */
.scan-line {
  position: absolute;
  width: 100%;
  height: 2px;
  background: #409EFF;
  animation: scan 2s linear infinite;
}

@keyframes scan {
  0% {
    top: 0;
  }
  100% {
    top: 100%;
  }
}

.scan-status {
  position: absolute;
  bottom: -50px;
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 16px;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  border-radius: 4px;
  transition: all 0.3s;
  white-space: nowrap;
}

.scan-status.success {
  background: rgba(103, 194, 58, 0.9);
}

.scanner-controls {
  padding: 20px;
  display: flex;
  justify-content: center;
  gap: 20px;
  background: rgba(0, 0, 0, 0.8);
}

.hidden-canvas {
  position: absolute;
  top: -9999px;
  left: -9999px;
}

.payment-result {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
  padding: 20px 0;
}

.success-icon {
  color: #67C23A;
}

.warning-icon {
  color: #E6A23C;
}

.error-icon {
  color: #F56C6C;
}
</style>

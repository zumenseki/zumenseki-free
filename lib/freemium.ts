// 無料版の制限管理ユーティリティ（簡素化版）

export interface UsageStats {
  savedMeasurements: number
}

export const FREE_LIMITS = {
  MAX_SAVED_MEASUREMENTS: 1,
  MAX_FILE_SIZE_MB: 5,
}

// ブラウザ環境チェック
const isBrowser = typeof window !== 'undefined'

// 使用状況を取得（保存数のみ）
export const getUsageStats = (): UsageStats => {
  if (!isBrowser) {
    return {
      savedMeasurements: 0,
    }
  }

  try {
    const saved = localStorage.getItem('zumenseki-usage-stats')
    if (saved) {
      const stats = JSON.parse(saved)
      return {
        savedMeasurements: stats.savedMeasurements || 0,
      }
    }
  } catch (error) {
    console.error('使用状況の取得に失敗:', error)
  }
  
  const defaultStats = {
    savedMeasurements: 0,
  }
  
  if (isBrowser) {
    localStorage.setItem('zumenseki-usage-stats', JSON.stringify(defaultStats))
  }
  
  return defaultStats
}

// 使用状況を更新
export const updateUsageStats = (updates: Partial<UsageStats>) => {
  if (!isBrowser) {
    return getUsageStats()
  }

  const current = getUsageStats()
  const updated = { ...current, ...updates }
  localStorage.setItem('zumenseki-usage-stats', JSON.stringify(updated))
  return updated
}

// 保存数を増加
export const incrementSavedMeasurements = () => {
  if (!isBrowser) {
    return getUsageStats()
  }

  const stats = getUsageStats()
  return updateUsageStats({
    savedMeasurements: stats.savedMeasurements + 1
  })
}

// 制限チェック関数（測定回数制限は削除）
export const canMeasure = (): boolean => {
  return true // 常に測定可能
}

export const canSave = (): boolean => {
  const stats = getUsageStats()
  return stats.savedMeasurements < FREE_LIMITS.MAX_SAVED_MEASUREMENTS
}

export const canUploadFile = (fileSizeBytes: number): boolean => {
  const fileSizeMB = fileSizeBytes / (1024 * 1024)
  return fileSizeMB <= FREE_LIMITS.MAX_FILE_SIZE_MB
}

// 残り保存数を取得
export const getRemainingStorage = (): number => {
  const stats = getUsageStats()
  return Math.max(0, FREE_LIMITS.MAX_SAVED_MEASUREMENTS - stats.savedMeasurements)
}


import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Ruler, HardDrive, Crown } from "lucide-react"
import { getUsageStats, getRemainingMeasurements, getRemainingStorage, FREE_LIMITS } from "@/lib/freemium"

interface UsageStatsProps {
  onUpgradeClick: () => void
}

export default function UsageStats({ onUpgradeClick }: UsageStatsProps) {
  const [mounted, setMounted] = useState(false)
  const [stats, setStats] = useState({
    measurementCount: 0,
    savedMeasurements: 0,
    remainingMeasurements: FREE_LIMITS.DAILY_MEASUREMENTS,
    remainingStorage: FREE_LIMITS.MAX_SAVED_MEASUREMENTS
  })

  useEffect(() => {
    setMounted(true)
    
    // クライアントサイドでのみ実行
    const usageStats = getUsageStats()
    setStats({
      measurementCount: usageStats.measurementCount,
      savedMeasurements: usageStats.savedMeasurements,
      remainingMeasurements: getRemainingMeasurements(),
      remainingStorage: getRemainingStorage()
    })
  }, [])

  // サーバーサイドレンダリング時はローディング状態を表示
  if (!mounted) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span>無料版の使用状況</span>
            <Button variant="outline" size="sm" disabled>
              <Crown className="w-4 h-4 mr-1" />
              プレミアム版
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-2 bg-gray-200 rounded mb-4"></div>
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-2 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const measurementProgress = (stats.measurementCount / FREE_LIMITS.DAILY_MEASUREMENTS) * 100
  const storageProgress = (stats.savedMeasurements / FREE_LIMITS.MAX_SAVED_MEASUREMENTS) * 100

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span>無料版の使用状況</span>
          <Button 
            variant="outline" 
            size="sm"
            onClick={onUpgradeClick}
            className="hover:bg-amber-50 hover:border-amber-300"
          >
            <Crown className="w-4 h-4 mr-1" />
            プレミアム版
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 測定回数 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Ruler className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium">今日の測定回数</span>
            </div>
            <span className="text-sm text-gray-600">
              {stats.measurementCount} / {FREE_LIMITS.DAILY_MEASUREMENTS}
            </span>
          </div>
          <Progress value={measurementProgress} className="h-2" />
          <p className="text-xs text-gray-500 mt-1">
            あと{stats.remainingMeasurements}回測定できます
          </p>
        </div>

        {/* 保存済み測定 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium">保存済み測定</span>
            </div>
            <span className="text-sm text-gray-600">
              {stats.savedMeasurements} / {FREE_LIMITS.MAX_SAVED_MEASUREMENTS}
            </span>
          </div>
          <Progress value={storageProgress} className="h-2" />
          <p className="text-xs text-gray-500 mt-1">
            あと{stats.remainingStorage}件保存できます
          </p>
        </div>

        {/* 制限情報 */}
        <div className="pt-2 border-t text-xs text-gray-500 space-y-1">
          <div>• ファイルサイズ制限: {FREE_LIMITS.MAX_FILE_SIZE_MB}MB以下</div>
          <div>• 長さ測定機能: プレミアム版のみ</div>
          <div>• 測定回数は毎日リセットされます</div>
        </div>
      </CardContent>
    </Card>
  )
}


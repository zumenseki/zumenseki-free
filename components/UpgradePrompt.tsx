import React from 'react'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Crown, Zap, ArrowRight, Star } from "lucide-react"

interface UpgradePromptProps {
  onUpgradeClick: () => void
  variant: 'header' | 'feature-locked' | 'limit-warning'
  remainingCount?: number
}

export default function UpgradePrompt({ onUpgradeClick, variant, remainingCount }: UpgradePromptProps) {
  if (variant === 'header') {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">プレミアム版で全機能を解放</h3>
              <p className="text-sm text-gray-600">無制限測定・長さ測定・高度な機能が使い放題</p>
            </div>
          </div>
          <Button 
            onClick={onUpgradeClick}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <Star className="w-4 h-4 mr-2" />
            今すぐアップグレード
          </Button>
        </div>
      </div>
    )
  }

  if (variant === 'feature-locked') {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Crown className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h4 className="font-medium text-amber-900">プレミアム機能</h4>
                <p className="text-sm text-amber-700">この機能はプレミアム版でご利用いただけます</p>
              </div>
            </div>
            <Button 
              onClick={onUpgradeClick}
              size="sm"
              className="bg-amber-600 hover:bg-amber-700"
            >
              <Zap className="w-3 h-3 mr-1" />
              解放する
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (variant === 'limit-warning' && remainingCount !== undefined) {
    const isLowCount = remainingCount <= 1
    
    return (
      <Card className={`border-2 ${isLowCount ? 'border-red-200 bg-red-50' : 'border-orange-200 bg-orange-50'}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isLowCount ? 'bg-red-100' : 'bg-orange-100'}`}>
                <Crown className={`w-5 h-5 ${isLowCount ? 'text-red-600' : 'text-orange-600'}`} />
              </div>
              <div>
                <h4 className={`font-medium ${isLowCount ? 'text-red-900' : 'text-orange-900'}`}>
                  {isLowCount ? '測定回数がもうすぐ上限です' : '測定回数に注意'}
                </h4>
                <p className={`text-sm ${isLowCount ? 'text-red-700' : 'text-orange-700'}`}>
                  あと{remainingCount}回測定できます。プレミアム版なら無制限！
                </p>
              </div>
            </div>
            <Button 
              onClick={onUpgradeClick}
              size="sm"
              className={`${isLowCount ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-600 hover:bg-orange-700'}`}
            >
              <ArrowRight className="w-3 h-3 mr-1" />
              アップグレード
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return null
}


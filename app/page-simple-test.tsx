"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Crown, Ruler, Square, Upload, Sparkles } from "lucide-react"
import UpgradeModal from "@/components/UpgradeModal-new"
import UpgradePrompt from "@/components/UpgradePrompt"

export default function PDFAreaCalculatorSimple() {
  // 状態管理
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [upgradeReason, setUpgradeReason] = useState<'measurements' | 'length' | 'storage' | 'filesize'>('length')
  
  // プレミアム機能の状態
  const [isPremium, setIsPremium] = useState(false)

  // プレミアム機能の有効化
  const handleUpgrade = () => {
    setIsPremium(true)
  }

  // 長さ測定ボタンのクリック処理
  const handleLengthMeasurement = () => {
    if (!isPremium) {
      setUpgradeReason('length')
      setShowUpgradeModal(true)
      return
    }
    alert('プレミアム機能：長さ測定が有効化されました！')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Square className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">ズメンセキ</h1>
                <p className="text-sm text-gray-600">PDF面積測定ツール</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isPremium ? (
                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500">
                  <Crown className="w-3 h-3 mr-1" />
                  プレミアム版
                </Badge>
              ) : (
                <Badge variant="outline">無料版</Badge>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* プロモーションバナー（無料版のみ） */}
      {!isPremium && (
        <UpgradePrompt onUpgradeClick={() => {
          setUpgradeReason('length')
          setShowUpgradeModal(true)
        }} />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* メインエリア */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Square className="w-5 h-5" />
                    PDF面積測定（テスト版）
                  </h2>
                </div>

                {/* テスト用エリア */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <div className="space-y-4">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">テスト版アプリ</h3>
                    <p className="text-gray-600 mb-4">プレミアム機能トグルのテストができます</p>
                    
                    {/* 測定コントロール */}
                    <div className="flex flex-wrap gap-2 justify-center">
                      <Button
                        onClick={() => alert('面積測定機能（無料版）')}
                        variant="default"
                      >
                        <Square className="w-4 h-4 mr-2" />
                        面積測定
                      </Button>
                      
                      <Button
                        onClick={handleLengthMeasurement}
                        variant="outline"
                        className="relative"
                      >
                        <Ruler className="w-4 h-4 mr-2" />
                        長さ測定
                        {!isPremium && (
                          <Crown className="w-3 h-3 ml-1 text-amber-500" />
                        )}
                      </Button>
                    </div>

                    <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-700">
                        {isPremium ? (
                          <span className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4" />
                            プレミアム機能が有効化されています！
                          </span>
                        ) : (
                          '長さ測定ボタンをクリックしてプレミアム機能をお試しください'
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* サイドバー */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3">機能テスト</h3>
                <div className="space-y-3">
                  <div className="text-sm">
                    <strong>無料版機能:</strong>
                    <ul className="list-disc list-inside mt-1 text-gray-600">
                      <li>面積測定</li>
                      <li>基本的なPDF表示</li>
                    </ul>
                  </div>
                  <div className="text-sm">
                    <strong>プレミアム機能:</strong>
                    <ul className="list-disc list-inside mt-1 text-gray-600">
                      <li>長さ測定</li>
                      <li>高度な測定ツール</li>
                      <li>無制限保存</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3">テスト手順</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>1. 「長さ測定」ボタンをクリック</p>
                  <p>2. アップグレードモーダルが表示</p>
                  <p>3. 「今すぐ体験する」をクリック</p>
                  <p>4. プレミアム機能が有効化</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* アップグレードモーダル */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onUpgrade={handleUpgrade}
        reason={upgradeReason}
      />
    </div>
  )
}


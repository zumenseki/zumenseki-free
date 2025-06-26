"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Crown, Ruler, Square, Upload, Trash2, Download, Save, Sparkles } from "lucide-react"
import UpgradeModal from "@/components/UpgradeModal-new"
import UpgradePrompt from "@/components/UpgradePrompt"

// PDF.js関連のインポート
import * as pdfjsLib from 'pdfjs-dist'

// PDF.jsワーカーの設定
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`
}


interface Point {
  x: number
  y: number
}

interface Measurement {
  id: string
  name: string
  type: 'area' | 'length'
  points: Point[]
  value: number
  unit: string
  color: string
}

export default function PDFAreaCalculator() {
  // 状態管理
  const [pdfDoc, setPdfDoc] = useState<any>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [scale, setScale] = useState(1)
  const [realWorldScale, setRealWorldScale] = useState(1)
  const [unit, setUnit] = useState('mm')
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [currentMeasurement, setCurrentMeasurement] = useState<Point[]>([])
  const [measurementType, setMeasurementType] = useState<'area' | 'length'>('area')
  const [isDrawing, setIsDrawing] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [upgradeReason, setUpgradeReason] = useState<'measurements' | 'length' | 'storage' | 'filesize'>('length')
  
  // プレミアム機能の状態
  const [isPremium, setIsPremium] = useState(false)
  
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    setMeasurementType('length')
    setIsDrawing(true)
    setCurrentMeasurement([])
  }

  // ファイルアップロード処理
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // ファイルサイズチェック（無料版は5MB制限）
    if (!isPremium && file.size > 5 * 1024 * 1024) {
      setUpgradeReason('filesize')
      setShowUpgradeModal(true)
      return
    }

    try {
      const arrayBuffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      setPdfDoc(pdf)
      setCurrentPage(1)
      renderPage(pdf, 1)
    } catch (error) {
      console.error('PDF読み込みエラー:', error)
    }
  }

  // PDFページのレンダリング
  const renderPage = async (pdf: any, pageNum: number) => {
    const page = await pdf.getPage(pageNum)
    const canvas = canvasRef.current
    if (!canvas) return

    const context = canvas.getContext('2d')
    if (!context) return

    const viewport = page.getViewport({ scale })
    canvas.width = viewport.width
    canvas.height = viewport.height

    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise

    // 測定結果を再描画
    drawMeasurements(context)
  }

  // 測定結果の描画
  const drawMeasurements = (context: CanvasRenderingContext2D) => {
    measurements.forEach((measurement) => {
      context.strokeStyle = measurement.color
      context.lineWidth = 2
      context.beginPath()

      if (measurement.type === 'area' && measurement.points.length > 2) {
        // 面積測定の描画
        context.moveTo(measurement.points[0].x, measurement.points[0].y)
        for (let i = 1; i < measurement.points.length; i++) {
          context.lineTo(measurement.points[i].x, measurement.points[i].y)
        }
        context.closePath()
        context.stroke()
        
        // 塗りつぶし
        context.fillStyle = measurement.color + '20'
        context.fill()
      } else if (measurement.type === 'length' && measurement.points.length === 2) {
        // 長さ測定の描画
        context.moveTo(measurement.points[0].x, measurement.points[0].y)
        context.lineTo(measurement.points[1].x, measurement.points[1].y)
        context.stroke()
      }
    })

    // 現在の測定を描画
    if (currentMeasurement.length > 0) {
      context.strokeStyle = '#3b82f6'
      context.lineWidth = 2
      context.beginPath()
      
      if (measurementType === 'area') {
        context.moveTo(currentMeasurement[0].x, currentMeasurement[0].y)
        for (let i = 1; i < currentMeasurement.length; i++) {
          context.lineTo(currentMeasurement[i].x, currentMeasurement[i].y)
        }
        if (currentMeasurement.length > 2) {
          context.closePath()
        }
      } else if (measurementType === 'length' && currentMeasurement.length === 2) {
        context.moveTo(currentMeasurement[0].x, currentMeasurement[0].y)
        context.lineTo(currentMeasurement[1].x, currentMeasurement[1].y)
      }
      
      context.stroke()
    }
  }

  // キャンバスクリック処理
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    const newPoint = { x, y }
    const newMeasurement = [...currentMeasurement, newPoint]
    setCurrentMeasurement(newMeasurement)

    // 長さ測定の場合は2点で完了
    if (measurementType === 'length' && newMeasurement.length === 2) {
      completeMeasurement(newMeasurement)
    }
  }

  // 測定完了処理
  const completeMeasurement = (points: Point[]) => {
    if (points.length < 2) return

    let value = 0
    if (measurementType === 'area' && points.length >= 3) {
      // 面積計算（Shoelace formula）
      let area = 0
      for (let i = 0; i < points.length; i++) {
        const j = (i + 1) % points.length
        area += points[i].x * points[j].y
        area -= points[j].x * points[i].y
      }
      value = Math.abs(area) / 2 * realWorldScale * realWorldScale
    } else if (measurementType === 'length' && points.length === 2) {
      // 長さ計算
      const dx = points[1].x - points[0].x
      const dy = points[1].y - points[0].y
      value = Math.sqrt(dx * dx + dy * dy) * realWorldScale
    }

    const newMeasurement: Measurement = {
      id: Date.now().toString(),
      name: `${measurementType === 'area' ? '面積' : '長さ'}測定 ${measurements.length + 1}`,
      type: measurementType,
      points,
      value,
      unit: measurementType === 'area' ? `${unit}²` : unit,
      color: `hsl(${Math.random() * 360}, 70%, 50%)`
    }

    setMeasurements([...measurements, newMeasurement])
    setCurrentMeasurement([])
    setIsDrawing(false)
  }

  // 測定名を更新
  const updateMeasurementName = (id: string, newName: string) => {
    setMeasurements(measurements.map(m => 
      m.id === id ? { ...m, name: newName } : m
    ))
  }

  // 測定を削除
  const deleteMeasurement = (id: string) => {
    setMeasurements(measurements.filter(m => m.id !== id))
  }

  // PDFページが変更されたときの再レンダリング
  useEffect(() => {
    if (pdfDoc) {
      renderPage(pdfDoc, currentPage)
    }
  }, [pdfDoc, currentPage, scale, measurements, currentMeasurement])

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
                    PDF面積測定
                  </h2>
                </div>

                {/* PDF表示エリア */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  {pdfDoc ? (
                    <div className="space-y-4">
                      <canvas
                        ref={canvasRef}
                        onClick={handleCanvasClick}
                        className="border border-gray-300 cursor-crosshair max-w-full"
                        style={{ cursor: isDrawing ? 'crosshair' : 'default' }}
                      />
                      
                      {/* 測定コントロール */}
                      <div className="flex flex-wrap gap-2 justify-center">
                        <Button
                          onClick={() => {
                            setMeasurementType('area')
                            setIsDrawing(true)
                            setCurrentMeasurement([])
                          }}
                          variant={measurementType === 'area' && isDrawing ? "default" : "outline"}
                        >
                          <Square className="w-4 h-4 mr-2" />
                          面積測定
                        </Button>
                        
                        <Button
                          onClick={handleLengthMeasurement}
                          variant={measurementType === 'length' && isDrawing ? "default" : "outline"}
                          className="relative"
                        >
                          <Ruler className="w-4 h-4 mr-2" />
                          長さ測定
                          {!isPremium && (
                            <Crown className="w-3 h-3 ml-1 text-amber-500" />
                          )}
                        </Button>
                        
                        {isDrawing && measurementType === 'area' && (
                          <Button
                            onClick={() => completeMeasurement(currentMeasurement)}
                            disabled={currentMeasurement.length < 3}
                          >
                            測定完了
                          </Button>
                        )}
                        
                        <Button
                          onClick={() => {
                            setIsDrawing(false)
                            setCurrentMeasurement([])
                          }}
                          variant="outline"
                        >
                          キャンセル
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">PDFファイルを選択</h3>
                      <p className="text-gray-600 mb-4">面積を測定したいPDFファイルをアップロードしてください</p>
                      {!isPremium && (
                        <p className="text-sm text-gray-500 mb-4">
                          • 無料版では5MB以下のファイルのみ対応・1ページ目のみ表示されます
                        </p>
                      )}
                      <Button onClick={() => fileInputRef.current?.click()}>
                        <Upload className="w-4 h-4 mr-2" />
                        PDFファイルを選択
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* サイドバー */}
          <div className="space-y-6">
            {/* スケール設定 */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3">スケール設定</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">実寸法比率</label>
                    <input
                      type="number"
                      value={realWorldScale}
                      onChange={(e) => setRealWorldScale(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      step="0.1"
                      min="0.1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">単位</label>
                    <select
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="mm">mm</option>
                      <option value="cm">cm</option>
                      <option value="m">m</option>
                      <option value="inch">inch</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 測定結果 */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3">測定結果</h3>
                {measurements.length === 0 ? (
                  <p className="text-gray-500 text-sm">まだ測定結果がありません</p>
                ) : (
                  <div className="space-y-3">
                    {measurements.map((measurement) => (
                      <div key={measurement.id} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <input
                            type="text"
                            value={measurement.name}
                            onChange={(e) => updateMeasurementName(measurement.id, e.target.value)}
                            className="font-medium text-sm bg-transparent border-none p-0 focus:outline-none focus:ring-0"
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteMeasurement(measurement.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                        <div className="text-lg font-bold" style={{ color: measurement.color }}>
                          {measurement.value.toFixed(2)} {measurement.unit}
                        </div>
                        <div className="text-xs text-gray-500">
                          {measurement.type === 'area' ? '面積' : '長さ'}測定
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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


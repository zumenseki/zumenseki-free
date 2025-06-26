"use client"

import type React from "react"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert } from "@/components/ui/alert"
import { Upload, FolderOpen, Trash2, FileText, Calendar, HardDrive, Crown, AlertTriangle } from "lucide-react"
import { useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

// フリーミアム機能のインポート
import { 
  canMeasure, 
  canSave, 
  canUploadFile, 
  incrementMeasurementCount, 
  incrementSavedMeasurements,
  getRemainingMeasurements,
  FREE_LIMITS 
} from "@/lib/freemium"
import UpgradeModal from "@/components/UpgradeModal"
import UsageStats from "@/components/UsageStats"

interface Point {
  x: number
  y: number
}

interface AreaResult {
  id: string
  area: number
  unit: string
  points: Point[]
  name: string
  color: string
  timestamp: Date
  pageNumber: number
  measurementType: "polygon" | "length"
  length?: number
  height?: number
  textPosition?: Point
}

interface PDFPage {
  canvas: HTMLCanvasElement
  pageNumber: number
}

interface PageScale {
  pageNumber: number
  scaleFactor: number
  unit: string
  referencePoints: Point[]
  realDistance: number
  timestamp: Date
}

interface PDFHistory {
  id: string
  name: string
  size: number
  uploadDate: Date
  lastAccessed: Date
  measurementCount: number
}

interface PDFSessionData {
  allMeasurements: AreaResult[]
  pageScales: PageScale[]
  pageNames: { [pageNumber: number]: string }
  unit: string
}

const MEASUREMENT_COLORS = [
  "#22c55e", // green
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#f97316", // orange
  "#84cc16", // lime
]

const COLOR_PALETTE = [
  "#22c55e", // green
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#f97316", // orange
  "#84cc16", // lime
  "#ec4899", // pink
  "#10b981", // emerald
  "#6366f1", // indigo
  "#f43f5e", // rose
  "#14b8a6", // teal
  "#8b5a2b", // brown
  "#6b7280", // gray
  "#000000", // black
]

export default function PDFAreaCalculator() {
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfPages, setPdfPages] = useState<PDFPage[]>([])
  const [currentPage, setCurrentPage] = useState(0) // 常に0
  const [points, setPoints] = useState<Point[]>([])
  const [scaleFactor, setScaleFactor] = useState(1)
  const [unit, setUnit] = useState("m")
  const [allMeasurements, setAllMeasurements] = useState<AreaResult[]>([])
  const [currentMeasurementName, setCurrentMeasurementName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [scaleMode, setScaleMode] = useState(false)
  const [scalePoints, setScalePoints] = useState<Point[]>([])
  const [realDistance, setRealDistance] = useState("")
  const [error, setError] = useState("")
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const [pageScales, setPageScales] = useState<PageScale[]>([])

  // 長さ測定関連の状態（無料版では無効）
  const [lengthMode, setLengthMode] = useState(false)
  const [lengthPoints, setLengthPoints] = useState<Point[]>([])
  const [heightInput, setHeightInput] = useState("")

  // 測定名編集関連の状態
  const [editingMeasurementId, setEditingMeasurementId] = useState<string | null>(null)
  const [editingMeasurementName, setEditingMeasurementName] = useState("")

  // 色選択関連の状態
  const [colorPickerOpen, setColorPickerOpen] = useState<string | null>(null)
  const [customColor, setCustomColor] = useState("#22c55e")

  // ページ名は固定
  const [pageNames, setPageNames] = useState<{ [pageNumber: number]: string }>({})

  // 文字ドラッグ関連の状態
  const [draggingTextId, setDraggingTextId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 })

  // PDF管理関連の状態（無料版では制限）
  const [pdfHistory, setPdfHistory] = useState<PDFHistory[]>([])
  const [showPdfManager, setShowPdfManager] = useState(false)
  const [deletingPdfId, setDeletingPdfId] = useState<string | null>(null)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)

  // フリーミアム関連の状態
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
  const [upgradeReason, setUpgradeReason] = useState<'measurements' | 'length' | 'storage' | 'filesize'>('measurements')

  // 現在のページの測定結果を取得 (常に1ページ目)
  const currentPageMeasurements = allMeasurements.filter((m) => m.pageNumber === 1)


  // フリーミアム制限チェック関数
  const showUpgradeModal = (reason: 'measurements' | 'length' | 'storage' | 'filesize') => {
    setUpgradeReason(reason)
    setUpgradeModalOpen(true)
  }

  // ファイルアップロード時の制限チェック
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // ファイルサイズチェック
    if (!canUploadFile(file.size)) {
      showUpgradeModal('filesize')
      return
    }

    setError("")
    setIsLoading(true)
    setPdfFile(file)

    try {
      const pages = await convertPDFToImages(file)
      setPdfPages(pages)
      setCurrentPage(0)

      // セッション管理（無料版では制限）
      const sessionKey = `${file.name}-${file.size}`
      setCurrentSessionId(sessionKey)
      
      // 既存のセッションデータを読み込み（無料版では1件まで）
      loadSessionData(sessionKey)
      
    } catch (error) {
      console.error("PDF読み込みエラー:", error)
      setError("PDFファイルの読み込みに失敗しました。")
    } finally {
      setIsLoading(false)
    }
  }

  // 測定実行時の制限チェック
  const handleMeasurement = () => {
    if (!canMeasure()) {
      showUpgradeModal('measurements')
      return false
    }
    return true
  }

  // 長さ測定モード切り替え（無料版では無効）
  const toggleLengthMode = () => {
    showUpgradeModal('length')
  }

  // 保存時の制限チェック
  const handleSave = () => {
    if (!canSave()) {
      showUpgradeModal('storage')
      return false
    }
    return true
  }

  // ローカルストレージからPDF履歴を読み込み（無料版では制限）
  const loadPdfHistory = useCallback(() => {
    // 無料版では履歴機能を制限
    return
  }, [])

  // ローカルストレージにPDF履歴を保存（無料版では制限）
  const savePdfHistory = useCallback((history: PDFHistory[]) => {
    // 無料版では履歴保存を制限
    return
  }, [])

  // PDF履歴から削除（無料版では制限）
  const deletePdfFromHistory = useCallback((id: string) => {
    // 無料版では履歴機能を制限
    return
  }, [])

  // 履歴からPDFを選択する関数（無料版では制限）
  const selectPdfFromHistory = useCallback((historyItem: PDFHistory) => {
    // 無料版では履歴機能を制限
    showUpgradeModal('storage')
  }, [])

  // ファイルサイズをフォーマット
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  // PDF.jsを動的にロード
  const loadPDFJS = async () => {
    if (typeof window !== "undefined" && !(window as any).pdfjsLib) {
      const script = document.createElement("script")
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"
      script.onload = () => {
        ;(window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"
      }
      document.head.appendChild(script)

      return new Promise((resolve) => {
        script.onload = resolve
      })
    }
  }

  // PDFを画像に変換 (1ページ目のみ)
  const convertPDFToImages = async (file: File) => {
    await loadPDFJS()

    const arrayBuffer = await file.arrayBuffer()
    const pdf = await (window as any).pdfjsLib.getDocument({ data: arrayBuffer }).promise
    const pages: PDFPage[] = []

    if (pdf.numPages > 0) {
      const pageNum = 1 // 1ページ目のみ
      const page = await pdf.getPage(pageNum)
      const viewport = page.getViewport({ scale: 2.0 })

      const canvas = document.createElement("canvas")
      const context = canvas.getContext("2d")
      canvas.height = viewport.height
      canvas.width = viewport.width

      if (context) {
        await page.render({
          canvasContext: context,
          viewport: viewport,
        }).promise

        pages.push({
          canvas,
          pageNumber: pageNum,
        })
      }
    }

    return pages
  }

  // 面積計算（Shoelace formula）
  const calculatePolygonArea = (polygonPoints: Point[]) => {
    if (polygonPoints.length < 3) return 0

    let area = 0
    for (let i = 0; i < polygonPoints.length; i++) {
      const j = (i + 1) % polygonPoints.length
      area += polygonPoints[i].x * polygonPoints[j].y
      area -= polygonPoints[j].x * polygonPoints[i].y
    }
    return Math.abs(area) / 2
  }

  // 長さ計算（2点間の距離）
  const calculateDistance = (point1: Point, point2: Point) => {
    return Math.sqrt(Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2))
  }

  // 複数点の線分の合計長さを計算
  const calculateTotalLength = (points: Point[]) => {
    if (points.length < 2) return 0

    let totalLength = 0
    for (let i = 0; i < points.length - 1; i++) {
      totalLength += calculateDistance(points[i], points[i + 1])
    }
    return totalLength
  }


  // 測定名を更新
  const updateMeasurementName = (measurementId: string, newName: string) => {
    setAllMeasurements((prev) =>
      prev.map((measurement) => {
        if (measurement.id === measurementId) {
          return {
            ...measurement,
            name: newName,
          }
        }
        return measurement
      }),
    )
    setEditingMeasurementId(null)
    setEditingMeasurementName("")
  }

  // 測定の色を更新
  const updateMeasurementColor = (measurementId: string, newColor: string) => {
    setAllMeasurements((prev) =>
      prev.map((measurement) => {
        if (measurement.id === measurementId) {
          return {
            ...measurement,
            color: newColor,
          }
        }
        return measurement
      }),
    )
    setColorPickerOpen(null)
  }

  // 測定名の編集を開始
  const startEditingName = (measurement: AreaResult) => {
    setEditingMeasurementId(measurement.id)
    setEditingMeasurementName(measurement.name)
  }

  // 測定名の編集をキャンセル
  const cancelEditingName = () => {
    setEditingMeasurementId(null)
    setEditingMeasurementName("")
  }

  // オーバーレイキャンバスに描画
  const drawOverlay = useCallback(() => {
    const overlayCanvas = overlayCanvasRef.current
    const mainCanvas = canvasRef.current
    if (!overlayCanvas || !mainCanvas) return

    const ctx = overlayCanvas.getContext("2d")
    if (!ctx) return

    overlayCanvas.width = mainCanvas.width
    overlayCanvas.height = mainCanvas.height
    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height)

    currentPageMeasurements.forEach((measurement) => {
      if (measurement.measurementType === "length" && measurement.points.length >= 2) {
        ctx.strokeStyle = measurement.color
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(measurement.points[0].x, measurement.points[0].y)
        for (let i = 1; i < measurement.points.length; i++) {
          ctx.lineTo(measurement.points[i].x, measurement.points[i].y)
        }
        ctx.stroke()
        const textPos = measurement.textPosition || getDefaultTextPosition(measurement)
        ctx.fillStyle = "#ffffff"
        ctx.strokeStyle = "#000000"
        ctx.lineWidth = 2
        ctx.font = "bold 16px Arial"
        ctx.textAlign = "center"
        ctx.strokeText(measurement.name, textPos.x, textPos.y)
        ctx.fillText(measurement.name, textPos.x, textPos.y)
        ctx.font = "bold 14px Arial"
        const lengthText = `長さ: ${measurement.length} ${measurement.unit}`
        ctx.strokeText(lengthText, textPos.x, textPos.y + 20)
        ctx.fillText(lengthText, textPos.x, textPos.y + 20)
        const areaText = `面積: ${measurement.area} ${measurement.unit}²`
        ctx.strokeText(areaText, textPos.x, textPos.y + 40)
        ctx.fillText(areaText, textPos.x, textPos.y + 40)
      } else if (measurement.points.length > 2) {
        ctx.strokeStyle = measurement.color
        ctx.fillStyle = measurement.color + "40"
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(measurement.points[0].x, measurement.points[0].y)
        for (let i = 1; i < measurement.points.length; i++) {
          ctx.lineTo(measurement.points[i].x, measurement.points[i].y)
        }
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
        const textPos = measurement.textPosition || getDefaultTextPosition(measurement)
        ctx.fillStyle = "#ffffff"
        ctx.strokeStyle = "#000000"
        ctx.lineWidth = 2
        ctx.font = "bold 16px Arial"
        ctx.textAlign = "center"
        ctx.strokeText(measurement.name, textPos.x, textPos.y)
        ctx.fillText(measurement.name, textPos.x, textPos.y)
        ctx.font = "bold 14px Arial"
        const areaText = `${measurement.area} ${measurement.unit}²`
        ctx.strokeText(areaText, textPos.x, textPos.y + 25)
        ctx.fillText(areaText, textPos.x, textPos.y + 25)
      }
    })

    if (scaleMode) {
      if (scalePoints.length >= 2) {
        ctx.strokeStyle = "#ef4444"
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(scalePoints[0].x, scalePoints[0].y)
        ctx.lineTo(scalePoints[1].x, scalePoints[1].y)
        ctx.stroke()
      }
      scalePoints.forEach((point, index) => {
        ctx.fillStyle = "#ef4444"
        ctx.beginPath()
        ctx.arc(point.x, point.y, 8, 0, 2 * Math.PI)
        ctx.fill()
        ctx.fillStyle = "#ffffff"
        ctx.font = "bold 14px Arial"
        ctx.textAlign = "center"
        ctx.fillText(`${index + 1}`, point.x, point.y + 5)
      })
    } else if (lengthMode) {
      // 長さ測定モードは無料版では無効
      if (lengthPoints.length >= 2) {
        ctx.strokeStyle = "#3b82f6"
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(lengthPoints[0].x, lengthPoints[0].y)
        for (let i = 1; i < lengthPoints.length; i++) {
          ctx.lineTo(lengthPoints[i].x, lengthPoints[i].y)
        }
        ctx.stroke()
        const midIndex = Math.floor(lengthPoints.length / 2)
        const midX = lengthPoints[midIndex].x
        const midY = lengthPoints[midIndex].y
        const totalPixelLength = calculateTotalLength(lengthPoints)
        const scaledLength = totalPixelLength * scaleFactor
        ctx.fillStyle = "#ffffff"
        ctx.strokeStyle = "#000000"
        ctx.lineWidth = 2
        ctx.font = "bold 14px Arial"
        ctx.textAlign = "center"
        const lengthText = `${Math.round(scaledLength * 100) / 100} ${unit}`
        ctx.strokeText(lengthText, midX, midY - 10)
        ctx.fillText(lengthText, midX, midY - 10)
      }
      lengthPoints.forEach((point, index) => {
        ctx.fillStyle = "#3b82f6"
        ctx.beginPath()
        ctx.arc(point.x, point.y, 8, 0, 2 * Math.PI)
        ctx.fill()
        ctx.fillStyle = "#ffffff"
        ctx.font = "bold 14px Arial"
        ctx.textAlign = "center"
        ctx.fillText(`${index + 1}`, point.x, point.y + 5)
      })
    } else {
      if (points.length > 0) {
        ctx.strokeStyle = "#10b981"
        ctx.fillStyle = "rgba(16, 185, 129, 0.3)"
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(points[0].x, points[0].y)
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y)
        }
        if (points.length > 2) {
          ctx.closePath()
          ctx.fill()
        }
        ctx.stroke()
      }
      points.forEach((point, index) => {
        ctx.fillStyle = "#10b981"
        ctx.beginPath()
        ctx.arc(point.x, point.y, 8, 0, 2 * Math.PI)
        ctx.fill()
        ctx.fillStyle = "#ffffff"
        ctx.font = "bold 14px Arial"
        ctx.textAlign = "center"
        ctx.fillText(`${index + 1}`, point.x, point.y + 5)
      })
    }
  }, [points, scalePoints, scaleMode, currentPageMeasurements, lengthMode, lengthPoints])

  // PDFページを表示
  const displayCurrentPage = useCallback(() => {
    if (pdfPages.length === 0 || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const pdfCanvas = pdfPages[currentPage].canvas
    canvas.width = pdfCanvas.width
    canvas.height = pdfCanvas.height

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(pdfCanvas, 0, 0)
    drawOverlay()
  }, [pdfPages, currentPage, drawOverlay])

  // デフォルトの文字位置を取得
  const getDefaultTextPosition = (measurement: AreaResult): Point => {
    if (measurement.measurementType === "length" && measurement.points.length >= 2) {
      const midIndex = Math.floor(measurement.points.length / 2)
      return {
        x: measurement.points[midIndex].x,
        y: measurement.points[midIndex].y - 20,
      }
    } else if (measurement.points.length > 0) {
      const centerX = measurement.points.reduce((sum, p) => sum + p.x, 0) / measurement.points.length
      const centerY = measurement.points.reduce((sum, p) => sum + p.y, 0) / measurement.points.length
      return { x: centerX, y: centerY }
    }
    return { x: 0, y: 0 }
  }


  // キャンバスクリック処理
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    const canvasX = x * scaleX
    const canvasY = y * scaleY

    if (scaleMode) {
      if (scalePoints.length < 2) {
        setScalePoints([...scalePoints, { x: canvasX, y: canvasY }])
      }
    } else if (lengthMode) {
      // 長さ測定モードは無料版では無効
      showUpgradeModal('length')
    } else {
      // 面積測定モード - 制限チェック
      if (!handleMeasurement()) {
        return
      }
      setPoints([...points, { x: canvasX, y: canvasY }])
    }
  }

  // スケール設定を完了
  const completeScale = () => {
    if (scalePoints.length === 2 && realDistance) {
      const pixelDistance = calculateDistance(scalePoints[0], scalePoints[1])
      const realDistanceNum = Number.parseFloat(realDistance)
      const newScaleFactor = realDistanceNum / pixelDistance

      setScaleFactor(newScaleFactor)
      
      const newPageScale: PageScale = {
        pageNumber: 1,
        scaleFactor: newScaleFactor,
        unit: unit,
        referencePoints: scalePoints,
        realDistance: realDistanceNum,
        timestamp: new Date(),
      }

      setPageScales([newPageScale])
      setScaleMode(false)
      setScalePoints([])
      setRealDistance("")
    }
  }

  // 面積測定を完了
  const completeMeasurement = () => {
    if (points.length >= 3) {
      // 制限チェック
      if (!handleMeasurement()) {
        return
      }

      const pixelArea = calculatePolygonArea(points)
      const scaledArea = pixelArea * scaleFactor * scaleFactor
      const measurementName = currentMeasurementName || `測定 ${allMeasurements.length + 1}`
      const colorIndex = allMeasurements.length % MEASUREMENT_COLORS.length
      const color = MEASUREMENT_COLORS[colorIndex]

      const newMeasurement: AreaResult = {
        id: Date.now().toString(),
        area: Math.round(scaledArea * 100) / 100,
        unit: unit,
        points: points,
        name: measurementName,
        color: color,
        timestamp: new Date(),
        pageNumber: 1,
        measurementType: "polygon",
      }

      setAllMeasurements([...allMeasurements, newMeasurement])
      setPoints([])
      setCurrentMeasurementName("")
      
      // 測定回数を増加
      incrementMeasurementCount()
    }
  }

  // 長さ測定を完了（無料版では無効）
  const completeLengthMeasurement = () => {
    showUpgradeModal('length')
  }

  // 測定をクリア
  const clearMeasurement = () => {
    setPoints([])
    setLengthPoints([])
    setCurrentMeasurementName("")
  }

  // 現在のページの測定をクリア
  const clearPageMeasurements = () => {
    setAllMeasurements(allMeasurements.filter((m) => m.pageNumber !== 1))
  }

  // 全測定をクリア
  const clearAllMeasurements = () => {
    setAllMeasurements([])
  }

  // 測定を削除
  const deleteMeasurement = (measurementId: string) => {
    setAllMeasurements(allMeasurements.filter((m) => m.id !== measurementId))
  }

  // セッションデータを保存（無料版では制限）
  const saveSessionData = useCallback(() => {
    if (!currentSessionId) return
    
    // 無料版では保存制限をチェック
    if (!handleSave()) {
      return
    }

    const sessionData: PDFSessionData = {
      allMeasurements,
      pageScales,
      pageNames,
      unit,
    }

    try {
      localStorage.setItem(`pdf-session-${currentSessionId}`, JSON.stringify(sessionData))
      incrementSavedMeasurements()
    } catch (error) {
      console.error("セッションデータの保存に失敗:", error)
    }
  }, [currentSessionId, allMeasurements, pageScales, pageNames, unit])

  // セッションデータを読み込み
  const loadSessionData = useCallback((sessionKey: string) => {
    try {
      const saved = localStorage.getItem(`pdf-session-${sessionKey}`)
      if (saved) {
        const sessionData: PDFSessionData = JSON.parse(saved)
        setAllMeasurements(sessionData.allMeasurements || [])
        setPageScales(sessionData.pageScales || [])
        setPageNames(sessionData.pageNames || {})
        setUnit(sessionData.unit || "m")
        
        // スケールファクターを復元
        const currentPageScale = sessionData.pageScales?.find(s => s.pageNumber === 1)
        if (currentPageScale) {
          setScaleFactor(currentPageScale.scaleFactor)
        }
      }
    } catch (error) {
      console.error("セッションデータの読み込みに失敗:", error)
    }
  }, [])

  // コンポーネントマウント時の処理
  useEffect(() => {
    displayCurrentPage()
  }, [displayCurrentPage])

  // 自動保存（無料版では制限）
  useEffect(() => {
    if (allMeasurements.length > 0 && currentSessionId) {
      const timeoutId = setTimeout(() => {
        saveSessionData()
      }, 1000)
      return () => clearTimeout(timeoutId)
    }
  }, [allMeasurements, saveSessionData, currentSessionId])


  return (
    <div className="container mx-auto p-4 max-w-6xl">
      {/* ヘッダー */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">ズメンセキ</h1>
            <p className="text-gray-600">PDF面積測定ツール</p>
          </div>
          <Badge variant="outline" className="text-amber-600 border-amber-300">
            無料版
          </Badge>
        </div>
        
        {/* 使用状況表示 */}
        <UsageStats onUpgradeClick={() => showUpgradeModal('measurements')} />
      </div>

      {/* アップグレードモーダル */}
      <UpgradeModal 
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        reason={upgradeReason}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            PDF面積測定
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert className="mb-4">
              <AlertTriangle className="w-4 h-4" />
              <div>{error}</div>
            </Alert>
          )}

          {!pdfFile ? (
            <div className="text-center py-12">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">PDFファイルを選択</h3>
                <p className="text-gray-600 mb-4">
                  面積を測定したいPDFファイルをアップロードしてください
                </p>
                <div className="text-sm text-gray-500 mb-4">
                  • 無料版では{FREE_LIMITS.MAX_FILE_SIZE_MB}MB以下のファイルのみ対応
                  • 1ページ目のみ表示されます
                </div>
                <input
                  id="pdf-upload"
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  onClick={() => document.getElementById("pdf-upload")?.click()}
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isLoading ? "読み込み中..." : "PDFファイルを選択"}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <h3 className="text-lg font-medium mb-2">{pdfFile.name}</h3>
                <div className="text-sm text-gray-600">
                  ファイルサイズ: {formatFileSize(pdfFile.size)} | 1ページ目を表示中
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* PDF表示エリア */}
                <div className="lg:col-span-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">PDF表示</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="relative border rounded-lg overflow-hidden bg-gray-50">
                        <canvas
                          ref={canvasRef}
                          className="max-w-full h-auto cursor-crosshair"
                          onClick={handleCanvasClick}
                        />
                        <canvas
                          ref={overlayCanvasRef}
                          className="absolute top-0 left-0 max-w-full h-auto pointer-events-none"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* 操作パネル */}
                <div className="space-y-4">
                  {/* スケール設定 */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">スケール設定</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <label className="text-sm font-medium">単位</label>
                        <Select value={unit} onValueChange={setUnit}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="m">メートル (m)</SelectItem>
                            <SelectItem value="cm">センチメートル (cm)</SelectItem>
                            <SelectItem value="mm">ミリメートル (mm)</SelectItem>
                            <SelectItem value="ft">フィート (ft)</SelectItem>
                            <SelectItem value="in">インチ (in)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {!scaleMode ? (
                        <Button
                          onClick={() => setScaleMode(true)}
                          variant="outline"
                          className="w-full"
                        >
                          スケールを設定
                        </Button>
                      ) : (
                        <div className="space-y-2">
                          <div className="text-sm text-gray-600">
                            2点をクリックして基準線を設定 ({scalePoints.length}/2)
                          </div>
                          {scalePoints.length === 2 && (
                            <div>
                              <Input
                                type="number"
                                placeholder="実際の距離"
                                value={realDistance}
                                onChange={(e) => setRealDistance(e.target.value)}
                                className="mb-2"
                              />
                              <div className="flex gap-2">
                                <Button onClick={completeScale} size="sm">
                                  設定完了
                                </Button>
                                <Button
                                  onClick={() => {
                                    setScaleMode(false)
                                    setScalePoints([])
                                  }}
                                  variant="outline"
                                  size="sm"
                                >
                                  キャンセル
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {scaleFactor !== 1 && (
                        <div className="text-sm text-green-600">
                          スケール設定済み (1px = {scaleFactor.toFixed(4)} {unit})
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* 測定モード */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">測定モード</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant={!lengthMode ? "default" : "outline"}
                          onClick={() => setLengthMode(false)}
                          className="text-sm"
                        >
                          面積測定
                        </Button>
                        <Button
                          variant="outline"
                          onClick={toggleLengthMode}
                          className="text-sm relative"
                        >
                          長さ測定
                          <Crown className="w-3 h-3 ml-1 text-amber-500" />
                        </Button>
                      </div>

                      {!lengthMode && (
                        <div className="space-y-2">
                          <Input
                            placeholder="測定名 (オプション)"
                            value={currentMeasurementName}
                            onChange={(e) => setCurrentMeasurementName(e.target.value)}
                          />
                          <div className="text-sm text-gray-600">
                            クリックして多角形を描画 ({points.length}点)
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={completeMeasurement}
                              disabled={points.length < 3 || !canMeasure()}
                              size="sm"
                            >
                              測定完了
                            </Button>
                            <Button
                              onClick={clearMeasurement}
                              variant="outline"
                              size="sm"
                            >
                              クリア
                            </Button>
                          </div>
                          {!canMeasure() && (
                            <div className="text-sm text-red-600">
                              本日の測定回数上限に達しました
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* 測定結果 */}
                  {currentPageMeasurements.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">測定結果</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                          {currentPageMeasurements.map((measurement) => (
                            <div
                              key={measurement.id}
                              className="flex items-center justify-between p-2 border rounded"
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-4 h-4 rounded"
                                  style={{ backgroundColor: measurement.color }}
                                />
                                <div>
                                  <div className="font-medium text-sm">
                                    {measurement.name}
                                  </div>
                                  <div className="text-xs text-gray-600">
                                    面積: {measurement.area} {measurement.unit}²
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {measurement.timestamp.toLocaleString("ja-JP")}
                                  </div>
                                </div>
                              </div>
                              <Button
                                onClick={() => deleteMeasurement(measurement.id)}
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-800"
                              >
                                削除
                              </Button>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 pt-4 border-t">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">合計:</span>
                            <span className="text-lg font-bold">
                              {Math.round(currentPageMeasurements.reduce((sum, m) => sum + m.area, 0) * 100) / 100} {unit}²
                            </span>
                          </div>
                        </div>
                        <div className="mt-4 flex space-x-2">
                          <Button onClick={clearPageMeasurements} variant="outline" size="sm">
                            測定をクリア
                          </Button>
                          <Button onClick={clearAllMeasurements} variant="outline" size="sm">
                            全測定をクリア
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


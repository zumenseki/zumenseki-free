import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, Crown, Zap, FileText, Ruler, Save, Sparkles } from "lucide-react"

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  onUpgrade: () => void
  reason: 'measurements' | 'length' | 'storage' | 'filesize'
}

const UPGRADE_CONTENT = {
  measurements: {
    title: "測定回数の上限に達しました",
    description: "本日の無料測定回数（3回）を使い切りました。プレミアム版では無制限に測定できます。",
    icon: <Ruler className="w-6 h-6" />
  },
  length: {
    title: "長さ測定はプレミアム機能です",
    description: "長さ測定機能はプレミアム版でのみご利用いただけます。",
    icon: <Ruler className="w-6 h-6" />
  },
  storage: {
    title: "保存容量の上限に達しました",
    description: "無料版では1件まで保存できます。プレミアム版では無制限に保存できます。",
    icon: <Save className="w-6 h-6" />
  },
  filesize: {
    title: "ファイルサイズが上限を超えています",
    description: "無料版では5MB以下のPDFファイルのみ対応しています。プレミアム版では制限なしです。",
    icon: <FileText className="w-6 h-6" />
  }
}

const PREMIUM_FEATURES = [
  "無制限の測定回数",
  "長さ測定機能", 
  "無制限の保存容量",
  "大容量ファイル対応",
  "PDF履歴管理",
  "高度な測定ツール",
  "優先サポート"
]

export default function UpgradeModal({ isOpen, onClose, onUpgrade, reason }: UpgradeModalProps) {
  const content = UPGRADE_CONTENT[reason]

  const handleUpgrade = () => {
    onUpgrade()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
              {content.icon}
            </div>
            <div>
              <DialogTitle className="text-xl">{content.title}</DialogTitle>
              <Badge variant="secondary" className="mt-1">
                <Crown className="w-3 h-3 mr-1" />
                プレミアム機能
              </Badge>
            </div>
          </div>
          <DialogDescription className="text-base">
            {content.description}
          </DialogDescription>
        </DialogHeader>

        <div className="my-6">
          <h4 className="font-semibold mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            プレミアム版の特典
          </h4>
          <div className="grid gap-2">
            {PREMIUM_FEATURES.map((feature, index) => (
              <div key={index} className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span className="text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">月額 ¥980</div>
            <div className="text-sm text-gray-600">いつでもキャンセル可能</div>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2 text-green-700">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">今すぐ体験できます！</span>
          </div>
          <p className="text-xs text-green-600 mt-1">
            このセッション中、プレミアム機能を無料でお試しいただけます
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            後で
          </Button>
          <Button onClick={handleUpgrade} className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
            <Sparkles className="w-4 h-4 mr-2" />
            今すぐ体験する
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


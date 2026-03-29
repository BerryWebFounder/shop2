'use client'
import { useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

export interface UploadedImage {
  id:          string   // 임시 ID (파일명 기반)
  url:         string   // 미리보기 URL (blob 또는 Storage URL)
  storagePath: string   // Supabase Storage 경로 (업로드 후)
  file?:       File     // 아직 업로드 안 된 경우
  uploading:   boolean
  error?:      string
}

interface ImageUploaderProps {
  images:     UploadedImage[]
  onChange:   (images: UploadedImage[]) => void
  maxCount?:  number
  maxSizeMB?: number
  productId?: string   // 상품 ID (Storage 경로 구성용)
}

const ACCEPT = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const DEFAULT_MAX_SIZE_MB = 5

export function ImageUploader({
  images,
  onChange,
  maxCount  = 10,
  maxSizeMB = DEFAULT_MAX_SIZE_MB,
  productId = 'temp',
}: ImageUploaderProps) {
  const inputRef    = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  // ── 파일 검증 ─────────────────────────────────────────────────
  function validate(file: File): string | null {
    if (!ACCEPT.includes(file.type))
      return `지원하지 않는 형식입니다. (JPG, PNG, WEBP, GIF만 가능)`
    if (file.size > maxSizeMB * 1024 * 1024)
      return `파일 크기가 ${maxSizeMB}MB를 초과합니다.`
    return null
  }

  // ── 파일 → UploadedImage 변환 후 업로드 시작 ─────────────────
  const addFiles = useCallback(async (files: FileList | File[]) => {
    const arr = Array.from(files)
    const remaining = maxCount - images.length
    if (remaining <= 0) return

    const newImages: UploadedImage[] = arr.slice(0, remaining).map(file => ({
      id:          `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      url:         URL.createObjectURL(file),
      storagePath: '',
      file,
      uploading:   true,
      error:       validate(file) ?? undefined,
    }))

    // 낙관적 UI: 미리보기 먼저 표시
    onChange([...images, ...newImages])

    // 유효한 파일만 업로드
    for (const img of newImages) {
      if (img.error) {
        updateImage(img.id, { uploading: false })
        continue
      }
      await uploadOne(img, productId)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images, maxCount, productId])

  // ── 단일 파일 업로드 ─────────────────────────────────────────
  async function uploadOne(img: UploadedImage, pId: string) {
    if (!img.file) return
    try {
      const formData = new FormData()
      formData.append('file',      img.file)
      formData.append('productId', pId)

      const res  = await fetch('/api/upload', { method: 'POST', body: formData })
      const json = await res.json()

      if (!res.ok) throw new Error(json.error ?? '업로드 실패')

      updateImage(img.id, {
        url:         json.publicUrl,
        storagePath: json.path,
        uploading:   false,
        file:        undefined,
      })
    } catch (err) {
      updateImage(img.id, {
        uploading: false,
        error:     err instanceof Error ? err.message : '업로드 실패',
      })
    }
  }

  function updateImage(id: string, patch: Partial<UploadedImage>) {
    onChange(
      images.map(img => img.id === id ? { ...img, ...patch } : img)
    )
  }

  function removeImage(id: string) {
    const img = images.find(i => i.id === id)
    // blob URL 해제
    if (img?.url.startsWith('blob:')) URL.revokeObjectURL(img.url)
    onChange(images.filter(i => i.id !== id))
  }

  function moveImage(from: number, to: number) {
    const arr = [...images]
    const [item] = arr.splice(from, 1)
    arr.splice(to, 0, item)
    onChange(arr)
  }

  // ── 드래그앤드롭 핸들러 ───────────────────────────────────────
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files)
  }, [addFiles])

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true)  }
  const onDragLeave = ()                   => setDragging(false)

  const canAdd = images.length < maxCount

  return (
    <div className="space-y-3">
      {/* 이미지 그리드 */}
      {images.length > 0 && (
        <div className="grid grid-cols-5 gap-2">
          {images.map((img, idx) => (
            <ImageThumb
              key={img.id}
              img={img}
              idx={idx}
              isFirst={idx === 0}
              total={images.length}
              onRemove={() => removeImage(img.id)}
              onMoveLeft={idx > 0
                ? () => moveImage(idx, idx - 1) : undefined}
              onMoveRight={idx < images.length - 1
                ? () => moveImage(idx, idx + 1) : undefined}
            />
          ))}
        </div>
      )}

      {/* 드롭존 */}
      {canAdd && (
        <div
          className={cn(
            'border-2 border-dashed rounded-xl p-8 text-center',
            'transition-colors cursor-pointer select-none',
            dragging
              ? 'border-accent bg-accent/8'
              : 'border-border hover:border-border-2 hover:bg-bg-3'
          )}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => inputRef.current?.click()}
        >
          <div className="text-3xl mb-2">🖼️</div>
          <p className="text-sm font-medium text-ink-2">
            클릭하거나 파일을 드래그하여 업로드
          </p>
          <p className="text-xs text-ink-3 mt-1">
            JPG · PNG · WEBP · GIF · 최대 {maxSizeMB}MB
            · {images.length}/{maxCount}장
          </p>
          {images.length === 0 && (
            <p className="text-[11px] text-ink-3 mt-1">
              첫 번째 이미지가 대표 이미지로 사용됩니다
            </p>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT.join(',')}
        multiple
        className="hidden"
        onChange={e => e.target.files && addFiles(e.target.files)}
      />
    </div>
  )
}

// ── 썸네일 컴포넌트 ──────────────────────────────────────────────
function ImageThumb({
  img, idx, isFirst, total,
  onRemove, onMoveLeft, onMoveRight,
}: {
  img:         UploadedImage
  idx:         number
  isFirst:     boolean
  total:       number
  onRemove:    () => void
  onMoveLeft?: () => void
  onMoveRight?: () => void
}) {
  return (
    <div className="relative group aspect-square rounded-lg overflow-hidden border border-border bg-bg-3">
      {/* 이미지 */}
      {img.url && (
        <Image
          src={img.url}
          alt={`상품 이미지 ${idx + 1}`}
          fill
          className="object-cover"
          unoptimized={img.url.startsWith('blob:')}
        />
      )}

      {/* 업로드 중 오버레이 */}
      {img.uploading && (
        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-1">
          <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <span className="text-[10px] text-white">업로드 중</span>
        </div>
      )}

      {/* 에러 오버레이 */}
      {img.error && (
        <div className="absolute inset-0 bg-red-900/80 flex flex-col items-center justify-center gap-1 p-1">
          <span className="text-base">⚠️</span>
          <span className="text-[10px] text-red-200 text-center leading-tight">
            {img.error}
          </span>
        </div>
      )}

      {/* 대표 이미지 뱃지 */}
      {isFirst && !img.error && (
        <div className="absolute top-1 left-1 bg-accent text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
          대표
        </div>
      )}

      {/* 컨트롤 (hover) */}
      {!img.uploading && (
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors">
          {/* 순서 이동 */}
          <div className="absolute bottom-1 left-1 right-1 flex justify-between opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={onMoveLeft}
              disabled={!onMoveLeft}
              className="w-6 h-6 rounded bg-black/60 text-white text-xs disabled:opacity-30 hover:bg-black/80 transition-colors flex items-center justify-center"
              title="왼쪽으로"
            >
              ‹
            </button>
            <button
              onClick={onMoveRight}
              disabled={!onMoveRight}
              className="w-6 h-6 rounded bg-black/60 text-white text-xs disabled:opacity-30 hover:bg-black/80 transition-colors flex items-center justify-center"
              title="오른쪽으로"
            >
              ›
            </button>
          </div>

          {/* 삭제 버튼 */}
          <button
            onClick={onRemove}
            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500/90 text-white text-xs leading-none
              flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
            title="삭제"
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}

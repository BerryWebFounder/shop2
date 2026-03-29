'use client'
import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/Button'

interface UploadResult {
  success: number; failed: number; errors: string[]; message?: string
}

export function BulkUpload({ onComplete }: { onComplete: () => void }) {
  const [step,    setStep]    = useState<'idle' | 'preview' | 'uploading' | 'done'>('idle')
  const [rows,    setRows]    = useState<Record<string, string>[]>([])
  const [result,  setResult]  = useState<UploadResult | null>(null)
  const [error,   setError]   = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // CSV 파싱
  function parseCSV(text: string): Record<string, string>[] {
    const lines  = text.trim().split('\n').map(l => l.replace(/\r$/, ''))
    if (lines.length < 2) return []
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
      return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']))
    }).filter(row => Object.values(row).some(v => v))
  }

  const handleFile = useCallback((file: File) => {
    setError('')
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      setError('CSV 파일만 업로드 가능합니다'); return
    }
    const reader = new FileReader()
    reader.onload = e => {
      const text   = e.target?.result as string
      const parsed = parseCSV(text)
      if (parsed.length === 0) { setError('파싱된 데이터가 없습니다'); return }
      setRows(parsed)
      setStep('preview')
    }
    reader.readAsText(file, 'UTF-8')
  }, [])

  async function handleUpload() {
    setStep('uploading')
    const res  = await fetch('/api/products/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows }),
    })
    const json = await res.json()
    setResult(json)
    setStep('done')
    if (json.success > 0) onComplete()
  }

  const REQUIRED_HEADERS = ['name', 'price']

  return (
    <div className="space-y-4">
      {/* 템플릿 다운로드 */}
      <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-bg-3">
        <div>
          <p className="text-sm font-medium text-ink">CSV 템플릿 다운로드</p>
          <p className="text-xs text-ink-3 mt-0.5">필수: name, price | 선택: summary, sale_price, stock, cat1_name, cat2_name, status</p>
        </div>
        <a href="/api/products/bulk" download="product_template.csv">
          <Button size="sm" variant="secondary">📥 템플릿</Button>
        </a>
      </div>

      {/* 파일 드롭 */}
      {step === 'idle' && (
        <>
          <div
            className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-accent/50 transition-colors"
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
            onClick={() => fileRef.current?.click()}
          >
            <p className="text-2xl mb-2">📂</p>
            <p className="text-sm font-medium text-ink-2">CSV 파일을 드래그하거나 클릭하여 선택</p>
            <p className="text-xs text-ink-3 mt-1">최대 500개 행 | UTF-8 인코딩</p>
            <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </>
      )}

      {/* 미리보기 */}
      {step === 'preview' && rows.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-ink">{rows.length}개 행 파싱됨</p>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => { setStep('idle'); setRows([]) }}>취소</Button>
              <Button size="sm" variant="primary" onClick={handleUpload}>일괄 등록</Button>
            </div>
          </div>
          <div className="overflow-auto max-h-64 rounded-xl border border-border">
            <table className="w-full text-xs">
              <thead className="bg-bg-3 sticky top-0">
                <tr>
                  {Object.keys(rows[0]).map(h => (
                    <th key={h} className={`px-3 py-2 text-left font-medium ${REQUIRED_HEADERS.includes(h) ? 'text-accent' : 'text-ink-3'}`}>
                      {h}{REQUIRED_HEADERS.includes(h) ? ' *' : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 20).map((row, i) => (
                  <tr key={i} className="border-t border-border hover:bg-bg-3">
                    {Object.values(row).map((v, j) => (
                      <td key={j} className="px-3 py-1.5 text-ink-2 max-w-[120px] truncate">{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > 20 && <p className="text-xs text-ink-3 mt-1">... 외 {rows.length - 20}개 행</p>}
        </div>
      )}

      {/* 업로드 중 */}
      {step === 'uploading' && (
        <div className="text-center py-8">
          <span className="w-8 h-8 border-2 border-ink-3 border-t-accent rounded-full animate-spin inline-block mb-3" />
          <p className="text-sm text-ink-2">업로드 중... {rows.length}개 처리 중</p>
        </div>
      )}

      {/* 결과 */}
      {step === 'done' && result && (
        <div className={`p-4 rounded-xl ${result.failed === 0 ? 'bg-green-500/10 border border-green-500/30' : 'bg-yellow-500/10 border border-yellow-500/30'}`}>
          <p className="text-sm font-semibold text-ink mb-1">{result.message}</p>
          {result.errors.length > 0 && (
            <div className="mt-2 max-h-24 overflow-y-auto">
              {result.errors.map((e, i) => <p key={i} className="text-xs text-red-400">{e}</p>)}
            </div>
          )}
          <Button size="sm" variant="secondary" onClick={() => { setStep('idle'); setRows([]); setResult(null) }} className="mt-3">
            다시 업로드
          </Button>
        </div>
      )}
    </div>
  )
}

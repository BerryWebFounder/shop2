'use client'
import { useState, useEffect } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { PageHeader, Card } from '@/components/ui/Card'
import { Table, Thead, Th, Tbody, Tr, Td, EmptyRow } from '@/components/ui/Table'
import { SearchBar } from '@/components/ui/SearchBar'
import { Button } from '@/components/ui/Button'
import { formatDate } from '@/lib/utils'

interface Store {
  id: string
  store_name: string
  slug: string
  category: string
  owner_id: string
  created_at: string
  seller_applications?: { email: string; phone: string }[]
}

export default function AdminStoresPage() {
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')

  useEffect(() => {
    fetch('/api/admin/stores' + (q ? `?q=${encodeURIComponent(q)}` : ''))
      .then(r => r.json()).then(j => { setStores(j.data ?? []); setLoading(false) })
  }, [q])

  return (
    <>
      <Topbar title="상점 목록" />
      <div className="flex-1 overflow-y-auto p-4 md:p-6 animate-page">
        <PageHeader title="상점 목록" subtitle={`총 ${stores.length}개 상점`}>
          <SearchBar placeholder="상점명 검색..." onSearch={setQ} />
        </PageHeader>
        <Card>
          <Table>
            <Thead>
              <Tr>
                <Th>상점명</Th><Th>URL</Th><Th>카테고리</Th><Th>등록일</Th><Th>관리</Th>
              </Tr>
            </Thead>
            <Tbody>
              {loading ? (
                <Tr><Td colSpan={5}><div className="text-center py-8 text-ink-3 text-sm">로딩 중...</div></Td></Tr>
              ) : stores.length === 0 ? (
                <EmptyRow colSpan={5} message="등록된 상점이 없습니다" />
              ) : stores.map(s => (
                <Tr key={s.id}>
                  <Td className="font-medium">{s.store_name}</Td>
                  <Td><a href={`/stores/${s.slug}`} target="_blank" rel="noreferrer" className="text-accent hover:underline text-xs">/stores/{s.slug}</a></Td>
                  <Td className="text-xs">{s.category}</Td>
                  <Td className="text-xs text-ink-3">{formatDate(s.created_at)}</Td>
                  <Td>
                    <Button size="xs" variant="secondary" onClick={() => window.open(`/stores/${s.slug}`, '_blank')}>보기</Button>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Card>
      </div>
    </>
  )
}

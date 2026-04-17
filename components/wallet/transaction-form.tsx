'use client'

import { useState } from 'react'
import { PlusIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CATEGORIES, type Transaction, type TransactionType } from '@/lib/types'
import { todayString } from '@/lib/finance-utils'

interface TransactionFormProps {
  onSubmit: (data: Omit<Transaction, 'id' | 'createdAt'>) => void
  initialData?: Transaction
  trigger?: React.ReactNode
}

export function TransactionForm({ onSubmit, initialData, trigger }: TransactionFormProps) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<TransactionType>(initialData?.type ?? 'expense')
  const [amount, setAmount] = useState(initialData ? String(initialData.amount) : '')
  const [category, setCategory] = useState(initialData?.category ?? '')
  const [note, setNote] = useState(initialData?.note ?? '')
  const [date, setDate] = useState(initialData?.date ?? todayString())
  const [error, setError] = useState('')

  const filteredCategories = CATEGORIES.filter(c => c.type === type)

  function handleTypeChange(t: TransactionType) {
    setType(t)
    setCategory('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = parseFloat(amount)
    if (!amount || isNaN(parsed) || parsed <= 0) {
      setError('請輸入有效金額')
      return
    }
    if (!category) {
      setError('請選擇分類')
      return
    }
    if (!date) {
      setError('請選擇日期')
      return
    }
    setError('')
    onSubmit({ type, amount: parsed, category, note, date })
    if (!initialData) {
      setAmount('')
      setCategory('')
      setNote('')
      setDate(todayString())
      setType('expense')
    }
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="lg" className="gap-2">
            <PlusIcon />
            新增記帳
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{initialData ? '編輯記帳' : '新增記帳'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Type selector */}
          <Tabs value={type} onValueChange={v => handleTypeChange(v as TransactionType)}>
            <TabsList className="w-full">
              <TabsTrigger value="expense" className="flex-1">支出</TabsTrigger>
              <TabsTrigger value="income"  className="flex-1">收入</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Amount */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="amount">金額</Label>
            <Input
              id="amount"
              type="number"
              min="0"
              step="1"
              placeholder="0"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
          </div>

          {/* Category */}
          <div className="flex flex-col gap-1.5">
            <Label>分類</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="選擇分類" />
              </SelectTrigger>
              <SelectContent>
                {filteredCategories.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.emoji} {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="date">日期</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>

          {/* Note */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="note">備註（選填）</Label>
            <Input
              id="note"
              placeholder="輸入備註"
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <DialogFooter className="-mx-4 -mb-4">
            <Button type="submit" className="flex-1">
              {initialData ? '儲存' : '新增'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

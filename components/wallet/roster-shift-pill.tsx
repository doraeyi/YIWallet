'use client'

import { useState } from 'react'
import { PencilIcon, Trash2Icon } from 'lucide-react'
import * as api from '@/lib/api'
import type { Friendship } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface RosterShiftPillProps {
  shift: api.RosterViewShift
  friends: Friendship[]
  myUserId: string | null
  onChanged: () => void
  onDateChanged: (date: string) => void
}

// 後端時間是 "HH:MM:SS"，<input type="time"> 只吃 "HH:MM"
function toTimeInputValue(t: string | null): string {
  return t ? t.slice(0, 5) : ''
}

export function RosterShiftPill({ shift, friends, myUserId, onChanged, onDateChanged }: RosterShiftPillProps) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState(shift.employeeName)
  const [date, setDate] = useState(shift.date)
  const [startTime, setStartTime] = useState(toTimeInputValue(shift.startTime))
  const [endTime, setEndTime] = useState(toTimeInputValue(shift.endTime))
  const [note, setNote] = useState(shift.note ?? '')

  const matchedFriend = friends.find(f => f.friend.id === shift.matchedUserId)
  const isMatched = shift.matchedUserId != null

  function resetEditFields() {
    setName(shift.employeeName)
    setDate(shift.date)
    setStartTime(toTimeInputValue(shift.startTime))
    setEndTime(toTimeInputValue(shift.endTime))
    setNote(shift.note ?? '')
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) setEditing(false)
    else resetEditFields()
  }

  async function handleMatchChange(value: string) {
    setSaving(true)
    try {
      await api.matchRosterShift(shift.id, value || null)
      onChanged()
    } catch (e) {
      alert(e instanceof Error ? e.message : '標註失敗')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveEdit() {
    if (!name.trim()) return
    setSaving(true)
    try {
      await api.updateRosterShift(shift.id, {
        employeeName: name.trim(),
        date,
        startTime: startTime || null,
        endTime: endTime || null,
        note: note.trim() || null,
      })
      onChanged()
      if (date !== shift.date) onDateChanged(date)
      setEditing(false)
      setOpen(false)
    } catch (e) {
      alert(e instanceof Error ? e.message : '更新失敗')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm(`確定要刪除「${shift.employeeName}」這筆班表嗎？`)) return
    setSaving(true)
    try {
      await api.deleteRosterShift(shift.id)
      onChanged()
      setOpen(false)
    } catch (e) {
      alert(e instanceof Error ? e.message : '刪除失敗')
      setSaving(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors',
            isMatched ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-400' : 'bg-muted hover:bg-muted/70'
          )}
        >
          {shift.employeeName}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        {editing ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-muted-foreground">編輯這筆班表</p>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="姓名"
              className="w-full rounded-lg border bg-muted/30 px-2 py-1.5 text-sm outline-none focus:border-ring"
            />
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              onPointerDown={e => e.stopPropagation()}
              className="w-full rounded-lg border bg-muted/30 px-2 py-1.5 text-sm outline-none focus:border-ring"
            />
            <div className="flex items-center gap-1.5">
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                onPointerDown={e => e.stopPropagation()}
                className="w-full rounded-lg border bg-muted/30 px-2 py-1.5 text-sm outline-none focus:border-ring"
              />
              <span className="text-xs text-muted-foreground">–</span>
              <input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                onPointerDown={e => e.stopPropagation()}
                className="w-full rounded-lg border bg-muted/30 px-2 py-1.5 text-sm outline-none focus:border-ring"
              />
            </div>
            <input
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="備註（選填）"
              className="w-full rounded-lg border bg-muted/30 px-2 py-1.5 text-sm outline-none focus:border-ring"
            />
            <div className="mt-1 flex gap-2">
              <button
                onClick={() => setEditing(false)}
                disabled={saving}
                className="flex-1 rounded-lg border py-1.5 text-xs font-medium hover:bg-muted/40 disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving || !name.trim()}
                className="flex-1 rounded-lg bg-amber-400 py-1.5 text-xs font-semibold text-white hover:bg-amber-500 disabled:opacity-50"
              >
                {saving ? '儲存中…' : '儲存'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-muted-foreground">{shift.employeeName}</p>
            <select
              value={shift.matchedUserId ?? ''}
              onChange={e => handleMatchChange(e.target.value)}
              onPointerDown={e => e.stopPropagation()}
              disabled={saving}
              className="w-full rounded-lg border bg-muted/30 px-2 py-1.5 text-xs outline-none focus:border-ring disabled:opacity-50"
            >
              <option value="">不標註</option>
              {myUserId && <option value={myUserId}>👤 這是我本人</option>}
              {friends.map(f => (
                <option key={f.friend.id} value={f.friend.id}>{f.friend.displayName}</option>
              ))}
            </select>
            {isMatched && !shift.materialized && (
              <p className="text-[11px] text-muted-foreground">
                {matchedFriend ? `${matchedFriend.friend.displayName} 還沒開` : '對方還沒開'}「接受好友標註我的班表」，只會顯示唯讀提示
              </p>
            )}
            <div className="mt-1 flex gap-2">
              <button
                onClick={() => setEditing(true)}
                disabled={saving}
                className="flex flex-1 items-center justify-center gap-1 rounded-lg border py-1.5 text-xs font-medium hover:bg-muted/40 disabled:opacity-50"
              >
                <PencilIcon className="size-3.5" />
                編輯
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="flex flex-1 items-center justify-center gap-1 rounded-lg border py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:hover:bg-rose-900/20"
              >
                <Trash2Icon className="size-3.5" />
                刪除
              </button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

'use client'

import Link from 'next/link'
import { TagIcon } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import type { ProductGroup } from '@/lib/types'

interface GroupPickerButtonProps {
  groups: ProductGroup[]
  onAddToGroup: (groupId: string) => void
}

export function GroupPickerButton({ groups, onAddToGroup }: GroupPickerButtonProps) {
  const acceptedGroups = groups.filter(g => g.myStatus === 'accepted')

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="text-muted-foreground hover:text-sky-500">
          <TagIcon className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {acceptedGroups.length === 0 ? (
          <div className="px-2 py-2 text-xs text-muted-foreground">
            還沒有群組，<Link href="/barcode/groups" className="text-amber-500 underline">先建立一個</Link>
          </div>
        ) : (
          <>
            <DropdownMenuLabel className="text-xs text-muted-foreground">加到砍貨群組</DropdownMenuLabel>
            {acceptedGroups.map(g => (
              <DropdownMenuItem key={g.id} onClick={() => onAddToGroup(g.id)}>
                {g.name}
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

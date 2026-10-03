'use client'

import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { cn } from '@/lib/utils'

type ActivityPoint = { date: string; views: number }

const DAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

/** LearnHub teal palette for activity bars */
const BAR_PALETTE = [
  '#134e44',
  '#1b6b5a',
  '#22806c',
  '#2a9680',
  '#3ddcb0',
  '#5ee4c0',
  '#7aedcf',
] as const

const DAY_LABELS: Record<string, string> = {
  Sun: 'Sun',
  Mon: 'Mon',
  Tue: 'Tue',
  Wed: 'Wed',
  Thu: 'Thu',
  Fri: 'Fri',
  Sat: 'Sat',
}

function reorderWeek(points: ActivityPoint[]): ActivityPoint[] {
  const byDay = new Map(points.map(p => [p.date, p.views]))
  return DAY_ORDER.map(date => ({ date, views: byDay.get(date) ?? 0 }))
}

function barFill(views: number, maxViews: number, isToday: boolean, index: number): string {
  if (views === 0) return 'var(--border)'
  if (isToday) return 'var(--primary)'
  if (views === maxViews && maxViews > 0) return 'var(--sidebar-primary, #3ddcb0)'
  return BAR_PALETTE[index % BAR_PALETTE.length]!
}

type TooltipPayload = { payload?: ActivityPoint }

function ActivityTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TooltipPayload[]
  label?: string
}) {
  if (!active || !payload?.[0]?.payload) return null
  const { views } = payload[0].payload
  return (
    <div className="rounded-lg border border-border/80 bg-popover/95 px-3 py-2 shadow-lg backdrop-blur-sm">
      <p className="text-xs font-medium text-muted-foreground">{DAY_LABELS[label ?? ''] ?? label}</p>
      <p className="text-sm font-semibold text-foreground">
        {views} {views === 1 ? 'update' : 'updates'}
      </p>
    </div>
  )
}

export function WeeklyActivityChart({ data }: { data: ActivityPoint[] }) {
  const chartData = useMemo(() => reorderWeek(data), [data])
  const todayKey = new Date().toLocaleDateString('en-US', { weekday: 'short' })
  const maxViews = Math.max(...chartData.map(d => d.views), 1)
  const weekTotal = chartData.reduce((sum, d) => sum + d.views, 0)
  const yMax = Math.max(maxViews, 4)

  return (
    <div className="flex h-full min-h-[220px] flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2 px-0.5">
        <p className="text-sm text-muted-foreground">
          Progress updates by day of week
        </p>
        <p className="text-2xl font-bold tabular-nums tracking-tight text-primary">
          {weekTotal}
          <span className="ml-1.5 text-sm font-normal text-muted-foreground">this week</span>
        </p>
      </div>
      <div className="relative flex-1 min-h-[180px]">
        <div
          className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-b from-primary/[0.06] via-transparent to-accent/[0.08]"
          aria-hidden
        />
        <div className="h-full w-full" role="img" aria-label="Weekly learning activity chart">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 8, right: 4, left: -8, bottom: 0 }}
            barCategoryGap="22%"
          >
            <CartesianGrid
              vertical={false}
              stroke="var(--border)"
              strokeDasharray="4 6"
              strokeOpacity={0.65}
            />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={({ x, y, payload }) => {
                const isToday = payload.value === todayKey
                return (
                  <text
                    x={Number(x)}
                    y={Number(y) + 14}
                    textAnchor="middle"
                    className={cn(
                      'fill-muted-foreground text-[11px] font-medium',
                      isToday && 'fill-primary font-semibold',
                    )}
                  >
                    {payload.value}
                  </text>
                )
              }}
            />
            <YAxis
              allowDecimals={false}
              width={32}
              axisLine={false}
              tickLine={false}
              domain={[0, yMax]}
              tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
            />
            <Tooltip
              cursor={{ fill: 'var(--primary)', opacity: 0.06, radius: 6 }}
              content={<ActivityTooltip />}
            />
            <Bar
              dataKey="views"
              radius={[8, 8, 4, 4]}
              maxBarSize={44}
              animationDuration={720}
              animationEasing="ease-out"
            >
              {chartData.map((entry, index) => {
                const isToday = entry.date === todayKey
                return (
                  <Cell
                    key={entry.date}
                    fill={barFill(entry.views, maxViews, isToday, index)}
                    stroke={isToday ? 'var(--primary)' : 'transparent'}
                    strokeWidth={isToday ? 2 : 0}
                  />
                )
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

import * as React from "react"
import * as RechartsPrimitive from "recharts"

import { cn } from "@/lib/utils"

// Format: { [key: string]: { label: React.ReactNode; color?: string; icon?: React.ComponentType } }
export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode
    icon?: React.ComponentType
    color?: string
  }
>

const ChartContext = React.createContext<{
  config: ChartConfig
} | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)
  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />")
  }
  return context
}

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div"> & {
    config: ChartConfig
    children: React.ReactNode
  }
>(({ className, config, children, ...props }, ref) => {
  return (
    <ChartContext.Provider value={{ config }}>
      <div
        ref={ref}
        className={cn("flex justify-center text-xs w-full", className)}
        {...props}
      >
        <RechartsPrimitive.ResponsiveContainer width="100%" height="100%">
          {children as any}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
})
ChartContainer.displayName = "ChartContainer"

// Tooltip content component
const ChartTooltip = RechartsPrimitive.Tooltip

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div"> & {
    active?: boolean
    payload?: any[]
    label?: string
    hideLabel?: boolean
    hideIndicator?: boolean
    indicator?: "line" | "dashed" | "dot"
    nameKey?: string
    labelKey?: string
    formatter?: (value: any) => React.ReactNode
  }
>(
  (
    {
      className,
      active,
      payload,
      label,
      hideLabel = false,
      hideIndicator = false,
      indicator = "dot",
      nameKey,
      labelKey,
      formatter,
    },
    ref
  ) => {
    const { config } = useChart()

    const tooltipLabel = React.useMemo(() => {
      if (hideLabel || !payload?.length) {
        return null
      }

      const [item] = payload
      const key = `${labelKey || item.dataKey || item.name || "value"}`
      const itemConfig = config[key]
      const value =
        itemConfig?.label ||
        (labelKey ? config[labelKey]?.label : null) ||
        label

      return <div className="font-semibold text-xs text-ink/90">{value}</div>
    }, [label, labelKey, payload, hideLabel, config])

    if (!active || !payload?.length) {
      return null
    }

    return (
      <div
        ref={ref}
        className={cn(
          "grid min-w-[8rem] items-start gap-1.5 rounded-xl border border-black/5 bg-white p-2.5 shadow-md text-ink",
          className
        )}
      >
        {!hideLabel && tooltipLabel}
        <div className="grid gap-1.5">
          {payload.map((item, index) => {
            const key = `${nameKey || item.name || item.dataKey || "value"}`
            const itemConfig = config[key]
            const indicatorColor = itemConfig?.color || item.payload?.fill || item.color

            return (
              <div
                key={item.dataKey || index}
                className="flex w-full items-center gap-2 text-xs"
              >
                {!hideIndicator && (
                  <div
                    className={cn(
                      "shrink-0 rounded-[2px] border-l",
                      indicator === "dot" && "h-2 w-2 rounded-full",
                      indicator === "line" && "w-0.5",
                      indicator === "dashed" && "border-t border-dashed w-3"
                    )}
                    style={{
                      backgroundColor: indicator === "dot" ? indicatorColor : undefined,
                      borderColor: indicatorColor,
                    }}
                  />
                )}
                <div className="flex flex-1 items-center justify-between gap-4">
                  <span className="text-muted font-medium">
                    {itemConfig?.label || item.name}
                  </span>
                  <span className="font-bold tabular-nums text-ink">
                    {formatter
                      ? formatter(item.value)
                      : typeof item.value === "number"
                      ? item.value.toLocaleString("en-IN")
                      : item.value}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }
)
ChartTooltipContent.displayName = "ChartTooltipContent"

export { ChartContainer, ChartTooltip, ChartTooltipContent }

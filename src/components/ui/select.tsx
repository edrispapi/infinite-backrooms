import * as React from "react"
import { ChevronDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"
interface SelectContextType {
  value: string
  onValueChange: (value: string) => void
  open: boolean
  setOpen: (open: boolean) => void
}
const SelectContext = React.createContext<SelectContextType | null>(null)
export const Select = ({
  children,
  value,
  onValueChange,
}: {
  children: React.ReactNode
  value: string
  onValueChange: (value: string) => void
}) => {
  const [open, setOpen] = React.useState(false)
  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen }}>
      <div className="relative inline-block w-full">{children}</div>
    </SelectContext.Provider>
  )
}
export const SelectTrigger = ({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) => {
  const context = React.useContext(SelectContext)
  if (!context) throw new Error("SelectTrigger must be used within Select")
  return (
    <button
      type="button"
      onClick={() => context.setOpen(!context.open)}
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
    >
      {children}
      <ChevronDown className="h-4 w-4 opacity-50" />
    </button>
  )
}
export const SelectValue = ({ placeholder }: { placeholder?: string }) => {
  const context = React.useContext(SelectContext)
  if (!context) throw new Error("SelectValue must be used within Select")
  // This is a simplified implementation. In a real scenario, we'd need to find the label for the value.
  // For now, we rely on the parent to pass the label or just show the value if needed,
  // but typically SelectValue renders the selected option's text.
  // Since we can't easily traverse children to find the label in this simple implementation,
  // we might need a workaround or just accept that it displays the value if not handled externally.
  // However, for this specific project, we can just render a span that will be populated by the selected item's label
  // if we were using a more complex context.
  // A simple hack for this specific use case: we will just render the placeholder if no value,
  // or we can try to render the value.
  // BETTER APPROACH: The SelectTrigger usually contains the SelectValue.
  // We will let the user of this component handle the display text if needed, or just display the value.
  // But to be more helpful, let's try to display the value.
  return (
    <span className="block truncate">
      {context.value || placeholder}
    </span>
  )
}
export const SelectContent = ({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) => {
  const context = React.useContext(SelectContext)
  if (!context) throw new Error("SelectContent must be used within Select")
  if (!context.open) return null
  return (
    <div
      className={cn(
        "absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-80 mt-1 w-full",
        className
      )}
    >
      <div className="p-1">{children}</div>
    </div>
  )
}
export const SelectItem = ({
  children,
  value,
  className,
}: {
  children: React.ReactNode
  value: string
  className?: string
}) => {
  const context = React.useContext(SelectContext)
  if (!context) throw new Error("SelectItem must be used within Select")
  const isSelected = context.value === value
  return (
    <div
      onClick={() => {
        context.onValueChange(value)
        context.setOpen(false)
      }}
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 cursor-pointer",
        className
      )}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        {isSelected && <Check className="h-4 w-4" />}
      </span>
      <span className="truncate">{children}</span>
    </div>
  )
}
import * as React from "react"
import { ChevronDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

interface SimpleSelectProps {
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  children: React.ReactNode
  className?: string
  disabled?: boolean
}

interface SimpleSelectItemProps {
  value: string
  children: React.ReactNode
  className?: string
}

const SimpleSelect = React.forwardRef<HTMLButtonElement, SimpleSelectProps>(
  ({ value, onValueChange, placeholder = "Select an option", children, className, disabled, ...props }, ref) => {
    const [selectedValue, setSelectedValue] = React.useState(value)
    const [selectedLabel, setSelectedLabel] = React.useState<string>("")

    React.useEffect(() => {
      setSelectedValue(value)
    }, [value])

    React.useEffect(() => {
      // Find the label for the selected value
      const items = React.Children.toArray(children) as React.ReactElement<SimpleSelectItemProps>[]
      const selectedItem = items.find(item => item.props.value === selectedValue)
      if (selectedItem) {
        setSelectedLabel(selectedItem.props.children as string)
      } else {
        setSelectedLabel("")
      }
    }, [selectedValue, children])

    const handleSelect = (itemValue: string) => {
      setSelectedValue(itemValue)
      onValueChange?.(itemValue)
    }

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            ref={ref}
            variant="outline"
            role="combobox"
            className={cn(
              "w-full justify-between",
              !selectedValue && "text-muted-foreground",
              className
            )}
            disabled={disabled}
            {...props}
          >
            {selectedLabel || placeholder}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          className={cn(
            "z-[3100] w-full min-w-[var(--radix-dropdown-menu-trigger-width)]",
            "fixed" // ensure viewport-relative positioning
          )}
        >
          {React.Children.map(children, (child) => {
            if (React.isValidElement<SimpleSelectItemProps>(child)) {
              return (
                <DropdownMenuItem
                  key={child.props.value}
                  onSelect={() => handleSelect(child.props.value)}
                  className={cn(
                    "flex items-center justify-between cursor-pointer",
                    child.props.className
                  )}
                >
                  <span>{child.props.children}</span>
                  {selectedValue === child.props.value && (
                    <Check className="h-4 w-4" />
                  )}
                </DropdownMenuItem>
              )
            }
            return null
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }
)
SimpleSelect.displayName = "SimpleSelect"

const SimpleSelectItem = ({ value, children, className }: SimpleSelectItemProps) => {
  return <div data-value={value} className={className}>{children}</div>
}

export { SimpleSelect, SimpleSelectItem }
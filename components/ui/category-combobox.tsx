// components/ui/category-combobox.tsx
"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useMaterialCategories } from "@/hooks/useMaterialCategories"

interface CategoryComboboxProps {
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function CategoryCombobox({
  value,
  onValueChange,
  placeholder = "Selecione uma categoria...",
  disabled = false,
  className
}: CategoryComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")
  const { categories, isLoading } = useMaterialCategories()

  const handleSelect = (selectedValue: string) => {
    if (selectedValue === value) {
      onValueChange("")
    } else {
      onValueChange(selectedValue)
    }
    setOpen(false)
  }

  const handleInputKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && inputValue.trim() && !categories.find(cat => cat.value === inputValue.trim())) {
      event.preventDefault()
      onValueChange(inputValue.trim())
      setOpen(false)
      setInputValue("")
    }
  }

  const displayValue = value || inputValue

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "justify-between bg-gray-800 border-gray-700 text-white hover:bg-gray-700",
            !displayValue && "text-gray-400",
            className
          )}
          disabled={disabled}
        >
          {displayValue || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 bg-gray-800 border-gray-700">
        <Command className="bg-gray-800">
          <CommandInput
            placeholder="Digite para buscar ou criar nova categoria..."
            className="bg-gray-800 text-white border-gray-700"
            value={inputValue}
            onValueChange={setInputValue}
            onKeyDown={handleInputKeyDown}
          />
          <CommandEmpty className="text-gray-400 py-6 text-center text-sm">
            {isLoading ? (
              "Carregando categorias..."
            ) : inputValue ? (
              <div className="space-y-2">
                <p>Nenhuma categoria encontrada.</p>
                <p className="text-xs">Pressione Enter para criar "{inputValue.trim()}"</p>
              </div>
            ) : (
              "Nenhuma categoria encontrada."
            )}
          </CommandEmpty>
          <CommandGroup className="max-h-48 overflow-auto">
            {categories.map((category) => (
              <CommandItem
                key={category.value}
                value={category.value}
                onSelect={() => handleSelect(category.value)}
                className="text-white hover:bg-gray-700 cursor-pointer"
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === category.value ? "opacity-100" : "opacity-0"
                  )}
                />
                {category.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
"use client"

import type { ReactNode } from "react"
import { useFormContext } from "react-hook-form"
import type { FieldPath, FieldValues } from "react-hook-form"

import { cn } from "@/lib/utils"
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  type SelectTriggerVariants,
} from "@/components/ui/select"

type Option = {
  value: string
  label: ReactNode
  disabled?: boolean
}

type FormSelectProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  name: TName
  label?: string
  placeholder?: string
  description?: string
  options: Option[]
  disabled?: boolean
  className?: string
  triggerClassName?: string
  triggerVariant?: SelectTriggerVariants["variant"]
  triggerSize?: SelectTriggerVariants["size"]
  onValueChange?: (value: string) => void
}

function FormSelect<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  name,
  label,
  placeholder = "请选择",
  description,
  options,
  disabled,
  className,
  triggerClassName,
  triggerVariant,
  triggerSize,
  onValueChange,
}: FormSelectProps<TFieldValues, TName>) {
  const { control } = useFormContext<TFieldValues>()

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const selected = options.find((opt) => opt.value === field.value)
        return (
          <FormItem className={className}>
            {label && <FormLabel>{label}</FormLabel>}
            <Select
              value={field.value ?? undefined}
              onValueChange={(v) => {
                if (v == null) return
                field.onChange(v)
                onValueChange?.(v)
              }}
              disabled={disabled}
            >
              <FormControl>
                <SelectTrigger
                  className={cn("w-full", triggerClassName)}
                  variant={triggerVariant}
                  size={triggerSize}
                >
                  <SelectValue placeholder={placeholder}>{selected?.label}</SelectValue>
                </SelectTrigger>
              </FormControl>
            <SelectContent align="start">
                {options.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} disabled={opt.disabled}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </FormItem>
        )
      }}
    />
  )
}

export { FormSelect }
export type { FormSelectProps, Option }

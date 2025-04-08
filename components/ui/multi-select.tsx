"use client";

import * as React from "react";
import { X, Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export type Option = {
  label: string;
  value: string;
  avatar?: string;
};

interface MultiSelectProps {
  options: Option[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  isLoading?: boolean;
  onSearch?: (value: string) => void;
  className?: string;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select options",
  isLoading = false,
  onSearch,
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  const handleUnselect = (value: string) => {
    onChange(selected.filter((item) => item !== value));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const input = e.target as HTMLInputElement;
    if (input.value === "" && e.key === "Backspace") {
      onChange(selected.slice(0, -1));
    }

    // Handle search
    if (input.value !== "" && onSearch) {
      setInputValue(input.value);
      onSearch(input.value);
    }
  };

  // Memoized selected items for better rendering performance
  const selectedItems = React.useMemo(() => {
    return selected.map((value) => {
      const option = options.find((opt) => opt.value === value);
      return option || { label: value, value };
    });
  }, [selected, options]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          role="combobox"
          aria-expanded={open}
          className={cn(
            "flex min-h-10 w-full flex-wrap items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus:ring-offset-2",
            className,
          )}
        >
          <div className="flex flex-wrap gap-1">
            {selectedItems.length > 0 ? (
              selectedItems.map((item) => (
                <Badge key={item.value} variant="secondary" className="mb-1">
                  {item.label}
                  <button
                    className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleUnselect(item.value);
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={() => handleUnselect(item.value)}
                  >
                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </button>
                </Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">
                {placeholder}
              </span>
            )}
            <CommandInput
              placeholder=""
              className="ml-1 flex-1 shadow-none outline-none placeholder:text-foreground"
              value={inputValue}
              onKeyDown={handleKeyDown}
              onValueChange={(value) => {
                setInputValue(value);
                if (onSearch) onSearch(value);
              }}
            />
          </div>
          <div className="flex items-center">
            {isLoading ? (
              <Loader2 className="h-4 w-4 opacity-50 animate-spin" />
            ) : (
              <ChevronsUpDown className="h-4 w-4 opacity-50" />
            )}
          </div>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandList>
            <CommandEmpty>No results found</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selected.includes(option.value);
                return (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => {
                      if (isSelected) {
                        onChange(
                          selected.filter((value) => value !== option.value),
                        );
                      } else {
                        onChange([...selected, option.value]);
                      }
                      setInputValue(""); // Clear input after selection
                    }}
                  >
                    <div className="flex items-center gap-2 w-full">
                      {option.avatar && (
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={option.avatar} alt={option.label} />
                          <AvatarFallback>
                            {option.label.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <span>{option.label}</span>
                    </div>
                    <Check
                      className={cn(
                        "ml-auto h-4 w-4",
                        isSelected ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

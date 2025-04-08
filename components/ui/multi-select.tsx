"use client";

import * as React from "react";
import { X, Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  const [searchQuery, setSearchQuery] = React.useState("");

  const handleUnselect = (value: string) => {
    onChange(selected.filter((item) => item !== value));
  };

  // Memoized selected items for better rendering performance
  const selectedItems = React.useMemo(() => {
    return selected.map((value) => {
      const option = options.find((opt) => opt.value === value);
      return option || { label: value, value };
    });
  }, [selected, options]);

  // Handle backspace to remove the last selected item when the input is empty
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Backspace" && !searchQuery && selected.length > 0) {
      e.preventDefault();
      onChange(selected.slice(0, -1));
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal bg-background h-auto min-h-10 px-3 py-2",
            !selected.length && "text-muted-foreground",
            className,
          )}
        >
          <div className="flex flex-wrap gap-1 items-center">
            {selectedItems.length > 0 ? (
              selectedItems.map((item) => (
                <Badge
                  key={item.value}
                  variant="secondary"
                  className="mb-1 mr-1"
                >
                  {item.label}
                  <button
                    type="button"
                    className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleUnselect(item.value);
                    }}
                  >
                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </button>
                </Badge>
              ))
            ) : (
              <span>{placeholder}</span>
            )}
          </div>
          <div className="flex items-center">
            {isLoading ? (
              <Loader2 className="h-4 w-4 opacity-50 animate-spin" />
            ) : (
              <ChevronsUpDown className="h-4 w-4 opacity-50" />
            )}
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search..."
            value={searchQuery}
            onKeyDown={handleKeyDown}
            onValueChange={(value) => {
              setSearchQuery(value);
              if (onSearch) onSearch(value);
            }}
          />
          <CommandList>
            <CommandEmpty>No results found</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selected.includes(option.value);
                return (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={() => {
                      if (isSelected) {
                        onChange(
                          selected.filter((value) => value !== option.value),
                        );
                      } else {
                        onChange([...selected, option.value]);
                      }
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

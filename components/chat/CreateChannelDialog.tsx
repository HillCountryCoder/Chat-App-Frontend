"use client";

import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateChannel } from "@/hooks/use-channels";
import { useUsers } from "@/hooks/use-chat";
import { ChannelType } from "@/types/chat";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import { User } from "@/types/user";
import { Loader2 } from "lucide-react";
import { debounce } from "lodash";

// Validation schema
const createChannelSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name cannot exceed 50 characters"),
  description: z
    .string()
    .max(500, "Description cannot exceed 500 characters")
    .optional()
    .or(z.literal("")),
  type: z.enum([ChannelType.TEXT, ChannelType.VOICE, ChannelType.ANNOUNCEMENT]),
  memberIds: z.array(z.string()).max(99, "Cannot add more than 99 members"),
});

type CreateChannelFormData = z.infer<typeof createChannelSchema>;

interface CreateChannelDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateChannelDialog({
  isOpen,
  onClose,
}: CreateChannelDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  const { data: users = [] } = useUsers(searchQuery);
  const createChannel = useCreateChannel();

  const form = useForm<CreateChannelFormData>({
    resolver: zodResolver(createChannelSchema),
    defaultValues: {
      name: "",
      description: "",
      type: ChannelType.TEXT,
      memberIds: [],
    },
  });
  const handleSearch = useCallback((value: string) => {
    const debouncedSearch = debounce((searchValue: string) => {
      setSearchQuery(searchValue);
    }, 300);
    
    debouncedSearch(value);
  }, []);

  const onSubmit = async (data: CreateChannelFormData) => {
    try {
      const result = await createChannel.mutateAsync(data);

      form.reset(); // Reset form after successful submission
      onClose();
      router.push(`/chat/channel/${result.channel._id}`);
    } catch (error) {
      console.error("Failed to create channel:", error);
    }
  };

  // Reset form when dialog closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
      setSearchQuery("");
      onClose();
    }
  };

  // Convert users to the format expected by the new MultiSelect
  const userOptions = users.map((user: User) => ({
    label: user.displayName,
    value: user._id,
  }));

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Create New Channel</DialogTitle>
          <DialogDescription>
            Create a channel to communicate with your team members
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Channel Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. design-team" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="What is this channel about?"
                        className="resize-none"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Channel Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select channel type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={ChannelType.TEXT}>Text</SelectItem>
                        <SelectItem value={ChannelType.VOICE}>Voice</SelectItem>
                        <SelectItem value={ChannelType.ANNOUNCEMENT}>
                          Announcement
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="memberIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Add Members</FormLabel>
                    <FormControl>
                      <MultiSelect
                        options={userOptions}
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        placeholder="Search users..."
                        onSearch={handleSearch}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createChannel.isPending || !form.formState.isDirty}
                  className="gap-2"
                >
                  {createChannel.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Create Channel
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useAddChannelMember,
  useRemoveChannelMember,
  useChannelMembers,
} from "@/hooks/use-channels";
import { useUsers } from "@/hooks/use-chat";
import { useAuthStore } from "@/store/auth-store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Channel } from "@/types/chat";
import { User } from "@/types/user";
import {
  Plus,
  Search,
  MoreVertical,
  UserMinus,
  ShieldAlert,
  UserPlus,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface ChannelMembersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  channelId: string;
  channel?: Channel;
}

export default function ChannelMembersDrawer({
  isOpen,
  onClose,
  channelId,
  channel,
}: ChannelMembersDrawerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  const { user: currentUser } = useAuthStore();

  // Use the new hook to get members with user data populated
  const { data: members = [], isLoading: isLoadingMembers } =
    useChannelMembers(channelId);

  const { data: users = [], isLoading: isLoadingUsers } =
    useUsers(memberSearchQuery);

  const addMember = useAddChannelMember();
  const removeMember = useRemoveChannelMember();

  // Filter members by search query
  const filteredMembers = searchQuery
    ? members.filter(
        (member) =>
          member.user?.displayName
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          member.user?.username
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()),
      )
    : members;

  // Find current user membership to check if admin
  const currentUserMembership = members.find(
    (member) => member.userId === currentUser?._id,
  );

  const isAdmin =
    currentUserMembership?.permissions?.includes("admin") ||
    currentUserMembership?.roles?.includes("admin");

  // Filter out users that are already members
  const nonMemberUsers = users.filter((user: User) => {
    return !members.some((member) => member.userId === user._id);
  });

  const handleAddMember = async (userId: string) => {
    try {
      await addMember.mutateAsync({ channelId, userId });
      toast.success("Member added successfully");
      setIsAddingMember(false);
      setSelectedUser(null);
      setMemberSearchQuery("");
    } catch (error) {
      console.error("Failed to add member:", error);
      toast.error("Failed to add member");
    }
  };

  const handleRemoveMember = async (userId: string) => {
    setRemovingUserId(userId);
    try {
      await removeMember.mutateAsync({ channelId, userId });
      toast.success("Member removed successfully");
    } catch (error) {
      console.error("Failed to remove member:", error);
      toast.error("Failed to remove member");
    } finally {
      setRemovingUserId(null);
    }
  };

  // Sort members to put admins first
  const sortedMembers = [...filteredMembers].sort((a, b) => {
    const aIsAdmin =
      a.permissions?.includes("admin") || a.roles?.includes("admin");
    const bIsAdmin =
      b.permissions?.includes("admin") || b.roles?.includes("admin");

    if (aIsAdmin && !bIsAdmin) return -1;
    if (!aIsAdmin && bIsAdmin) return 1;
    return 0;
  });

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className="w-[350px] sm:w-[400px]">
          <SheetHeader>
            <SheetTitle>Channel Members</SheetTitle>
            <SheetDescription>
              {channel?.name} · {members.length}{" "}
              {members.length === 1 ? "member" : "members"}
            </SheetDescription>
          </SheetHeader>

          <div className="py-4">
            <div className="flex gap-2 items-center mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  className="pl-8"
                  placeholder="Search members"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              {isAdmin && (
                <Button size="icon" onClick={() => setIsAddingMember(true)}>
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="space-y-1 mt-2 max-h-[calc(100vh-200px)] overflow-y-auto">
              {isLoadingMembers ? (
                <div className="flex justify-center my-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : sortedMembers.length > 0 ? (
                sortedMembers.map((member) => {
                  const user = member.user;
                  const displayName = user?.displayName || "Unknown User";
                  const username = user?.username || "unknown";
                  const avatarUrl = user?.avatarUrl;
                  const isAdminMember =
                    member.permissions?.includes("admin") ||
                    member.roles?.includes("admin");
                  const isCurrentUser = member.userId === currentUser?._id;
                  const isRemoving = removingUserId === member.userId;

                  return (
                    <div
                      key={member._id}
                      className={`flex items-center justify-between p-2 rounded-md hover:bg-accent ${
                        isRemoving ? "opacity-50" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage
                            src={avatarUrl || ""}
                            alt={displayName}
                          />
                          <AvatarFallback>
                            {displayName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{displayName}</span>
                            {isAdminMember && (
                              <ShieldAlert className="h-3.5 w-3.5 text-primary" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            @{username}
                          </p>
                        </div>
                      </div>

                      {isAdmin && !isCurrentUser && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={isRemoving}
                            >
                              {isRemoving ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <MoreVertical className="h-4 w-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => handleRemoveMember(member.userId)}
                              disabled={isRemoving}
                            >
                              <UserMinus className="h-4 w-4 mr-2" />
                              Remove from channel
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No members found
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Add Member Dialog */}
      <Dialog
        open={isAddingMember}
        onOpenChange={(open) => {
          setIsAddingMember(open);
          if (!open) {
            setMemberSearchQuery("");
            setSelectedUser(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Members</DialogTitle>
            <DialogDescription>
              Add new members to the {channel?.name} channel
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="relative mb-4">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                className="pl-8"
                placeholder="Search users"
                value={memberSearchQuery}
                onChange={(e) => setMemberSearchQuery(e.target.value)}
              />
            </div>

            <div className="space-y-1 max-h-[300px] overflow-y-auto">
              {isLoadingUsers ? (
                <div className="flex justify-center my-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : nonMemberUsers.length > 0 ? (
                nonMemberUsers.map((user: User) => (
                  <div
                    key={user._id}
                    className={`flex items-center justify-between p-2 rounded-md hover:bg-accent cursor-pointer ${
                      selectedUser?._id === user._id ? "bg-accent" : ""
                    }`}
                    onClick={() => setSelectedUser(user)}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage
                          src={user.avatarUrl || ""}
                          alt={user.displayName || ""}
                        />
                        <AvatarFallback>
                          {user.displayName?.charAt(0) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{user.displayName}</div>
                        <p className="text-xs text-muted-foreground">
                          @{user.username}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {memberSearchQuery
                    ? "No users found"
                    : "Start typing to search users"}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingMember(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedUser && handleAddMember(selectedUser._id)}
              disabled={!selectedUser || addMember.isPending}
              className="gap-2"
            >
              {addMember.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              <UserPlus className="h-4 w-4" />
              Add Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

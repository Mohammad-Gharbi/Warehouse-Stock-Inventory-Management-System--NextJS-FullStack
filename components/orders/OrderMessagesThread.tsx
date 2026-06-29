/**
 * Order Messages Thread
 * A shared per-order conversation between the buyer, the product owner(s)/seller and admins.
 * Any participant can post a message (with an optional file attachment); the others are
 * notified in-app and emailed a copy with a link back here to reply.
 */

"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  MessageSquare,
  Send,
  Paperclip,
  Loader2,
  X,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts";
import { useOrderMessages, useSendOrderMessage } from "@/hooks/queries";
import { ClientRelativeTime } from "@/components/shared";
import { cn } from "@/lib/utils";
import type { Order, OrderMessage } from "@/types";

/** Accepted attachment types: PDF + images + Office docs (same as order documents). */
const ACCEPT =
  ".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,application/pdf,image/jpeg,image/png,image/webp,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

interface OrderMessagesThreadProps {
  order: Order;
}

export default function OrderMessagesThread({ order }: OrderMessagesThreadProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const ownerIds = useMemo(
    () => order.orderProductOwners?.map((o) => o.userId) ?? [],
    [order.orderProductOwners],
  );

  // A participant is the buyer (placer/client), a product owner, or an admin.
  const isParticipant =
    user?.role === "admin" ||
    order.clientId === user?.id ||
    order.userId === user?.id ||
    (!!user?.id && ownerIds.includes(user.id));

  const {
    data: messages,
    isLoading,
    isError,
  } = useOrderMessages(order.id, isParticipant);
  const sendMessage = useSendOrderMessage(order.id);

  const roleLabel = useCallback(
    (message: OrderMessage): string => {
      if (message.senderId === user?.id) return "You";
      if (message.senderRole === "admin") return "Admin";
      if (ownerIds.includes(message.senderId)) return "Seller";
      if (
        message.senderId === order.clientId ||
        message.senderId === order.userId
      )
        return "Customer";
      return message.senderName || "Participant";
    },
    [user?.id, ownerIds, order.clientId, order.userId],
  );

  const handleSelectFile = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const selected = event.target.files?.[0] ?? null;
      // Reset input so re-selecting the same file fires change again.
      if (inputRef.current) inputRef.current.value = "";
      if (!selected) return;
      if (selected.size > MAX_SIZE) {
        toast({
          title: "File too large",
          description: "Attachments must be 10MB or smaller.",
          variant: "destructive",
        });
        return;
      }
      setFile(selected);
    },
    [toast],
  );

  const handleSend = useCallback(async () => {
    const trimmed = body.trim();
    if (!trimmed && !file) return;
    try {
      await sendMessage.mutateAsync({ body: trimmed, file });
      setBody("");
      setFile(null);
    } catch (error) {
      toast({
        title: "Message not sent",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  }, [body, file, sendMessage, toast]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Enter sends; Shift+Enter inserts a newline.
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        void handleSend();
      }
    },
    [handleSend],
  );

  if (!isParticipant) return null;

  const isSending = sendMessage.isPending;

  return (
    <article
      className={cn(
        "group rounded-[20px] border p-4 sm:p-5 backdrop-blur-sm transition-all duration-300",
        "bg-white/60 dark:bg-white/5",
        "border-blue-400/20 hover:border-blue-300/40",
      )}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 rounded-xl border border-blue-300/30 bg-blue-100/50 dark:border-blue-400/30 dark:bg-blue-500/20">
          <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Messages
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Discuss this order with the other parties — they&apos;re notified by
            email too.
          </p>
        </div>
      </div>

      {/* Thread */}
      <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-6 text-gray-500 dark:text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : isError ? (
          <p className="text-sm text-rose-600 dark:text-rose-400 py-4">
            Failed to load messages. Please try again.
          </p>
        ) : !messages || messages.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 py-6 text-center">
            No messages yet. Start the conversation below.
          </p>
        ) : (
          messages.map((message) => {
            const own = message.senderId === user?.id;
            return (
              <div
                key={message.id}
                className={cn("flex flex-col", own ? "items-end" : "items-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl border px-3.5 py-2.5",
                    own
                      ? "bg-blue-50/80 dark:bg-blue-500/10 border-blue-200/50 dark:border-blue-400/20"
                      : "bg-card border-gray-200/50 dark:border-white/10",
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-gray-900 dark:text-white">
                      {own ? "You" : message.senderName || message.senderEmail}
                    </span>
                    <span className="text-[10px] uppercase tracking-wide rounded-full px-1.5 py-0.5 bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400">
                      {roleLabel(message)}
                    </span>
                    <span className="text-[11px] text-gray-400 dark:text-gray-500">
                      <ClientRelativeTime date={message.createdAt} />
                    </span>
                  </div>
                  {message.body && (
                    <p className="text-sm text-gray-800 dark:text-gray-100 whitespace-pre-wrap break-words">
                      {message.body}
                    </p>
                  )}
                  {message.attachmentUrl && (
                    <a
                      href={message.attachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-sky-600 dark:text-sky-400 hover:text-sky-500 dark:hover:text-sky-300"
                    >
                      <FileText className="h-4 w-4" />
                      {message.attachmentFileName || "Download attachment"}
                    </a>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Composer */}
      <div className="mt-4 space-y-2">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write a message…"
          rows={2}
          disabled={isSending}
          className="resize-none"
        />
        {file && (
          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
            <FileText className="h-3.5 w-3.5" />
            <span className="truncate max-w-[200px]">{file.name}</span>
            <button
              type="button"
              onClick={() => setFile(null)}
              className="text-gray-400 hover:text-rose-500"
              aria-label="Remove attachment"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <div className="flex items-center justify-between gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            onChange={handleSelectFile}
            className="hidden"
            disabled={isSending}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isSending}
            onClick={() => inputRef.current?.click()}
          >
            <Paperclip className="h-4 w-4 mr-2" />
            Attach
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={isSending || (!body.trim() && !file)}
            onClick={handleSend}
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Send
          </Button>
        </div>
      </div>
    </article>
  );
}

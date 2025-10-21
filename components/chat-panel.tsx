"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

type Channel = {
  id: string
  name: string
  description: string | null
}

type Profile = {
  id: string
  display_name: string
  avatar_url: string | null
}

type Message = {
  id: string
  content: string
  created_at: string
  user_id: string
  profiles: {
    display_name: string
  }
}

type ChatPanelProps = {
  channel: Channel
  profile: Profile
}

export function ChatPanel({ channel, profile }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Fetch messages
  useEffect(() => {
    fetchMessages()

    // Subscribe to new messages
    const subscription = supabase
      .channel(`channel-${channel.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channel.id}`,
        },
        (payload) => {
          // Fetch the new message with profile data
          supabase
            .from("messages")
            .select("*, profiles(display_name)")
            .eq("id", payload.new.id)
            .single()
            .then(({ data }) => {
              if (data) {
                setMessages((prev) => [...prev, data as Message])
              }
            })
        },
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [channel.id])

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const fetchMessages = async () => {
    const { data } = await supabase
      .from("messages")
      .select("*, profiles(display_name)")
      .eq("channel_id", channel.id)
      .order("created_at", { ascending: true })

    if (data) {
      setMessages(data as Message[])
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || isLoading) return

    setIsLoading(true)
    try {
      await supabase.from("messages").insert({
        channel_id: channel.id,
        user_id: profile.id,
        content: newMessage.trim(),
      })

      setNewMessage("")
    } catch (error) {
      console.error("Error sending message:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  }

  return (
    <div className="flex h-full flex-col">
      {/* Channel Header */}
      <div className="border-b p-4">
        <h2 className="text-lg font-semibold"># {channel.name}</h2>
        {channel.description && <p className="text-sm text-muted-foreground">{channel.description}</p>}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                  {message.profiles.display_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-medium">{message.profiles.display_name}</span>
                    <span className="text-xs text-muted-foreground">{formatTime(message.created_at)}</span>
                  </div>
                  <p className="text-sm leading-relaxed">{message.content}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="border-t p-4">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            placeholder={`Message #${channel.name}`}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={isLoading || !newMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}

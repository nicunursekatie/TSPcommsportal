"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, User, Clock, FileText } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"

type Profile = {
  id: string
  display_name: string
  avatar_url: string | null
}

type AgendaItem = {
  id: string
  title: string
  description: string | null
  status: string
  created_at: string
  submitted_by: string
  profiles: {
    display_name: string
  }
  agenda_item_tags: {
    user_id: string
    profiles: {
      display_name: string
    }
  }[]
}

type AgendaPanelProps = {
  profile: Profile
}

export function AgendaPanel({ profile }: AgendaPanelProps) {
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([])
  const [allProfiles, setAllProfiles] = useState<Profile[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchAgendaItems()
    fetchProfiles()

    // Subscribe to agenda item changes
    const subscription = supabase
      .channel("agenda-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "agenda_items",
        },
        () => {
          fetchAgendaItems()
        },
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const fetchAgendaItems = async () => {
    const { data } = await supabase
      .from("agenda_items")
      .select(`
        *,
        profiles!agenda_items_submitted_by_fkey(display_name),
        agenda_item_tags(
          user_id,
          profiles(display_name)
        )
      `)
      .order("created_at", { ascending: false })

    if (data) {
      setAgendaItems(data as AgendaItem[])
    }
  }

  const fetchProfiles = async () => {
    const { data } = await supabase.from("profiles").select("*").order("display_name")

    if (data) {
      setAllProfiles(data)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || isLoading) return

    setIsLoading(true)
    try {
      // Insert agenda item
      const { data: newItem, error: itemError } = await supabase
        .from("agenda_items")
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          submitted_by: profile.id,
        })
        .select()
        .single()

      if (itemError) throw itemError

      // Insert tags
      if (selectedTags.length > 0 && newItem) {
        const tags = selectedTags.map((userId) => ({
          agenda_item_id: newItem.id,
          user_id: userId,
        }))

        const { error: tagsError } = await supabase.from("agenda_item_tags").insert(tags)

        if (tagsError) throw tagsError
      }

      // Reset form
      setTitle("")
      setDescription("")
      setSelectedTags([])
      setIsDialogOpen(false)
    } catch (error) {
      console.error("Error creating agenda item:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleTag = (userId: string) => {
    setSelectedTags((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]))
  }

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
      case "scheduled":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400"
      case "completed":
        return "bg-green-500/10 text-green-700 dark:text-green-400"
      default:
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400"
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Agenda Items</h2>
            <p className="text-sm text-muted-foreground">Submit topics for upcoming meetings</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Submit Agenda Item</DialogTitle>
                <DialogDescription>Add a topic you'd like to discuss in the next meeting</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="What would you like to discuss?"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Add more details about this topic..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tag Team Members (optional)</Label>
                  <ScrollArea className="h-32 rounded-md border p-2">
                    <div className="space-y-2">
                      {allProfiles.map((p) => (
                        <div key={p.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`tag-${p.id}`}
                            checked={selectedTags.includes(p.id)}
                            onCheckedChange={() => toggleTag(p.id)}
                          />
                          <label
                            htmlFor={`tag-${p.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {p.display_name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading || !title.trim()}>
                    {isLoading ? "Submitting..." : "Submit"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Agenda Items List */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {agendaItems.length === 0 ? (
            <div className="flex h-full items-center justify-center py-12">
              <div className="text-center">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">No agenda items yet</p>
                <p className="text-sm text-muted-foreground">Click "New Item" to submit a topic</p>
              </div>
            </div>
          ) : (
            agendaItems.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-base">{item.title}</CardTitle>
                      <CardDescription className="mt-1 flex items-center gap-2 text-xs">
                        <User className="h-3 w-3" />
                        {item.profiles.display_name}
                        <span>•</span>
                        <Clock className="h-3 w-3" />
                        {formatDate(item.created_at)}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" className={getStatusColor(item.status)}>
                      {item.status}
                    </Badge>
                  </div>
                </CardHeader>
                {(item.description || item.agenda_item_tags.length > 0) && (
                  <CardContent>
                    {item.description && (
                      <p className="text-sm leading-relaxed text-muted-foreground">{item.description}</p>
                    )}
                    {item.agenda_item_tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.agenda_item_tags.map((tag) => (
                          <Badge key={tag.user_id} variant="outline" className="text-xs">
                            <User className="mr-1 h-3 w-3" />
                            {tag.profiles.display_name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

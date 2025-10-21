"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { Plus, CalendarIcon, Clock } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Profile = {
  id: string
  display_name: string
  avatar_url: string | null
}

type Meeting = {
  id: string
  title: string
  date: string
  created_at: string
  meeting_agenda_items: {
    id: string
    time_slot_minutes: number
    order_index: number
    agenda_items: {
      id: string
      title: string
      description: string | null
    }
  }[]
}

type AgendaItem = {
  id: string
  title: string
  description: string | null
  status: string
}

type MeetingsPanelProps = {
  profile: Profile
}

export function MeetingsPanel({ profile }: MeetingsPanelProps) {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [availableAgendaItems, setAvailableAgendaItems] = useState<AgendaItem[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null)
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false)

  // Create meeting form
  const [meetingTitle, setMeetingTitle] = useState("")
  const [meetingDate, setMeetingDate] = useState("")
  const [meetingTime, setMeetingTime] = useState("")

  // Add agenda item form
  const [selectedAgendaItemId, setSelectedAgendaItemId] = useState("")
  const [timeSlotMinutes, setTimeSlotMinutes] = useState("15")

  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchMeetings()
    fetchAvailableAgendaItems()

    // Subscribe to meeting changes
    const subscription = supabase
      .channel("meeting-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "meetings",
        },
        () => {
          fetchMeetings()
        },
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const fetchMeetings = async () => {
    const { data } = await supabase
      .from("meetings")
      .select(`
        *,
        meeting_agenda_items(
          id,
          time_slot_minutes,
          order_index,
          agenda_items(
            id,
            title,
            description
          )
        )
      `)
      .order("date", { ascending: false })

    if (data) {
      // Sort agenda items by order_index
      const sortedData = data.map((meeting) => ({
        ...meeting,
        meeting_agenda_items: meeting.meeting_agenda_items.sort((a, b) => a.order_index - b.order_index),
      }))
      setMeetings(sortedData as Meeting[])
    }
  }

  const fetchAvailableAgendaItems = async () => {
    const { data } = await supabase
      .from("agenda_items")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false })

    if (data) {
      setAvailableAgendaItems(data)
    }
  }

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!meetingTitle.trim() || !meetingDate || !meetingTime || isLoading) return

    setIsLoading(true)
    try {
      const dateTime = new Date(`${meetingDate}T${meetingTime}`)

      const { error } = await supabase.from("meetings").insert({
        title: meetingTitle.trim(),
        date: dateTime.toISOString(),
        created_by: profile.id,
      })

      if (error) throw error

      setMeetingTitle("")
      setMeetingDate("")
      setMeetingTime("")
      setIsCreateDialogOpen(false)
      fetchMeetings()
    } catch (error) {
      console.error("Error creating meeting:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddAgendaItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAgendaItemId || !selectedMeeting || isLoading) return

    setIsLoading(true)
    try {
      // Get the next order index
      const maxOrder =
        selectedMeeting.meeting_agenda_items.length > 0
          ? Math.max(...selectedMeeting.meeting_agenda_items.map((item) => item.order_index))
          : -1

      const { error: insertError } = await supabase.from("meeting_agenda_items").insert({
        meeting_id: selectedMeeting.id,
        agenda_item_id: selectedAgendaItemId,
        time_slot_minutes: Number.parseInt(timeSlotMinutes),
        order_index: maxOrder + 1,
      })

      if (insertError) throw insertError

      // Update agenda item status to scheduled
      const { error: updateError } = await supabase
        .from("agenda_items")
        .update({ status: "scheduled" })
        .eq("id", selectedAgendaItemId)

      if (updateError) throw updateError

      setSelectedAgendaItemId("")
      setTimeSlotMinutes("15")
      setIsAddItemDialogOpen(false)
      fetchMeetings()
      fetchAvailableAgendaItems()
    } catch (error) {
      console.error("Error adding agenda item:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatDateTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  }

  const calculateTotalTime = (meeting: Meeting) => {
    return meeting.meeting_agenda_items.reduce((total, item) => total + item.time_slot_minutes, 0)
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Meetings</h2>
            <p className="text-sm text-muted-foreground">Plan your weekly meetings with time slots</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Meeting
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Meeting</DialogTitle>
                <DialogDescription>Schedule a new team meeting</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateMeeting} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="meeting-title">Meeting Title</Label>
                  <Input
                    id="meeting-title"
                    placeholder="Weekly Team Sync"
                    value={meetingTitle}
                    onChange={(e) => setMeetingTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meeting-date">Date</Label>
                  <Input
                    id="meeting-date"
                    type="date"
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meeting-time">Time</Label>
                  <Input
                    id="meeting-time"
                    type="time"
                    value={meetingTime}
                    onChange={(e) => setMeetingTime(e.target.value)}
                    required
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Creating..." : "Create Meeting"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Meetings List */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {meetings.length === 0 ? (
            <div className="flex h-full items-center justify-center py-12">
              <div className="text-center">
                <CalendarIcon className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">No meetings scheduled</p>
                <p className="text-sm text-muted-foreground">Click "New Meeting" to get started</p>
              </div>
            </div>
          ) : (
            meetings.map((meeting) => (
              <Card key={meeting.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-base">{meeting.title}</CardTitle>
                      <CardDescription className="mt-1 flex items-center gap-2 text-xs">
                        <CalendarIcon className="h-3 w-3" />
                        {formatDateTime(meeting.date)}
                        {meeting.meeting_agenda_items.length > 0 && (
                          <>
                            <span>•</span>
                            <Clock className="h-3 w-3" />
                            {calculateTotalTime(meeting)} min total
                          </>
                        )}
                      </CardDescription>
                    </div>
                    <Dialog
                      open={isAddItemDialogOpen && selectedMeeting?.id === meeting.id}
                      onOpenChange={(open) => {
                        setIsAddItemDialogOpen(open)
                        if (open) setSelectedMeeting(meeting)
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          <Plus className="mr-1 h-3 w-3" />
                          Add Item
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Add Agenda Item</DialogTitle>
                          <DialogDescription>Add an agenda item to this meeting with a time slot</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleAddAgendaItem} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="agenda-item">Agenda Item</Label>
                            <Select value={selectedAgendaItemId} onValueChange={setSelectedAgendaItemId} required>
                              <SelectTrigger>
                                <SelectValue placeholder="Select an agenda item" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableAgendaItems.length === 0 ? (
                                  <div className="p-2 text-sm text-muted-foreground">No pending agenda items</div>
                                ) : (
                                  availableAgendaItems.map((item) => (
                                    <SelectItem key={item.id} value={item.id}>
                                      {item.title}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="time-slot">Time Slot (minutes)</Label>
                            <Select value={timeSlotMinutes} onValueChange={setTimeSlotMinutes}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="5">5 minutes</SelectItem>
                                <SelectItem value="10">10 minutes</SelectItem>
                                <SelectItem value="15">15 minutes</SelectItem>
                                <SelectItem value="20">20 minutes</SelectItem>
                                <SelectItem value="30">30 minutes</SelectItem>
                                <SelectItem value="45">45 minutes</SelectItem>
                                <SelectItem value="60">60 minutes</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setIsAddItemDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button type="submit" disabled={isLoading || !selectedAgendaItemId}>
                              {isLoading ? "Adding..." : "Add Item"}
                            </Button>
                          </div>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                {meeting.meeting_agenda_items.length > 0 && (
                  <CardContent>
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Agenda</h4>
                      <div className="space-y-2">
                        {meeting.meeting_agenda_items.map((item, index) => (
                          <div key={item.id} className="flex items-start gap-3 rounded-lg border p-3">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium leading-relaxed">{item.agenda_items.title}</p>
                              {item.agenda_items.description && (
                                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                                  {item.agenda_items.description}
                                </p>
                              )}
                            </div>
                            <Badge variant="secondary" className="shrink-0">
                              <Clock className="mr-1 h-3 w-3" />
                              {item.time_slot_minutes}m
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
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

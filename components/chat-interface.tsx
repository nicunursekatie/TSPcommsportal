"use client"

import { useState } from "react"
import { MessageSquare, Calendar, FileText, LogOut, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ChatPanel } from "@/components/chat-panel"
import { AgendaPanel } from "@/components/agenda-panel"
import { MeetingsPanel } from "@/components/meetings-panel"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

type Profile = {
  id: string
  display_name: string
  avatar_url: string | null
}

type Channel = {
  id: string
  name: string
  description: string | null
}

type ChatInterfaceProps = {
  initialProfile: Profile
  initialChannels: Channel[]
}

export function ChatInterface({ initialProfile, initialChannels }: ChatInterfaceProps) {
  const [activeTab, setActiveTab] = useState<"chat" | "agenda" | "meetings">("chat")
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(initialChannels[0] || null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
    router.refresh()
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={`${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        } fixed inset-y-0 left-0 z-50 w-64 border-r bg-card transition-transform duration-300 lg:translate-x-0 lg:static`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b p-4">
            <h1 className="text-lg font-semibold">Team Hub</h1>
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileMenuOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            <Button
              variant={activeTab === "chat" ? "secondary" : "ghost"}
              className="w-full justify-start"
              onClick={() => {
                setActiveTab("chat")
                setMobileMenuOpen(false)
              }}
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Chat
            </Button>
            <Button
              variant={activeTab === "agenda" ? "secondary" : "ghost"}
              className="w-full justify-start"
              onClick={() => {
                setActiveTab("agenda")
                setMobileMenuOpen(false)
              }}
            >
              <FileText className="mr-2 h-4 w-4" />
              Agenda Items
            </Button>
            <Button
              variant={activeTab === "meetings" ? "secondary" : "ghost"}
              className="w-full justify-start"
              onClick={() => {
                setActiveTab("meetings")
                setMobileMenuOpen(false)
              }}
            >
              <Calendar className="mr-2 h-4 w-4" />
              Meetings
            </Button>
          </nav>

          {/* Channels (only show in chat tab) */}
          {activeTab === "chat" && (
            <div className="border-t p-4">
              <h2 className="mb-2 text-sm font-medium text-muted-foreground">Channels</h2>
              <div className="space-y-1">
                {initialChannels.map((channel) => (
                  <Button
                    key={channel.id}
                    variant={selectedChannel?.id === channel.id ? "secondary" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => {
                      setSelectedChannel(channel)
                      setMobileMenuOpen(false)
                    }}
                  >
                    # {channel.name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* User Profile */}
          <div className="border-t p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                  {initialProfile.display_name.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium">{initialProfile.display_name}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={handleSignOut} title="Sign out">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex flex-1 flex-col">
        {/* Mobile Header */}
        <header className="flex items-center justify-between border-b p-4 lg:hidden">
          <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Team Hub</h1>
          <div className="w-10" />
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          {activeTab === "chat" && selectedChannel && <ChatPanel channel={selectedChannel} profile={initialProfile} />}
          {activeTab === "agenda" && <AgendaPanel profile={initialProfile} />}
          {activeTab === "meetings" && <MeetingsPanel profile={initialProfile} />}
        </div>
      </main>
    </div>
  )
}

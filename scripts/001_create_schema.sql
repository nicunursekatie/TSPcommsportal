-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create channels table for team communication
CREATE TABLE IF NOT EXISTS public.channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create agenda_items table
CREATE TABLE IF NOT EXISTS public.agenda_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  submitted_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create meetings table
CREATE TABLE IF NOT EXISTS public.meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create meeting_agenda_items table (junction table with time slots)
CREATE TABLE IF NOT EXISTS public.meeting_agenda_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  agenda_item_id UUID NOT NULL REFERENCES public.agenda_items(id) ON DELETE CASCADE,
  time_slot_minutes INTEGER NOT NULL,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(meeting_id, agenda_item_id)
);

-- Create agenda_item_tags table (for tagging team members)
CREATE TABLE IF NOT EXISTS public.agenda_item_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agenda_item_id UUID NOT NULL REFERENCES public.agenda_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agenda_item_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_agenda_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_item_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies for channels
CREATE POLICY "Users can view all channels"
  ON public.channels FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create channels"
  ON public.channels FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- RLS Policies for messages
CREATE POLICY "Users can view all messages"
  ON public.messages FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own messages"
  ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own messages"
  ON public.messages FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for agenda_items
CREATE POLICY "Users can view all agenda items"
  ON public.agenda_items FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own agenda items"
  ON public.agenda_items FOR INSERT
  WITH CHECK (auth.uid() = submitted_by);

CREATE POLICY "Users can update their own agenda items"
  ON public.agenda_items FOR UPDATE
  USING (auth.uid() = submitted_by);

-- RLS Policies for meetings
CREATE POLICY "Users can view all meetings"
  ON public.meetings FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create meetings"
  ON public.meetings FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- RLS Policies for meeting_agenda_items
CREATE POLICY "Users can view all meeting agenda items"
  ON public.meeting_agenda_items FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage meeting agenda items"
  ON public.meeting_agenda_items FOR ALL
  USING (true);

-- RLS Policies for agenda_item_tags
CREATE POLICY "Users can view all agenda item tags"
  ON public.agenda_item_tags FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage tags"
  ON public.agenda_item_tags FOR ALL
  USING (true);

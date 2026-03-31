-- =============================================================
-- Outreach CRM — Supabase Schema
-- Run this entire file in the Supabase SQL Editor (one shot).
-- =============================================================

-- 1. TABLES -------------------------------------------------

CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  title TEXT,
  company TEXT NOT NULL,
  email TEXT,
  linkedin_url TEXT,
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  industry TEXT,
  seniority TEXT,
  follow_up_date DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE outreach (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  channel TEXT NOT NULL CHECK (channel IN ('LinkedIn InMail', 'LinkedIn Message', 'Email')),
  subject TEXT,
  message_content TEXT,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'replied', 'follow-up-needed', 'no-response')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE writing_samples (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ROW LEVEL SECURITY ------------------------------------

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach ENABLE ROW LEVEL SECURITY;
ALTER TABLE writing_samples ENABLE ROW LEVEL SECURITY;

-- Profiles: everyone can read, only own row can be inserted/updated
CREATE POLICY "Anyone can read profiles"
  ON profiles FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Shared workspace: all authenticated users have full CRUD
CREATE POLICY "Authenticated full access"
  ON contacts FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated full access"
  ON outreach FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated full access"
  ON writing_samples FOR ALL
  USING (auth.role() = 'authenticated');

-- 3. TRIGGERS -----------------------------------------------

-- Auto-create a profile row when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at on contacts
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

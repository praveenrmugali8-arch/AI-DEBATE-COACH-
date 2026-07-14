-- PostgreSQL 14+. Create the database first: createdb debate_coach
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role VARCHAR(12) NOT NULL DEFAULT 'student' CHECK (role IN ('student','educator','hoster')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE debates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic VARCHAR(300) NOT NULL,
  format VARCHAR(100) NOT NULL,
  status VARCHAR(12) NOT NULL DEFAULT 'live' CHECK (status IN ('live','ended')),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

CREATE TABLE debate_participants (
  debate_id UUID NOT NULL REFERENCES debates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (debate_id, user_id)
);

CREATE TABLE speakers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debate_id UUID NOT NULL REFERENCES debates(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  side VARCHAR(50) NOT NULL,
  minutes SMALLINT NOT NULL DEFAULT 3 CHECK (minutes BETWEEN 1 AND 60),
  turn_order SMALLINT NOT NULL,
  UNIQUE (debate_id, turn_order)
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debate_id UUID NOT NULL REFERENCES debates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body VARCHAR(1000) NOT NULL CHECK (length(trim(body)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE host_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debate_id UUID NOT NULL REFERENCES debates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  speaker_id UUID REFERENCES speakers(id) ON DELETE SET NULL,
  body VARCHAR(2000) NOT NULL CHECK (length(trim(body)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX debates_creator_idx ON debates(created_by, created_at DESC);
CREATE INDEX messages_debate_idx ON messages(debate_id, created_at);
CREATE INDEX notes_private_idx ON host_notes(debate_id, user_id, created_at DESC);

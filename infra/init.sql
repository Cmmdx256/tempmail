-- Create database and tables for temp-mail service

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Addresses table
CREATE TABLE addresses (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  local_part text NOT NULL,
  domain text NOT NULL,
  full_address text GENERATED ALWAYS AS (local_part || '@' || domain) STORED,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  token text,
  INDEX (expires_at)
);

-- Messages table
CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  address_id uuid REFERENCES addresses(id) ON DELETE CASCADE,
  from_address text,
  subject text,
  headers jsonb,
  body_text text,
  body_html text,
  raw_object_path text,
  received_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  seen boolean DEFAULT false
);

-- Attachments table
CREATE TABLE attachments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id uuid REFERENCES messages(id) ON DELETE CASCADE,
  filename text,
  content_type text,
  size bigint,
  storage_key text,
  created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_messages_address_id ON messages(address_id);
CREATE INDEX idx_messages_received_at ON messages(received_at);
CREATE INDEX idx_messages_expires_at ON messages(expires_at);
CREATE INDEX idx_addresses_expires_at ON addresses(expires_at);
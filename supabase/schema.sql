-- Supabase Skills Assessment - Database Schema
-- This schema contains INTENTIONAL ISSUES for candidates to identify and fix

-- ============================================
-- TABLE 1: Candidates (stores assessment takers)
-- ============================================
CREATE TABLE IF NOT EXISTS candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    github_url TEXT,
    portfolio_url TEXT,
    evaluation_score INTEGER CHECK (evaluation_score >= 0 AND evaluation_score <= 100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE 2: Challenges (the test challenges)
-- ============================================
CREATE TABLE IF NOT EXISTS challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_number INTEGER NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
    category TEXT CHECK (category IN ('rls', 'storage', 'auth', 'queries', 'migrations', 'client')),
    points INTEGER DEFAULT 10,
    hint TEXT,
    solution TEXT, -- Hidden from candidates
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE 3: Submissions (candidate answers)
-- ============================================
CREATE TABLE IF NOT EXISTS submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
    challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
    answer TEXT NOT NULL,
    code_snippet TEXT,
    is_correct BOOLEAN DEFAULT FALSE,
    score INTEGER DEFAULT 0,
    feedback TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    graded_at TIMESTAMPTZ,
    graded_by TEXT,
    UNIQUE(candidate_id, challenge_id)
);

-- ============================================
-- TABLE 4: Test Data - Users (for RLS testing)
-- INTENTIONAL ISSUE: RLS policies are misconfigured
-- ============================================
CREATE TABLE IF NOT EXISTS test_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID, -- Should reference auth.users but intentionally broken
    email TEXT,
    role TEXT CHECK (role IN ('admin', 'user', 'guest')),
    data JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INTENTIONAL ISSUE #1: RLS enabled but no policies (will block all access)
ALTER TABLE test_users ENABLE ROW LEVEL SECURITY;

-- ============================================
-- TABLE 5: Test Data - Documents (for storage testing)
-- INTENTIONAL ISSUE: Foreign key references wrong table
-- ============================================
CREATE TABLE IF NOT EXISTS test_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID, -- ISSUE: Should reference test_users but doesn't
    filename TEXT NOT NULL,
    file_path TEXT,
    file_size BIGINT,
    mime_type TEXT,
    -- ISSUE: Missing storage_bucket reference
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE 6: Test Data - Sessions (for auth testing)
-- INTENTIONAL ISSUE: Incorrect constraint
-- ============================================
CREATE TABLE IF NOT EXISTS test_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES test_users(id),
    token TEXT UNIQUE,
    -- ISSUE: expires_at allows past dates (should have CHECK constraint)
    expires_at TIMESTAMPTZ,
    ip_address TEXT,
    user_agent TEXT,
    is_valid BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE 7: Test Data - Orders (for query testing)
-- INTENTIONAL ISSUES: Missing indexes, bad data types
-- ============================================
CREATE TABLE IF NOT EXISTS test_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES test_users(id),
    -- ISSUE: Using TEXT for amount instead of NUMERIC/DECIMAL
    amount TEXT,
    currency TEXT DEFAULT 'USD',
    status TEXT,
    -- ISSUE: metadata should be JSONB not TEXT
    metadata TEXT,
    -- ISSUE: No index on frequently queried columns
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE 8: Test Data - Audit Log (for migration testing)
-- INTENTIONAL ISSUE: Missing trigger for auto-updating
-- ============================================
CREATE TABLE IF NOT EXISTS test_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data JSONB,
    new_data JSONB,
    -- ISSUE: performed_by should reference a user
    performed_by TEXT,
    performed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- RLS POLICIES (Some intentionally broken)
-- ============================================

-- Candidates table - proper policies
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create candidates" ON candidates
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Candidates can view own data" ON candidates
    FOR SELECT USING (true); -- ISSUE: Should use auth.uid() = id

-- Challenges table - public read
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view challenges" ON challenges
    FOR SELECT USING (true);

-- Submissions table - broken policy
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- ISSUE: This policy references auth.uid() but table uses candidate_id
CREATE POLICY "Users can view own submissions" ON submissions
    FOR SELECT USING (auth.uid()::text = candidate_id::text);

CREATE POLICY "Users can create submissions" ON submissions
    FOR INSERT WITH CHECK (true);

-- test_documents - missing SELECT policy
ALTER TABLE test_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert documents" ON test_documents
    FOR INSERT WITH CHECK (true);
-- ISSUE: No SELECT policy - will block reads

-- test_orders - overly permissive
ALTER TABLE test_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can do anything" ON test_orders
    FOR ALL USING (true) WITH CHECK (true);
-- ISSUE: No row-level restriction

-- ============================================
-- INDEXES (Some missing intentionally)
-- ============================================

CREATE INDEX idx_candidates_email ON candidates(email);
CREATE INDEX idx_submissions_candidate ON submissions(candidate_id);
-- ISSUE: Missing index on submissions(challenge_id)
-- ISSUE: Missing index on test_orders(user_id)
-- ISSUE: Missing index on test_orders(status)
-- ISSUE: Missing index on test_orders(created_at)

-- ============================================
-- FUNCTIONS (Some with issues)
-- ============================================

-- Function to update updated_at (correct)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ISSUE: Trigger only on candidates, missing on other tables
CREATE TRIGGER update_candidates_updated_at
    BEFORE UPDATE ON candidates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ISSUE: Missing trigger on test_orders which has updated_at column

-- ============================================
-- SEED DATA - Challenges
-- ============================================

INSERT INTO challenges (challenge_number, title, description, difficulty, category, points, hint) VALUES
(1, 'Fix RLS Policy - Blocked Access',
   'The test_users table has RLS enabled but no policies, blocking all access. Write the correct RLS policies to allow: 1) Users to read their own data, 2) Admins to read all data, 3) Anyone to insert new users.',
   'medium', 'rls', 15,
   'You need CREATE POLICY statements for SELECT and INSERT operations'),

(2, 'Fix RLS Policy - Wrong Reference',
   'The submissions table policy uses auth.uid() but the table uses candidate_id (not linked to Supabase auth). Fix the policy to work correctly.',
   'hard', 'rls', 20,
   'Consider how to identify users without Supabase auth - maybe use a session token or email verification'),

(3, 'Add Missing SELECT Policy',
   'The test_documents table can insert but cannot read (missing SELECT policy). Add the correct policy.',
   'easy', 'rls', 10,
   'A simple SELECT policy with USING (true) would work, but consider if you want row-level restrictions'),

(4, 'Fix Overly Permissive Policy',
   'The test_orders table has a policy that allows anyone to do anything. Rewrite it to: 1) Allow users to see only their orders, 2) Prevent updates to completed orders.',
   'medium', 'rls', 15,
   'Use USING for SELECT and WITH CHECK for INSERT/UPDATE with appropriate conditions'),

(5, 'Add Missing Indexes',
   'The test_orders table is missing indexes on frequently queried columns. Identify which columns need indexes and write the CREATE INDEX statements.',
   'easy', 'queries', 10,
   'Think about WHERE clauses and JOIN conditions - user_id, status, and created_at are common filters'),

(6, 'Fix Data Type Issues',
   'The test_orders table has incorrect data types: amount is TEXT (should be NUMERIC) and metadata is TEXT (should be JSONB). Write ALTER TABLE statements to fix these.',
   'medium', 'migrations', 15,
   'Use ALTER TABLE ... ALTER COLUMN ... TYPE with appropriate casting'),

(7, 'Add Missing Trigger',
   'The test_orders table has an updated_at column but no trigger to auto-update it. Create the trigger.',
   'easy', 'migrations', 10,
   'Use the existing update_updated_at_column() function'),

(8, 'Fix Foreign Key Issue',
   'The test_documents table has owner_id but no foreign key constraint. Add the proper constraint.',
   'easy', 'migrations', 10,
   'Use ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY'),

(9, 'Add Session Expiry Check',
   'The test_sessions table allows expired sessions. Add a CHECK constraint to ensure expires_at is always in the future when inserting.',
   'medium', 'migrations', 15,
   'CHECK constraints can use NOW() for comparison, but consider if this is the right approach'),

(10, 'Create Storage Bucket Policy',
   'Write Supabase Storage policies for a bucket called "assessment-files" that: 1) Allows authenticated users to upload, 2) Allows public read access, 3) Only allows owners to delete their files.',
   'hard', 'storage', 20,
   'Storage policies use storage.objects table with bucket_id and owner conditions')

ON CONFLICT (challenge_number) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    difficulty = EXCLUDED.difficulty,
    category = EXCLUDED.category,
    points = EXCLUDED.points,
    hint = EXCLUDED.hint;

-- ============================================
-- SEED DATA - Sample test data
-- ============================================

INSERT INTO test_users (email, role, data) VALUES
('admin@test.com', 'admin', '{"level": "senior", "department": "engineering"}'),
('user1@test.com', 'user', '{"level": "junior", "department": "sales"}'),
('user2@test.com', 'user', '{"level": "mid", "department": "marketing"}'),
('guest@test.com', 'guest', '{}')
ON CONFLICT DO NOTHING;

-- ============================================
-- COMPLETION
-- ============================================

DO $$
BEGIN
    RAISE NOTICE 'Schema created with intentional issues for assessment';
    RAISE NOTICE 'Challenges loaded: 10';
END $$;

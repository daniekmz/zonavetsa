-- COMBINED SCHEMA SCRIPT
-- Generated from: 001_initial_schema.sql, 002_portfolio_public_slug.sql, 003_announcements.sql, 004_notification_announcement_type.sql

-- ============================================
-- FROM: 001_initial_schema.sql
-- ============================================

-- ZonaVetsa Database Schema
-- Initial schema aligned to the current application flow:
-- local login, class-based content, exams, assignments, QR attendance,
-- notifications, leaderboard, storage, and realtime updates.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CORE TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS profiles (
    username TEXT PRIMARY KEY,
    id UUID DEFAULT uuid_generate_v4(),
    role TEXT NOT NULL DEFAULT 'siswa' CHECK (role IN ('siswa', 'guru', 'admin')),
    name TEXT NOT NULL,
    email TEXT,
    password TEXT,
    password_hash TEXT,
    avatar_url TEXT,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teachers (
    kode_guru TEXT PRIMARY KEY,
    id UUID DEFAULT uuid_generate_v4(),
    user_id UUID,
    nip TEXT,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    subject TEXT,
    avatar_url TEXT,
    password TEXT,
    password_hash TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS majors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    skills TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    walikelas_kode TEXT REFERENCES teachers(kode_guru) ON DELETE SET NULL,
    major_id UUID REFERENCES majors(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS students (
    nis TEXT PRIMARY KEY,
    id UUID DEFAULT uuid_generate_v4(),
    user_id UUID,
    name TEXT NOT NULL,
    absen INTEGER,
    class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
    email TEXT,
    phone TEXT,
    avatar_url TEXT,
    password TEXT,
    password_hash TEXT,
    last_teacher_kode TEXT REFERENCES teachers(kode_guru) ON DELETE SET NULL,
    last_class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
    points INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'graduated', 'dropout')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS school_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT NOT NULL UNIQUE,
    value INTEGER DEFAULT 0 CHECK (value >= 0),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- FILES & PORTOFOLIO
-- ============================================

CREATE TABLE IF NOT EXISTS portofolios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_nis TEXT REFERENCES students(nis) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    public_slug TEXT,
    visibility_scope TEXT NOT NULL DEFAULT 'class' CHECK (visibility_scope IN ('class', 'global')),
    uploader_name TEXT,
    uploader_class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
    uploader_class_name TEXT,
    likes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_portofolios_public_slug
    ON portofolios(public_slug)
    WHERE public_slug IS NOT NULL;

CREATE TABLE IF NOT EXISTS portfolio_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    portfolio_id UUID NOT NULL REFERENCES portofolios(id) ON DELETE CASCADE,
    liker_role TEXT NOT NULL CHECK (liker_role IN ('siswa', 'guru')),
    liker_nis TEXT REFERENCES students(nis) ON DELETE CASCADE,
    liker_kode TEXT REFERENCES teachers(kode_guru) ON DELETE CASCADE,
    liker_name TEXT NOT NULL,
    liker_class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
    liker_class_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT portfolio_likes_actor_check CHECK (
        (liker_role = 'siswa' AND liker_nis IS NOT NULL AND liker_kode IS NULL) OR
        (liker_role = 'guru' AND liker_kode IS NOT NULL)
    )
);

CREATE TABLE IF NOT EXISTS portfolio_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    portfolio_id UUID NOT NULL REFERENCES portofolios(id) ON DELETE CASCADE,
    commenter_role TEXT NOT NULL CHECK (commenter_role IN ('siswa', 'guru')),
    commenter_nis TEXT REFERENCES students(nis) ON DELETE CASCADE,
    commenter_kode TEXT REFERENCES teachers(kode_guru) ON DELETE CASCADE,
    commenter_name TEXT NOT NULL,
    commenter_class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
    commenter_class_name TEXT,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT portfolio_comments_actor_check CHECK (
        (commenter_role = 'siswa' AND commenter_nis IS NOT NULL AND commenter_kode IS NULL) OR
        (commenter_role = 'guru' AND commenter_kode IS NOT NULL)
    )
);

CREATE TABLE IF NOT EXISTS files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'file' CHECK (type IN ('folder', 'file')),
    mime_type TEXT,
    size BIGINT,
    path TEXT,
    parent_id UUID REFERENCES files(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
    creator_kode TEXT,
    creator_role TEXT CHECK (creator_role IN ('siswa', 'guru', 'admin')),
    description TEXT,
    is_published BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- EXAMS
-- ============================================

CREATE TABLE IF NOT EXISTS exams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    teacher_kode TEXT REFERENCES teachers(kode_guru) ON DELETE CASCADE,
    class_id TEXT NOT NULL,
    duration_minutes INTEGER DEFAULT 90 CHECK (duration_minutes > 0),
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    shuffle_questions BOOLEAN DEFAULT FALSE,
    shuffle_options BOOLEAN DEFAULT FALSE,
    show_results BOOLEAN DEFAULT TRUE,
    passing_score INTEGER DEFAULT 70 CHECK (passing_score BETWEEN 0 AND 100),
    instructions TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exam_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    option_a TEXT,
    option_b TEXT,
    option_c TEXT,
    option_d TEXT,
    option_e TEXT,
    correct_answer TEXT,
    is_essay BOOLEAN DEFAULT FALSE,
    is_true_false BOOLEAN DEFAULT FALSE,
    points INTEGER DEFAULT 10 CHECK (points >= 0),
    explanation TEXT,
    order_index INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exam_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
    student_nis TEXT REFERENCES students(nis) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    submitted_at TIMESTAMP WITH TIME ZONE,
    is_completed BOOLEAN DEFAULT FALSE,
    time_remaining INTEGER CHECK (time_remaining IS NULL OR time_remaining >= 0),
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (exam_id, student_nis)
);

CREATE TABLE IF NOT EXISTS exam_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES exam_sessions(id) ON DELETE CASCADE,
    question_id UUID REFERENCES exam_questions(id) ON DELETE CASCADE,
    answer TEXT,
    is_correct BOOLEAN,
    points_earned INTEGER DEFAULT 0 CHECK (points_earned >= 0),
    graded_at TIMESTAMP WITH TIME ZONE,
    graded_by TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (session_id, question_id)
);

CREATE TABLE IF NOT EXISTS exam_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
    student_nis TEXT REFERENCES students(nis) ON DELETE CASCADE,
    score DECIMAL(5,2) CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
    total_points INTEGER DEFAULT 0,
    earned_points INTEGER DEFAULT 0,
    answers JSONB,
    submitted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (exam_id, student_nis)
);

-- ============================================
-- ASSIGNMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    teacher_kode TEXT REFERENCES teachers(kode_guru) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    due_date TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed')),
    published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assignment_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
    student_nis TEXT REFERENCES students(nis) ON DELETE CASCADE,
    file_url TEXT,
    notes TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    graded BOOLEAN DEFAULT FALSE,
    grade TEXT,
    feedback TEXT,
    graded_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (assignment_id, student_nis)
);

-- ============================================
-- ATTENDANCE
-- ============================================

CREATE TABLE IF NOT EXISTS attendance_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_kode TEXT REFERENCES teachers(kode_guru) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    code TEXT NOT NULL UNIQUE,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
    closed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    student_nis TEXT REFERENCES students(nis) ON DELETE CASCADE,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'present' CHECK (status IN ('present', 'late', 'absent')),
    source TEXT DEFAULT 'qr' CHECK (source IN ('qr', 'manual', 'system')),
    notes TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (session_id, student_nis)
);

-- ============================================
-- LOGS & NOTIFICATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_kode TEXT NOT NULL,
    user_role TEXT NOT NULL CHECK (user_role IN ('siswa', 'guru', 'admin', 'system')),
    action TEXT NOT NULL,
    details TEXT,
    metadata JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_kode TEXT NOT NULL,
    user_role TEXT NOT NULL CHECK (user_role IN ('siswa', 'guru', 'admin')),
    sender_kode TEXT,
    sender_role TEXT CHECK (sender_role IN ('siswa', 'guru', 'admin', 'system')),
    sender_name TEXT,
    type TEXT NOT NULL CHECK (type IN ('attendance', 'exam', 'file', 'assignment', 'system', 'profile', 'login', 'announcement')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
    title TEXT NOT NULL,
    message TEXT,
    link TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    entity_type TEXT,
    entity_id TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author_kode TEXT,
    author_role TEXT CHECK (author_role IN ('admin', 'guru')),
    author_name TEXT,
    target_roles TEXT[] DEFAULT ARRAY['siswa']::TEXT[],
    target_classes TEXT[] DEFAULT ARRAY[]::TEXT[],
    is_pinned BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- COMPATIBILITY UPDATES FOR EXISTING DATABASES
-- ============================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS id UUID DEFAULT uuid_generate_v4();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'siswa';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE teachers ADD COLUMN IF NOT EXISTS id UUID DEFAULT uuid_generate_v4();
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS nip TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE majors ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE majors ADD COLUMN IF NOT EXISTS icon TEXT;
ALTER TABLE majors ADD COLUMN IF NOT EXISTS skills TEXT[];
ALTER TABLE majors ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE majors ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE majors ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE classes ADD COLUMN IF NOT EXISTS walikelas_kode TEXT;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS major_id UUID;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE classes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE students ADD COLUMN IF NOT EXISTS id UUID DEFAULT uuid_generate_v4();
ALTER TABLE students ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE students ADD COLUMN IF NOT EXISTS absen INTEGER;
ALTER TABLE students ADD COLUMN IF NOT EXISTS class_id UUID;
ALTER TABLE students ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS last_teacher_kode TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS last_class_id UUID;
ALTER TABLE students ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;
ALTER TABLE students ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;
ALTER TABLE students ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE students ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE students ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE portofolios ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE portofolios ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE portofolios ADD COLUMN IF NOT EXISTS visibility_scope TEXT DEFAULT 'class';
ALTER TABLE portofolios ADD COLUMN IF NOT EXISTS uploader_name TEXT;
ALTER TABLE portofolios ADD COLUMN IF NOT EXISTS uploader_class_id UUID;
ALTER TABLE portofolios ADD COLUMN IF NOT EXISTS uploader_class_name TEXT;
ALTER TABLE portofolios ADD COLUMN IF NOT EXISTS likes INTEGER DEFAULT 0;
ALTER TABLE portofolios ADD COLUMN IF NOT EXISTS comments INTEGER DEFAULT 0;
ALTER TABLE portofolios ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;
ALTER TABLE portofolios ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE portofolios ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

CREATE TABLE IF NOT EXISTS portfolio_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    portfolio_id UUID NOT NULL REFERENCES portofolios(id) ON DELETE CASCADE,
    liker_role TEXT NOT NULL CHECK (liker_role IN ('siswa', 'guru')),
    liker_nis TEXT REFERENCES students(nis) ON DELETE CASCADE,
    liker_kode TEXT REFERENCES teachers(kode_guru) ON DELETE CASCADE,
    liker_name TEXT NOT NULL,
    liker_class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
    liker_class_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS portfolio_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    portfolio_id UUID NOT NULL REFERENCES portofolios(id) ON DELETE CASCADE,
    commenter_role TEXT NOT NULL CHECK (commenter_role IN ('siswa', 'guru')),
    commenter_nis TEXT REFERENCES students(nis) ON DELETE CASCADE,
    commenter_kode TEXT REFERENCES teachers(kode_guru) ON DELETE CASCADE,
    commenter_name TEXT NOT NULL,
    commenter_class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
    commenter_class_name TEXT,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE files ADD COLUMN IF NOT EXISTS mime_type TEXT;
ALTER TABLE files ADD COLUMN IF NOT EXISTS size BIGINT;
ALTER TABLE files ADD COLUMN IF NOT EXISTS path TEXT;
ALTER TABLE files ADD COLUMN IF NOT EXISTS parent_id UUID;
ALTER TABLE files ADD COLUMN IF NOT EXISTS class_id UUID;
ALTER TABLE files ADD COLUMN IF NOT EXISTS creator_kode TEXT;
ALTER TABLE files ADD COLUMN IF NOT EXISTS creator_role TEXT;
ALTER TABLE files ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE files ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT TRUE;
ALTER TABLE files ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE files ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE exams ADD COLUMN IF NOT EXISTS teacher_kode TEXT;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS class_id TEXT;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 90;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE exams ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS start_time TIMESTAMP WITH TIME ZONE;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS end_time TIMESTAMP WITH TIME ZONE;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS shuffle_questions BOOLEAN DEFAULT FALSE;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS shuffle_options BOOLEAN DEFAULT FALSE;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS show_results BOOLEAN DEFAULT TRUE;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS passing_score INTEGER DEFAULT 70;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS instructions TEXT;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE exam_questions ADD COLUMN IF NOT EXISTS option_e TEXT;
ALTER TABLE exam_questions ADD COLUMN IF NOT EXISTS is_true_false BOOLEAN DEFAULT FALSE;
ALTER TABLE exam_questions ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 10;
ALTER TABLE exam_questions ADD COLUMN IF NOT EXISTS explanation TEXT;
ALTER TABLE exam_questions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE exam_sessions ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE exam_sessions ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE exam_sessions ADD COLUMN IF NOT EXISTS time_remaining INTEGER;
ALTER TABLE exam_sessions ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE exam_sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE exam_answers ADD COLUMN IF NOT EXISTS is_correct BOOLEAN;
ALTER TABLE exam_answers ADD COLUMN IF NOT EXISTS points_earned INTEGER DEFAULT 0;
ALTER TABLE exam_answers ADD COLUMN IF NOT EXISTS graded_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE exam_answers ADD COLUMN IF NOT EXISTS graded_by TEXT;
ALTER TABLE exam_answers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE exam_scores ADD COLUMN IF NOT EXISTS student_nis TEXT;
ALTER TABLE exam_scores ADD COLUMN IF NOT EXISTS total_points INTEGER DEFAULT 0;
ALTER TABLE exam_scores ADD COLUMN IF NOT EXISTS earned_points INTEGER DEFAULT 0;
ALTER TABLE exam_scores ADD COLUMN IF NOT EXISTS answers JSONB;
ALTER TABLE exam_scores ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE exam_scores ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE exam_scores ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE assignments ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS graded BOOLEAN DEFAULT FALSE;
ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS grade TEXT;
ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS feedback TEXT;
ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS graded_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'present';
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'qr';
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS details TEXT;
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS sender_kode TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS sender_role TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS sender_name TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS entity_id TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE announcements ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS author_kode TEXT;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS author_role TEXT;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS author_name TEXT;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS target_roles TEXT[] DEFAULT ARRAY['siswa']::TEXT[];
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS target_classes TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE school_stats ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

DO $$
BEGIN
    UPDATE portofolios p
    SET visibility_scope = COALESCE(NULLIF(p.visibility_scope, ''), 'class'),
        uploader_name = COALESCE(p.uploader_name, s.name),
        uploader_class_id = COALESCE(p.uploader_class_id, s.last_class_id, s.class_id),
        uploader_class_name = COALESCE(p.uploader_class_name, c.name)
    FROM students s
    LEFT JOIN classes c ON c.id = COALESCE(s.last_class_id, s.class_id)
    WHERE p.student_nis = s.nis;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'portofolios_visibility_scope_check'
    ) THEN
        ALTER TABLE portofolios
            ADD CONSTRAINT portofolios_visibility_scope_check
            CHECK (visibility_scope IN ('class', 'global'));
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'portfolio_likes_actor_check'
    ) THEN
        ALTER TABLE portfolio_likes
            ADD CONSTRAINT portfolio_likes_actor_check
            CHECK (
                (liker_role = 'siswa' AND liker_nis IS NOT NULL AND liker_kode IS NULL) OR
                (liker_role = 'guru' AND liker_kode IS NOT NULL)
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'portfolio_comments_actor_check'
    ) THEN
        ALTER TABLE portfolio_comments
            ADD CONSTRAINT portfolio_comments_actor_check
            CHECK (
                (commenter_role = 'siswa' AND commenter_nis IS NOT NULL AND commenter_kode IS NULL) OR
                (commenter_role = 'guru' AND commenter_kode IS NOT NULL)
            );
    END IF;
END
$$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_schema = 'public'
          AND table_name = 'exams'
          AND constraint_name = 'exams_class_id_fkey'
    ) THEN
        ALTER TABLE exams DROP CONSTRAINT exams_class_id_fkey;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'exams'
          AND column_name = 'class_id'
          AND data_type <> 'text'
    ) THEN
        ALTER TABLE exams
            ALTER COLUMN class_id TYPE TEXT
            USING class_id::text;
    END IF;
END
$$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'classes'
          AND column_name = 'walikelas_id'
    ) THEN
        EXECUTE $sql$
            UPDATE classes c
            SET walikelas_kode = t.kode_guru
            FROM teachers t
            WHERE c.walikelas_kode IS NULL
              AND c.walikelas_id IS NOT NULL
              AND c.walikelas_id::text = t.id::text
        $sql$;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'students'
          AND column_name = 'last_teacher_id'
    ) THEN
        EXECUTE $sql$
            UPDATE students s
            SET last_teacher_kode = t.kode_guru
            FROM teachers t
            WHERE s.last_teacher_kode IS NULL
              AND s.last_teacher_id IS NOT NULL
              AND s.last_teacher_id::text = t.id::text
        $sql$;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'exams'
          AND column_name = 'teacher_id'
    ) THEN
        EXECUTE $sql$
            UPDATE exams e
            SET teacher_kode = t.kode_guru
            FROM teachers t
            WHERE e.teacher_kode IS NULL
              AND e.teacher_id IS NOT NULL
              AND e.teacher_id::text = t.id::text
        $sql$;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'exam_scores'
          AND column_name = 'student_id'
    ) THEN
        EXECUTE $sql$
            UPDATE exam_scores es
            SET student_nis = s.nis
            FROM students s
            WHERE es.student_nis IS NULL
              AND es.student_id IS NOT NULL
              AND es.student_id::text = s.id::text
        $sql$;
    END IF;
END
$$;

UPDATE profiles
SET id = COALESCE(id, uuid_generate_v4()),
    password_hash = COALESCE(NULLIF(password_hash, ''), password),
    password = COALESCE(NULLIF(password, ''), password_hash)
WHERE id IS NULL
   OR password_hash IS NULL
   OR password_hash = ''
   OR password IS NULL
   OR password = '';

UPDATE teachers
SET id = COALESCE(id, uuid_generate_v4()),
    password_hash = COALESCE(NULLIF(password_hash, ''), password),
    password = COALESCE(NULLIF(password, ''), password_hash)
WHERE id IS NULL
   OR password_hash IS NULL
   OR password_hash = ''
   OR password IS NULL
   OR password = '';

UPDATE students
SET id = COALESCE(id, uuid_generate_v4()),
    password_hash = COALESCE(NULLIF(password_hash, ''), password),
    password = COALESCE(NULLIF(password, ''), password_hash)
WHERE id IS NULL
   OR password_hash IS NULL
   OR password_hash = ''
   OR password IS NULL
   OR password = '';

-- ============================================
-- INDEXES
-- ============================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_id_unique ON profiles(id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

CREATE UNIQUE INDEX IF NOT EXISTS idx_teachers_id_unique ON teachers(id);
CREATE INDEX IF NOT EXISTS idx_teachers_name ON teachers(name);
CREATE INDEX IF NOT EXISTS idx_teachers_active ON teachers(is_active);

CREATE INDEX IF NOT EXISTS idx_majors_active ON majors(is_active);

CREATE INDEX IF NOT EXISTS idx_classes_walikelas ON classes(walikelas_kode);
CREATE INDEX IF NOT EXISTS idx_classes_major ON classes(major_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_students_id_unique ON students(id);
CREATE INDEX IF NOT EXISTS idx_students_name ON students(name);
CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_last_class ON students(last_class_id);
CREATE INDEX IF NOT EXISTS idx_students_last_teacher ON students(last_teacher_kode);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status, class_id);

CREATE INDEX IF NOT EXISTS idx_portofolios_student ON portofolios(student_nis);
CREATE INDEX IF NOT EXISTS idx_portofolios_featured ON portofolios(is_featured);
CREATE INDEX IF NOT EXISTS idx_portofolios_scope ON portofolios(visibility_scope);
CREATE INDEX IF NOT EXISTS idx_portofolios_uploader_class ON portofolios(uploader_class_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_portfolio_likes_unique_actor
    ON portfolio_likes (
        portfolio_id,
        liker_role,
        COALESCE(liker_nis, ''),
        COALESCE(liker_kode, '')
    );
CREATE INDEX IF NOT EXISTS idx_portfolio_likes_portfolio ON portfolio_likes(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_likes_created_at ON portfolio_likes(created_at);
CREATE INDEX IF NOT EXISTS idx_portfolio_comments_portfolio ON portfolio_comments(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_comments_created_at ON portfolio_comments(created_at);

CREATE INDEX IF NOT EXISTS idx_files_parent ON files(parent_id);
CREATE INDEX IF NOT EXISTS idx_files_class ON files(class_id);
CREATE INDEX IF NOT EXISTS idx_files_type_name ON files(type, name);

CREATE INDEX IF NOT EXISTS idx_exams_teacher ON exams(teacher_kode);
CREATE INDEX IF NOT EXISTS idx_exams_status ON exams(status);
CREATE INDEX IF NOT EXISTS idx_exams_class ON exams(class_id);
CREATE INDEX IF NOT EXISTS idx_exams_schedule ON exams(status, start_time, end_time);

CREATE INDEX IF NOT EXISTS idx_exam_questions_exam_order ON exam_questions(exam_id, order_index);
CREATE INDEX IF NOT EXISTS idx_exam_sessions_student ON exam_sessions(student_nis);
CREATE INDEX IF NOT EXISTS idx_exam_sessions_exam ON exam_sessions(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_sessions_submitted ON exam_sessions(submitted_at);
CREATE INDEX IF NOT EXISTS idx_exam_answers_session ON exam_answers(session_id);
CREATE INDEX IF NOT EXISTS idx_exam_answers_question ON exam_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_exam_scores_student ON exam_scores(student_nis);
CREATE INDEX IF NOT EXISTS idx_exam_scores_exam ON exam_scores(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_scores_submitted ON exam_scores(submitted_at);

CREATE INDEX IF NOT EXISTS idx_assignments_teacher ON assignments(teacher_kode);
CREATE INDEX IF NOT EXISTS idx_assignments_class_status ON assignments(class_id, status);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON assignments(due_date);

CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student ON assignment_submissions(student_nis);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment ON assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_graded ON assignment_submissions(graded);

CREATE INDEX IF NOT EXISTS idx_attendance_sessions_teacher_status ON attendance_sessions(teacher_kode, status);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_class ON attendance_sessions(class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_expires ON attendance_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_attendance_records_session ON attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_student ON attendance_records(student_nis);
CREATE INDEX IF NOT EXISTS idx_attendance_records_recorded_at ON attendance_records(recorded_at);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_kode, user_role);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_kode, user_role, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- ============================================
-- FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sync_legacy_password_columns()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.password IS NOT NULL AND (NEW.password_hash IS NULL OR NEW.password_hash = '') THEN
        NEW.password_hash = NEW.password;
    ELSIF NEW.password_hash IS NOT NULL AND (NEW.password IS NULL OR NEW.password = '') THEN
        NEW.password = NEW.password_hash;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sync_notification_read_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_read = TRUE AND (OLD.is_read IS DISTINCT FROM TRUE) AND NEW.read_at IS NULL THEN
        NEW.read_at = NOW();
    ELSIF NEW.is_read = FALSE THEN
        NEW.read_at = NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sync_exam_publication_metadata()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'published' AND NEW.published_at IS NULL THEN
        NEW.published_at = NOW();
    ELSIF NEW.status = 'draft' AND (OLD.status IS DISTINCT FROM 'draft') THEN
        NEW.published_at = NULL;
    END IF;

    IF NEW.start_time IS NOT NULL AND NEW.end_time IS NOT NULL AND NEW.end_time < NEW.start_time THEN
        RAISE EXCEPTION 'end_time must be greater than or equal to start_time';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sync_exam_session_runtime_fields()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_activity_at = NOW();

    IF NEW.submitted_at IS NOT NULL THEN
        NEW.is_completed = TRUE;
        NEW.time_remaining = 0;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sync_portfolio_engagement_counts()
RETURNS TRIGGER AS $$
DECLARE
    target_portfolio_id UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        target_portfolio_id = OLD.portfolio_id;
    ELSIF TG_OP = 'UPDATE' THEN
        target_portfolio_id = COALESCE(NEW.portfolio_id, OLD.portfolio_id);
    ELSE
        target_portfolio_id = NEW.portfolio_id;
    END IF;

    UPDATE portofolios p
    SET likes = COALESCE((
            SELECT COUNT(*)
            FROM portfolio_likes l
            WHERE l.portfolio_id = target_portfolio_id
        ), 0),
        comments = COALESCE((
            SELECT COUNT(*)
            FROM portfolio_comments c
            WHERE c.portfolio_id = target_portfolio_id
        ), 0),
        updated_at = NOW()
    WHERE p.id = target_portfolio_id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_points(s_nis TEXT, amount INTEGER)
RETURNS VOID AS $$
BEGIN
    UPDATE students
    SET points = GREATEST(0, COALESCE(points, 0) + amount),
        level = FLOOR(GREATEST(0, COALESCE(points, 0) + amount) / 1000) + 1
    WHERE nis = s_nis;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION award_portfolio_points()
RETURNS TRIGGER AS $$
DECLARE
    portfolio_owner_nis TEXT;
BEGIN
    IF TG_TABLE_NAME = 'portofolios' THEN
        -- Siswa mendapat poin saat mengunggah karya.
        IF NEW.student_nis IS NOT NULL THEN
            PERFORM increment_points(NEW.student_nis, 15);
        END IF;
        RETURN NEW;
    END IF;

    IF TG_TABLE_NAME = 'portfolio_likes' THEN
        SELECT p.student_nis
        INTO portfolio_owner_nis
        FROM portofolios p
        WHERE p.id = NEW.portfolio_id;

        -- Pemberi like dari siswa mendapatkan poin (hindari self-like farming).
        IF NEW.liker_role = 'siswa'
           AND NEW.liker_nis IS NOT NULL
           AND (portfolio_owner_nis IS NULL OR NEW.liker_nis IS DISTINCT FROM portfolio_owner_nis) THEN
            PERFORM increment_points(NEW.liker_nis, 2);
        END IF;

        -- Pemilik karya mendapat poin dari like orang lain.
        IF portfolio_owner_nis IS NOT NULL
           AND (NEW.liker_role <> 'siswa' OR NEW.liker_nis IS DISTINCT FROM portfolio_owner_nis) THEN
            PERFORM increment_points(portfolio_owner_nis, 1);
        END IF;

        RETURN NEW;
    END IF;

    IF TG_TABLE_NAME = 'portfolio_comments' THEN
        SELECT p.student_nis
        INTO portfolio_owner_nis
        FROM portofolios p
        WHERE p.id = NEW.portfolio_id;

        -- Pemberi komentar dari siswa mendapatkan poin (hindari self-comment farming).
        IF NEW.commenter_role = 'siswa'
           AND NEW.commenter_nis IS NOT NULL
           AND (portfolio_owner_nis IS NULL OR NEW.commenter_nis IS DISTINCT FROM portfolio_owner_nis) THEN
            PERFORM increment_points(NEW.commenter_nis, 3);
        END IF;

        -- Pemilik karya mendapat poin dari komentar orang lain.
        IF portfolio_owner_nis IS NOT NULL
           AND (NEW.commenter_role <> 'siswa' OR NEW.commenter_nis IS DISTINCT FROM portfolio_owner_nis) THEN
            PERFORM increment_points(portfolio_owner_nis, 2);
        END IF;

        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

DROP TRIGGER IF EXISTS sync_profiles_password_columns ON profiles;
CREATE TRIGGER sync_profiles_password_columns
    BEFORE INSERT OR UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION sync_legacy_password_columns();

DROP TRIGGER IF EXISTS sync_teachers_password_columns ON teachers;
CREATE TRIGGER sync_teachers_password_columns
    BEFORE INSERT OR UPDATE ON teachers
    FOR EACH ROW
    EXECUTE FUNCTION sync_legacy_password_columns();

DROP TRIGGER IF EXISTS sync_students_password_columns ON students;
CREATE TRIGGER sync_students_password_columns
    BEFORE INSERT OR UPDATE ON students
    FOR EACH ROW
    EXECUTE FUNCTION sync_legacy_password_columns();

DROP TRIGGER IF EXISTS sync_notifications_read_timestamp ON notifications;
CREATE TRIGGER sync_notifications_read_timestamp
    BEFORE INSERT OR UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION sync_notification_read_timestamp();

DROP TRIGGER IF EXISTS sync_exams_publication_metadata ON exams;
CREATE TRIGGER sync_exams_publication_metadata
    BEFORE INSERT OR UPDATE ON exams
    FOR EACH ROW
    EXECUTE FUNCTION sync_exam_publication_metadata();

DROP TRIGGER IF EXISTS sync_exam_sessions_runtime_fields ON exam_sessions;
CREATE TRIGGER sync_exam_sessions_runtime_fields
    BEFORE INSERT OR UPDATE ON exam_sessions
    FOR EACH ROW
    EXECUTE FUNCTION sync_exam_session_runtime_fields();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_teachers_updated_at ON teachers;
CREATE TRIGGER update_teachers_updated_at BEFORE UPDATE ON teachers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_majors_updated_at ON majors;
CREATE TRIGGER update_majors_updated_at BEFORE UPDATE ON majors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_classes_updated_at ON classes;
CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON classes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_students_updated_at ON students;
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_portofolios_updated_at ON portofolios;
CREATE TRIGGER update_portofolios_updated_at BEFORE UPDATE ON portofolios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS sync_portfolio_likes_count ON portfolio_likes;
CREATE TRIGGER sync_portfolio_likes_count
    AFTER INSERT OR UPDATE OR DELETE ON portfolio_likes
    FOR EACH ROW
    EXECUTE FUNCTION sync_portfolio_engagement_counts();

DROP TRIGGER IF EXISTS sync_portfolio_comments_count ON portfolio_comments;
CREATE TRIGGER sync_portfolio_comments_count
    AFTER INSERT OR UPDATE OR DELETE ON portfolio_comments
    FOR EACH ROW
    EXECUTE FUNCTION sync_portfolio_engagement_counts();

DROP TRIGGER IF EXISTS award_points_on_portfolio_upload ON portofolios;
CREATE TRIGGER award_points_on_portfolio_upload
    AFTER INSERT ON portofolios
    FOR EACH ROW
    EXECUTE FUNCTION award_portfolio_points();

DROP TRIGGER IF EXISTS award_points_on_portfolio_like ON portfolio_likes;
CREATE TRIGGER award_points_on_portfolio_like
    AFTER INSERT ON portfolio_likes
    FOR EACH ROW
    EXECUTE FUNCTION award_portfolio_points();

DROP TRIGGER IF EXISTS award_points_on_portfolio_comment ON portfolio_comments;
CREATE TRIGGER award_points_on_portfolio_comment
    AFTER INSERT ON portfolio_comments
    FOR EACH ROW
    EXECUTE FUNCTION award_portfolio_points();

DROP TRIGGER IF EXISTS update_files_updated_at ON files;
CREATE TRIGGER update_files_updated_at BEFORE UPDATE ON files FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_exams_updated_at ON exams;
CREATE TRIGGER update_exams_updated_at BEFORE UPDATE ON exams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_exam_questions_updated_at ON exam_questions;
CREATE TRIGGER update_exam_questions_updated_at BEFORE UPDATE ON exam_questions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_exam_sessions_updated_at ON exam_sessions;
CREATE TRIGGER update_exam_sessions_updated_at BEFORE UPDATE ON exam_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_exam_answers_updated_at ON exam_answers;
CREATE TRIGGER update_exam_answers_updated_at BEFORE UPDATE ON exam_answers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_exam_scores_updated_at ON exam_scores;
CREATE TRIGGER update_exam_scores_updated_at BEFORE UPDATE ON exam_scores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_assignments_updated_at ON assignments;
CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_assignment_submissions_updated_at ON assignment_submissions;
CREATE TRIGGER update_assignment_submissions_updated_at BEFORE UPDATE ON assignment_submissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_attendance_sessions_updated_at ON attendance_sessions;
CREATE TRIGGER update_attendance_sessions_updated_at BEFORE UPDATE ON attendance_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_attendance_records_updated_at ON attendance_records;
CREATE TRIGGER update_attendance_records_updated_at BEFORE UPDATE ON attendance_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_announcements_updated_at ON announcements;
CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON announcements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ACCESS CONTROL
-- ============================================

ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE teachers DISABLE ROW LEVEL SECURITY;
ALTER TABLE majors DISABLE ROW LEVEL SECURITY;
ALTER TABLE classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE school_stats DISABLE ROW LEVEL SECURITY;
ALTER TABLE portofolios DISABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_likes DISABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE files DISABLE ROW LEVEL SECURITY;
ALTER TABLE exams DISABLE ROW LEVEL SECURITY;
ALTER TABLE exam_questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE exam_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE exam_answers DISABLE ROW LEVEL SECURITY;
ALTER TABLE exam_scores DISABLE ROW LEVEL SECURITY;
ALTER TABLE assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_submissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE announcements DISABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- ============================================
-- STORAGE BUCKETS & POLICIES
-- ============================================

INSERT INTO storage.buckets (id, name, public)
VALUES
    ('avatars', 'avatars', true),
    ('files', 'files', true),
    ('tugas', 'tugas', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
CREATE POLICY "avatars_public_read" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_auth_insert" ON storage.objects;
CREATE POLICY "avatars_auth_insert" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_owner_update" ON storage.objects;
CREATE POLICY "avatars_owner_update" ON storage.objects
    FOR UPDATE USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_owner_delete" ON storage.objects;
CREATE POLICY "avatars_owner_delete" ON storage.objects
    FOR DELETE USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "files_public_read" ON storage.objects;
CREATE POLICY "files_public_read" ON storage.objects
    FOR SELECT USING (bucket_id = 'files');

DROP POLICY IF EXISTS "files_auth_insert" ON storage.objects;
CREATE POLICY "files_auth_insert" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'files');

DROP POLICY IF EXISTS "files_owner_update" ON storage.objects;
CREATE POLICY "files_owner_update" ON storage.objects
    FOR UPDATE USING (bucket_id = 'files');

DROP POLICY IF EXISTS "files_owner_delete" ON storage.objects;
CREATE POLICY "files_owner_delete" ON storage.objects
    FOR DELETE USING (bucket_id = 'files');

DROP POLICY IF EXISTS "tugas_public_read" ON storage.objects;
CREATE POLICY "tugas_public_read" ON storage.objects
    FOR SELECT USING (bucket_id = 'tugas');

DROP POLICY IF EXISTS "tugas_auth_insert" ON storage.objects;
CREATE POLICY "tugas_auth_insert" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'tugas');

DROP POLICY IF EXISTS "tugas_owner_update" ON storage.objects;
CREATE POLICY "tugas_owner_update" ON storage.objects
    FOR UPDATE USING (bucket_id = 'tugas');

DROP POLICY IF EXISTS "tugas_owner_delete" ON storage.objects;
CREATE POLICY "tugas_owner_delete" ON storage.objects
    FOR DELETE USING (bucket_id = 'tugas');

-- ============================================
-- SAMPLE DATA
-- ============================================

INSERT INTO classes (name) VALUES
    ('X TP 1'), ('X TP 2'),
    ('X TAB 1'), ('X TAB 2'),
    ('X BC 1'), ('X BC 2'),
    ('X TKR 1'), ('X TKR 2'), ('X TKR 3'),
    ('X TSM 1'), ('X TSM 2'), ('X TSM 3'),
    ('X TJKT 1'), ('X TJKT 2'), ('X TJKT 3'),
    ('XI TP 1'), ('XI TP 2'),
    ('XI TAB 1'), ('XI TAB 2'),
    ('XI BC 1'), ('XI BC 2'),
    ('XI TKR 1'), ('XI TKR 2'), ('XI TKR 3'),
    ('XI TSM 1'), ('XI TSM 2'), ('XI TSM 3'),
    ('XI TJKT 1'), ('XI TJKT 2'), ('XI TJKT 3')
ON CONFLICT (name) DO NOTHING;

INSERT INTO profiles (username, role, name, password, password_hash, created_at, updated_at)
VALUES ('admin', 'admin', 'Administrator', 'admin123', 'admin123', NOW(), NOW())
ON CONFLICT (username) DO NOTHING;

INSERT INTO school_stats (key, value) VALUES
    ('students', 1606),
    ('guru', 70),
    ('karyawan', 27),
    ('jurusan', 7)
ON CONFLICT (key) DO NOTHING;

INSERT INTO majors (name, description, icon, skills, is_active) VALUES
    ('Broadcasting', 'Penyiaran dan Perfilman Digital dengan teknologi multimedia terkini', 'MonitorPlay', ARRAY['Video Editing', 'Audio Production', 'Live Streaming'], true),
    ('Teknik Alat Berat', 'Pemeliharaan dan perbaikan alat berat untuk industri konstruksi', 'Tractor', ARRAY['Heavy Equipment', 'Hydraulic System', 'Engine Repair'], true),
    ('Teknik Sepeda Motor', 'Perawatan dan perbaikan sepeda motor dengan teknologi terbaru', 'Car', ARRAY['Engine Service', 'Electric System', 'Body Repair'], true),
    ('Teknik Kendaraan Ringan', 'Otomotif mobil dengan fokus teknologi ramah lingkungan', 'Car', ARRAY['Auto Mechanic', 'Diagnostic', 'AC System'], true),
    ('Teknik Komputer & Jaringan', 'Networking, sistem komputer, dan administrasi server', 'Network', ARRAY['Networking', 'Server Admin', 'Cyber Security'], true),
    ('Teknik Pemesinan', 'Manufaktur dan produksi dengan mesin CNC modern', 'Cpu', ARRAY['CNC Programming', 'CAD/CAM', 'Quality Control'], true),
    ('Ototronik', 'Teknologi elektronik dan sistem otomatis untuk kendaraan', 'Cpu', ARRAY['Electronics', 'Programming', 'ECU Diagnostics'], true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- REALTIME
-- ============================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'students'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE students;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'exam_scores'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE exam_scores;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'assignment_submissions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE assignment_submissions;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'attendance_records'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE attendance_records;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'attendance_sessions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE attendance_sessions;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'assignments'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE assignments;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'exams'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE exams;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'activity_logs'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE activity_logs;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'announcements'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE announcements;
    END IF;
END
$$;

ALTER TABLE notifications REPLICA IDENTITY FULL;
ALTER TABLE attendance_records REPLICA IDENTITY FULL;
ALTER TABLE attendance_sessions REPLICA IDENTITY FULL;
ALTER TABLE students REPLICA IDENTITY FULL;
ALTER TABLE announcements REPLICA IDENTITY FULL;


-- ============================================
-- FROM: 002_portfolio_public_slug.sql
-- ============================================

ALTER TABLE portofolios
ADD COLUMN IF NOT EXISTS public_slug TEXT;

WITH html_candidates AS (
    SELECT
        id,
        COALESCE(
            NULLIF(
                TRIM(BOTH '_' FROM REGEXP_REPLACE(LOWER(COALESCE(uploader_name, student_nis, 'siswa_html')), '[^a-z0-9]+', '_', 'g')),
                ''
            ),
            'siswa_html'
        ) AS base_slug,
        ROW_NUMBER() OVER (
            PARTITION BY COALESCE(
                NULLIF(
                    TRIM(BOTH '_' FROM REGEXP_REPLACE(LOWER(COALESCE(uploader_name, student_nis, 'siswa_html')), '[^a-z0-9]+', '_', 'g')),
                    ''
                ),
                'siswa_html'
            )
            ORDER BY created_at, id
        ) AS slug_order
    FROM portofolios
    WHERE public_slug IS NULL
      AND (image_url ILIKE '%.html%' OR image_url ILIKE '%.htm%')
),
resolved_slugs AS (
    SELECT
        id,
        CASE
            WHEN slug_order = 1 THEN base_slug
            ELSE base_slug || '_' || slug_order
        END AS public_slug
    FROM html_candidates
)
UPDATE portofolios AS target
SET public_slug = resolved_slugs.public_slug
FROM resolved_slugs
WHERE target.id = resolved_slugs.id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_portofolios_public_slug
    ON portofolios(public_slug)
    WHERE public_slug IS NOT NULL;


-- ============================================
-- FROM: 003_announcements.sql
-- ============================================

CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author_kode TEXT,
    author_role TEXT CHECK (author_role IN ('admin', 'guru')),
    author_name TEXT,
    target_roles TEXT[] DEFAULT ARRAY['siswa']::TEXT[],
    target_classes TEXT[] DEFAULT ARRAY[]::TEXT[],
    is_pinned BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE announcements ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS author_kode TEXT;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS author_role TEXT;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS author_name TEXT;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS target_roles TEXT[] DEFAULT ARRAY['siswa']::TEXT[];
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS target_classes TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

DROP TRIGGER IF EXISTS update_announcements_updated_at ON announcements;
CREATE TRIGGER update_announcements_updated_at
    BEFORE UPDATE ON announcements
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- ============================================
-- FROM: 004_notification_announcement_type.sql
-- ============================================

ALTER TABLE notifications
DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications
ADD CONSTRAINT notifications_type_check
CHECK (type IN ('attendance', 'exam', 'file', 'assignment', 'system', 'profile', 'login', 'announcement'));



-- ============================================
-- FROM: 005_ai_chat_persistence.sql
-- ============================================

CREATE TABLE IF NOT EXISTS ai_chat_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'ai')),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster retrieval per user
CREATE INDEX IF NOT EXISTS idx_ai_chat_history_user_id ON ai_chat_history(user_id);

-- Disable RLS for simplicity as requested
ALTER TABLE ai_chat_history DISABLE ROW LEVEL SECURITY;


-- ============================================
-- FROM: 006_class_promotion.sql
-- Kenaikan Kelas & Arsip Kelulusan
-- ============================================

-- Track each batch promotion event
CREATE TABLE IF NOT EXISTS class_promotions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academic_year TEXT NOT NULL,            -- e.g. '2025/2026'
    promoted_by TEXT NOT NULL,              -- admin username
    promoted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_promoted INTEGER DEFAULT 0,       -- kelas 10→11, 11→12
    total_graduated INTEGER DEFAULT 0,      -- kelas 12→lulus
    total_failed INTEGER DEFAULT 0,         -- siswa yang tidak naik
    notes TEXT,
    metadata JSONB,                         -- detailed log per class
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Archive table for graduated students (kelas 12 → lulus)
CREATE TABLE IF NOT EXISTS graduated_students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_nis TEXT NOT NULL,
    student_name TEXT NOT NULL,
    last_class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
    last_class_name TEXT,
    academic_year TEXT NOT NULL,             -- tahun kelulusan
    graduation_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    promotion_id UUID REFERENCES class_promotions(id) ON DELETE SET NULL,
    points INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add graduation tracking columns to students
ALTER TABLE students ADD COLUMN IF NOT EXISTS graduated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS graduation_year TEXT;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_class_promotions_year ON class_promotions(academic_year);
CREATE INDEX IF NOT EXISTS idx_class_promotions_date ON class_promotions(promoted_at);
CREATE INDEX IF NOT EXISTS idx_graduated_students_nis ON graduated_students(student_nis);
CREATE INDEX IF NOT EXISTS idx_graduated_students_year ON graduated_students(academic_year);
CREATE INDEX IF NOT EXISTS idx_graduated_students_class ON graduated_students(last_class_id);
CREATE INDEX IF NOT EXISTS idx_graduated_students_promotion ON graduated_students(promotion_id);

-- RLS
ALTER TABLE class_promotions DISABLE ROW LEVEL SECURITY;
ALTER TABLE graduated_students DISABLE ROW LEVEL SECURITY;

-- Auto-update trigger
DROP TRIGGER IF EXISTS update_class_promotions_created_at ON class_promotions;

-- Update attendance_records status constraint to include new statuses
ALTER TABLE attendance_records DROP CONSTRAINT IF EXISTS attendance_records_status_check;
ALTER TABLE attendance_records ADD CONSTRAINT attendance_records_status_check
    CHECK (status IN ('present', 'late', 'absent', 'izin', 'sakit', 'alpha'));

-- ============================================================
-- LIBRARY MANAGEMENT SYSTEM
-- Complete PostgreSQL Script
-- Version: 1.0.0
-- ============================================================
-- HOW TO RUN:
--   psql -U postgres -d library_db -f complete_postgresql_script.sql
-- OR paste into Supabase / Neon SQL Editor and execute.
-- ============================================================

-- ============================================================
-- SECTION 1: SETUP
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables (clean slate — safe for dev/staging)
DROP TABLE IF EXISTS fines            CASCADE;
DROP TABLE IF EXISTS borrow_records   CASCADE;
DROP TABLE IF EXISTS books            CASCADE;
DROP TABLE IF EXISTS categories       CASCADE;
DROP TABLE IF EXISTS users            CASCADE;

-- Drop existing function and triggers (recreated below)
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;


-- ============================================================
-- SECTION 2: TABLE — categories
-- ============================================================

CREATE TABLE categories (
    id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  categories             IS 'Book categories / genres';
COMMENT ON COLUMN categories.id          IS 'Primary key (UUID)';
COMMENT ON COLUMN categories.name        IS 'Unique category name';
COMMENT ON COLUMN categories.description IS 'Optional description of the category';


-- ============================================================
-- SECTION 3: TABLE — users
-- ============================================================

CREATE TABLE users (
    id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(150) NOT NULL,
    email       VARCHAR(255) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,
    role        VARCHAR(20)  NOT NULL DEFAULT 'student'
                    CHECK (role IN ('admin', 'librarian', 'student')),
    student_id  VARCHAR(50)  UNIQUE,
    phone       VARCHAR(20),
    address     TEXT,
    avatar_url  TEXT,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  users            IS 'System users: admins, librarians, and students';
COMMENT ON COLUMN users.role       IS 'admin | librarian | student';
COMMENT ON COLUMN users.student_id IS 'Optional student registration number (unique)';
COMMENT ON COLUMN users.is_active  IS 'Soft disable without deleting the account';


-- ============================================================
-- SECTION 4: TABLE — books
-- ============================================================

CREATE TABLE books (
    id                UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    title             VARCHAR(255) NOT NULL,
    author            VARCHAR(255) NOT NULL,
    isbn              VARCHAR(20)  UNIQUE,
    category_id       UUID         REFERENCES categories(id) ON DELETE SET NULL,
    description       TEXT,
    publisher         VARCHAR(150),
    publication_year  INTEGER      CHECK (publication_year BETWEEN 1 AND 9999),
    total_copies      INTEGER      NOT NULL DEFAULT 1 CHECK (total_copies     >= 0),
    available_copies  INTEGER      NOT NULL DEFAULT 1 CHECK (available_copies >= 0),
    cover_image_url   TEXT,
    location          VARCHAR(100),
    language          VARCHAR(50)  NOT NULL DEFAULT 'English',
    pages             INTEGER      CHECK (pages > 0),
    is_active         BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    -- available copies can never exceed total copies
    CONSTRAINT chk_available_lte_total
        CHECK (available_copies <= total_copies)
);

COMMENT ON TABLE  books                  IS 'Library book catalogue';
COMMENT ON COLUMN books.isbn             IS 'International Standard Book Number (unique)';
COMMENT ON COLUMN books.total_copies     IS 'Total physical copies owned by the library';
COMMENT ON COLUMN books.available_copies IS 'Copies currently on the shelf (not borrowed)';
COMMENT ON COLUMN books.is_active        IS 'Soft-delete flag';


-- ============================================================
-- SECTION 5: TABLE — borrow_records
-- ============================================================

CREATE TABLE borrow_records (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID        NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
    book_id     UUID        NOT NULL REFERENCES books(id)  ON DELETE CASCADE,
    issued_by   UUID                 REFERENCES users(id)  ON DELETE SET NULL,
    borrowed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    due_date    TIMESTAMPTZ NOT NULL,
    returned_at TIMESTAMPTZ,
    status      VARCHAR(20) NOT NULL DEFAULT 'borrowed'
                    CHECK (status IN ('borrowed', 'returned', 'overdue')),
    notes       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- returned_at must be after borrowed_at when set
    CONSTRAINT chk_returned_after_borrowed
        CHECK (returned_at IS NULL OR returned_at >= borrowed_at),

    -- due_date must be after borrowed_at
    CONSTRAINT chk_due_after_borrowed
        CHECK (due_date > borrowed_at)
);

COMMENT ON TABLE  borrow_records             IS 'Records of every book borrowing transaction';
COMMENT ON COLUMN borrow_records.issued_by   IS 'Librarian / admin who processed the borrow';
COMMENT ON COLUMN borrow_records.status      IS 'borrowed | returned | overdue';
COMMENT ON COLUMN borrow_records.due_date    IS 'Date the book must be returned by';
COMMENT ON COLUMN borrow_records.returned_at IS 'Actual return timestamp (NULL if still out)';


-- ============================================================
-- SECTION 6: TABLE — fines
-- ============================================================

CREATE TABLE fines (
    id               UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
    borrow_record_id UUID           NOT NULL REFERENCES borrow_records(id) ON DELETE CASCADE,
    user_id          UUID           NOT NULL REFERENCES users(id)          ON DELETE CASCADE,
    amount           NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (amount       >= 0),
    days_overdue     INTEGER        NOT NULL DEFAULT 0    CHECK (days_overdue >= 0),
    is_paid          BOOLEAN        NOT NULL DEFAULT FALSE,
    paid_at          TIMESTAMPTZ,
    created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

    -- paid_at must be set when is_paid = TRUE
    CONSTRAINT chk_paid_at_when_paid
        CHECK (is_paid = FALSE OR paid_at IS NOT NULL)
);

COMMENT ON TABLE  fines                  IS 'Overdue fines linked to borrow records';
COMMENT ON COLUMN fines.amount           IS 'Total fine amount in currency units';
COMMENT ON COLUMN fines.days_overdue     IS 'Number of days past the due date';
COMMENT ON COLUMN fines.is_paid          IS 'Whether the fine has been settled';


-- ============================================================
-- SECTION 7: INDEXES
-- ============================================================

-- users
CREATE INDEX idx_users_email      ON users(email);
CREATE INDEX idx_users_role       ON users(role);
CREATE INDEX idx_users_student_id ON users(student_id) WHERE student_id IS NOT NULL;
CREATE INDEX idx_users_is_active  ON users(is_active);

-- books
CREATE INDEX idx_books_category_id ON books(category_id);
CREATE INDEX idx_books_isbn        ON books(isbn)       WHERE isbn IS NOT NULL;
CREATE INDEX idx_books_is_active   ON books(is_active);
CREATE INDEX idx_books_available   ON books(available_copies) WHERE is_active = TRUE;

-- Full-text search on title + author
CREATE INDEX idx_books_fts ON books
    USING gin(to_tsvector('english', title || ' ' || author));

-- borrow_records
CREATE INDEX idx_borrow_user_id   ON borrow_records(user_id);
CREATE INDEX idx_borrow_book_id   ON borrow_records(book_id);
CREATE INDEX idx_borrow_status    ON borrow_records(status);
CREATE INDEX idx_borrow_due_date  ON borrow_records(due_date);
CREATE INDEX idx_borrow_issued_by ON borrow_records(issued_by) WHERE issued_by IS NOT NULL;

-- fines
CREATE INDEX idx_fines_user_id          ON fines(user_id);
CREATE INDEX idx_fines_borrow_record_id ON fines(borrow_record_id);
CREATE INDEX idx_fines_is_paid          ON fines(is_paid);


-- ============================================================
-- SECTION 8: AUTO-UPDATE updated_at TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_books_updated_at
    BEFORE UPDATE ON books
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_borrow_records_updated_at
    BEFORE UPDATE ON borrow_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_fines_updated_at
    BEFORE UPDATE ON fines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- SECTION 9: USEFUL VIEWS
-- ============================================================

-- View: books with category name and availability status
CREATE OR REPLACE VIEW v_books AS
SELECT
    b.id,
    b.title,
    b.author,
    b.isbn,
    b.description,
    b.publisher,
    b.publication_year,
    b.total_copies,
    b.available_copies,
    b.cover_image_url,
    b.location,
    b.language,
    b.pages,
    b.is_active,
    b.created_at,
    c.id   AS category_id,
    c.name AS category_name,
    CASE
        WHEN b.available_copies > 0 THEN 'available'
        ELSE 'unavailable'
    END AS availability_status
FROM books b
LEFT JOIN categories c ON c.id = b.category_id
WHERE b.is_active = TRUE;

-- View: borrow records with user and book details
CREATE OR REPLACE VIEW v_borrow_records AS
SELECT
    br.id,
    br.status,
    br.borrowed_at,
    br.due_date,
    br.returned_at,
    br.notes,
    br.created_at,
    -- user info
    u.id         AS user_id,
    u.name       AS user_name,
    u.email      AS user_email,
    u.student_id AS user_student_id,
    u.phone      AS user_phone,
    -- book info
    bk.id        AS book_id,
    bk.title     AS book_title,
    bk.author    AS book_author,
    bk.isbn      AS book_isbn,
    -- issued by
    ib.name      AS issued_by_name,
    -- overdue calculation
    CASE
        WHEN br.status != 'returned' AND br.due_date < NOW()
        THEN EXTRACT(DAY FROM NOW() - br.due_date)::INTEGER
        ELSE 0
    END AS days_overdue
FROM borrow_records br
JOIN  users u  ON u.id  = br.user_id
JOIN  books bk ON bk.id = br.book_id
LEFT JOIN users ib ON ib.id = br.issued_by;

-- View: unpaid fines with user and book details
CREATE OR REPLACE VIEW v_unpaid_fines AS
SELECT
    f.id,
    f.amount,
    f.days_overdue,
    f.created_at,
    u.id         AS user_id,
    u.name       AS user_name,
    u.email      AS user_email,
    u.student_id,
    bk.title     AS book_title,
    br.due_date,
    br.returned_at
FROM fines f
JOIN borrow_records br ON br.id = f.borrow_record_id
JOIN users          u  ON u.id  = f.user_id
JOIN books          bk ON bk.id = br.book_id
WHERE f.is_paid = FALSE;


-- ============================================================
-- SECTION 10: SEED DATA — categories
-- ============================================================

INSERT INTO categories (id, name, description) VALUES
    ('11111111-0001-0001-0001-000000000001', 'Fiction',
        'Novels, short stories, and other fictional works'),
    ('11111111-0001-0001-0001-000000000002', 'Non-Fiction',
        'Biographies, history, science, and factual works'),
    ('11111111-0001-0001-0001-000000000003', 'Science & Technology',
        'Computer science, engineering, and technology books'),
    ('11111111-0001-0001-0001-000000000004', 'Mathematics',
        'Algebra, calculus, statistics, and mathematics'),
    ('11111111-0001-0001-0001-000000000005', 'History',
        'World history, ancient civilizations, and historical events'),
    ('11111111-0001-0001-0001-000000000006', 'Philosophy',
        'Ethics, logic, metaphysics, and philosophical works'),
    ('11111111-0001-0001-0001-000000000007', 'Business',
        'Management, economics, entrepreneurship, and finance'),
    ('11111111-0001-0001-0001-000000000008', 'Self-Help',
        'Personal development, motivation, and productivity'),
    ('11111111-0001-0001-0001-000000000009', 'Science Fiction',
        'Futuristic and speculative fiction'),
    ('11111111-0001-0001-0001-000000000010', 'Biography',
        'Life stories of notable individuals')
ON CONFLICT (name) DO NOTHING;


-- ============================================================
-- SECTION 11: SEED DATA — users
-- ============================================================
-- Passwords are bcrypt-hashed (cost 12).
--   admin@library.com     → Admin@123
--   librarian@library.com → Librarian@123
--   student@library.com   → Student@123
--   alice@library.com     → Student@123
--   bob@library.com       → Student@123
-- ============================================================

INSERT INTO users (id, name, email, password, role, student_id, phone, is_active) VALUES
    (
        '22222222-0002-0002-0002-000000000001',
        'System Administrator',
        'admin@library.com',
        '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK8i',
        'admin',
        NULL,
        '+1-555-0100',
        TRUE
    ),
    (
        '22222222-0002-0002-0002-000000000002',
        'Jane Librarian',
        'librarian@library.com',
        '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
        'librarian',
        NULL,
        '+1-555-0101',
        TRUE
    ),
    (
        '22222222-0002-0002-0002-000000000003',
        'John Student',
        'student@library.com',
        '$2a$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
        'student',
        'STU-2024-001',
        '+1-555-0102',
        TRUE
    ),
    (
        '22222222-0002-0002-0002-000000000004',
        'Alice Johnson',
        'alice@library.com',
        '$2a$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
        'student',
        'STU-2024-002',
        '+1-555-0103',
        TRUE
    ),
    (
        '22222222-0002-0002-0002-000000000005',
        'Bob Smith',
        'bob@library.com',
        '$2a$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
        'student',
        'STU-2024-003',
        '+1-555-0104',
        TRUE
    ),
    (
        '22222222-0002-0002-0002-000000000006',
        'Carol White',
        'carol@library.com',
        '$2a$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
        'student',
        'STU-2024-004',
        '+1-555-0105',
        TRUE
    ),
    (
        '22222222-0002-0002-0002-000000000007',
        'David Brown',
        'david@library.com',
        '$2a$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
        'student',
        'STU-2024-005',
        '+1-555-0106',
        TRUE
    )
ON CONFLICT (email) DO NOTHING;


-- ============================================================
-- SECTION 12: SEED DATA — books
-- ============================================================

INSERT INTO books
    (id, title, author, isbn, category_id, description,
     publisher, publication_year, total_copies, available_copies, language, pages)
VALUES
    -- Science & Technology
    ('33333333-0003-0003-0003-000000000001',
     'Clean Code',
     'Robert C. Martin',
     '978-0132350884',
     '11111111-0001-0001-0001-000000000003',
     'A handbook of agile software craftsmanship. Teaches how to write readable, maintainable code.',
     'Prentice Hall', 2008, 5, 5, 'English', 431),

    ('33333333-0003-0003-0003-000000000002',
     'The Pragmatic Programmer',
     'David Thomas, Andrew Hunt',
     '978-0135957059',
     '11111111-0001-0001-0001-000000000003',
     'Your journey to mastery — practical advice for software developers.',
     'Addison-Wesley', 2019, 4, 4, 'English', 352),

    ('33333333-0003-0003-0003-000000000003',
     'Design Patterns',
     'Erich Gamma, Richard Helm, Ralph Johnson, John Vlissides',
     '978-0201633610',
     '11111111-0001-0001-0001-000000000003',
     'Elements of reusable object-oriented software — the classic Gang of Four book.',
     'Addison-Wesley', 1994, 3, 3, 'English', 395),

    ('33333333-0003-0003-0003-000000000004',
     'JavaScript: The Good Parts',
     'Douglas Crockford',
     '978-0596517748',
     '11111111-0001-0001-0001-000000000003',
     'Unearthing the excellence in JavaScript.',
     'O''Reilly Media', 2008, 5, 5, 'English', 172),

    ('33333333-0003-0003-0003-000000000005',
     'You Don''t Know JS',
     'Kyle Simpson',
     '978-1491924464',
     '11111111-0001-0001-0001-000000000003',
     'Deep dive into the JavaScript language mechanics.',
     'O''Reilly Media', 2015, 4, 4, 'English', 278),

    -- Mathematics
    ('33333333-0003-0003-0003-000000000006',
     'Introduction to Algorithms',
     'Thomas H. Cormen, Charles E. Leiserson',
     '978-0262033848',
     '11111111-0001-0001-0001-000000000004',
     'Comprehensive introduction to algorithms — the definitive textbook.',
     'MIT Press', 2009, 6, 6, 'English', 1292),

    ('33333333-0003-0003-0003-000000000007',
     'Calculus: Early Transcendentals',
     'James Stewart',
     '978-1285741550',
     '11111111-0001-0001-0001-000000000004',
     'The most widely used calculus textbook in the world.',
     'Cengage Learning', 2015, 4, 4, 'English', 1368),

    -- Fiction
    ('33333333-0003-0003-0003-000000000008',
     'To Kill a Mockingbird',
     'Harper Lee',
     '978-0061935466',
     '11111111-0001-0001-0001-000000000001',
     'A classic of modern American literature exploring racial injustice.',
     'Harper Perennial', 1960, 4, 4, 'English', 336),

    ('33333333-0003-0003-0003-000000000009',
     '1984',
     'George Orwell',
     '978-0451524935',
     '11111111-0001-0001-0001-000000000001',
     'A dystopian social science fiction novel and cautionary tale.',
     'Signet Classic', 1949, 5, 5, 'English', 328),

    ('33333333-0003-0003-0003-000000000010',
     'The Great Gatsby',
     'F. Scott Fitzgerald',
     '978-0743273565',
     '11111111-0001-0001-0001-000000000001',
     'A story of the fabulously wealthy Jay Gatsby and his love for Daisy.',
     'Scribner', 1925, 5, 5, 'English', 180),

    -- History
    ('33333333-0003-0003-0003-000000000011',
     'Sapiens: A Brief History of Humankind',
     'Yuval Noah Harari',
     '978-0062316097',
     '11111111-0001-0001-0001-000000000005',
     'A sweeping narrative of human history from the Stone Age to the present.',
     'Harper', 2015, 4, 4, 'English', 443),

    ('33333333-0003-0003-0003-000000000012',
     'Guns, Germs, and Steel',
     'Jared Diamond',
     '978-0393317558',
     '11111111-0001-0001-0001-000000000005',
     'Why some civilizations came to dominate others.',
     'W. W. Norton', 1997, 3, 3, 'English', 480),

    -- Non-Fiction
    ('33333333-0003-0003-0003-000000000013',
     'Thinking, Fast and Slow',
     'Daniel Kahneman',
     '978-0374533557',
     '11111111-0001-0001-0001-000000000002',
     'Explores the two systems that drive the way we think.',
     'Farrar, Straus and Giroux', 2011, 3, 3, 'English', 499),

    -- Self-Help
    ('33333333-0003-0003-0003-000000000014',
     'Atomic Habits',
     'James Clear',
     '978-0735211292',
     '11111111-0001-0001-0001-000000000008',
     'An easy and proven way to build good habits and break bad ones.',
     'Avery', 2018, 6, 6, 'English', 320),

    ('33333333-0003-0003-0003-000000000015',
     'Deep Work',
     'Cal Newport',
     '978-1455586691',
     '11111111-0001-0001-0001-000000000008',
     'Rules for focused success in a distracted world.',
     'Grand Central Publishing', 2016, 4, 4, 'English', 296),

    -- Business
    ('33333333-0003-0003-0003-000000000016',
     'The Lean Startup',
     'Eric Ries',
     '978-0307887894',
     '11111111-0001-0001-0001-000000000007',
     'How constant innovation creates radically successful businesses.',
     'Crown Business', 2011, 3, 3, 'English', 336),

    ('33333333-0003-0003-0003-000000000017',
     'Zero to One',
     'Peter Thiel',
     '978-0804139021',
     '11111111-0001-0001-0001-000000000007',
     'Notes on startups, or how to build the future.',
     'Crown Business', 2014, 4, 4, 'English', 224),

    -- Science Fiction
    ('33333333-0003-0003-0003-000000000018',
     'Dune',
     'Frank Herbert',
     '978-0441013593',
     '11111111-0001-0001-0001-000000000009',
     'Epic science fiction novel set in the distant future on the desert planet Arrakis.',
     'Ace', 1965, 4, 4, 'English', 896),

    ('33333333-0003-0003-0003-000000000019',
     'The Hitchhiker''s Guide to the Galaxy',
     'Douglas Adams',
     '978-0345391803',
     '11111111-0001-0001-0001-000000000009',
     'A comedic science fiction series following Arthur Dent.',
     'Del Rey', 1979, 5, 5, 'English', 224),

    -- Biography
    ('33333333-0003-0003-0003-000000000020',
     'Steve Jobs',
     'Walter Isaacson',
     '978-1451648539',
     '11111111-0001-0001-0001-000000000010',
     'The exclusive biography of Apple co-founder Steve Jobs.',
     'Simon & Schuster', 2011, 3, 3, 'English', 656),

    -- Philosophy
    ('33333333-0003-0003-0003-000000000021',
     'The Republic',
     'Plato',
     '978-0872201361',
     '11111111-0001-0001-0001-000000000006',
     'Plato''s masterwork on justice, the ideal state, and the philosopher-king.',
     'Hackett Publishing', NULL, 4, 4, 'English', 368),

    ('33333333-0003-0003-0003-000000000022',
     'Meditations',
     'Marcus Aurelius',
     '978-0140449334',
     '11111111-0001-0001-0001-000000000006',
     'Personal writings of the Roman Emperor — a Stoic classic.',
     'Penguin Classics', NULL, 5, 5, 'English', 256)

ON CONFLICT (isbn) DO NOTHING;


-- ============================================================
-- SECTION 13: SEED DATA — borrow_records (sample history)
-- ============================================================

INSERT INTO borrow_records
    (id, user_id, book_id, issued_by, borrowed_at, due_date, returned_at, status, notes)
VALUES
    -- John Student: currently borrowing Clean Code (active)
    (
        '44444444-0004-0004-0004-000000000001',
        '22222222-0002-0002-0002-000000000003',
        '33333333-0003-0003-0003-000000000001',
        '22222222-0002-0002-0002-000000000002',
        NOW() - INTERVAL '5 days',
        NOW() + INTERVAL '9 days',
        NULL,
        'borrowed',
        'Issued at front desk'
    ),
    -- John Student: returned Atomic Habits
    (
        '44444444-0004-0004-0004-000000000002',
        '22222222-0002-0002-0002-000000000003',
        '33333333-0003-0003-0003-000000000014',
        '22222222-0002-0002-0002-000000000002',
        NOW() - INTERVAL '30 days',
        NOW() - INTERVAL '16 days',
        NOW() - INTERVAL '17 days',
        'returned',
        NULL
    ),
    -- Alice: currently borrowing 1984 (active)
    (
        '44444444-0004-0004-0004-000000000003',
        '22222222-0002-0002-0002-000000000004',
        '33333333-0003-0003-0003-000000000009',
        '22222222-0002-0002-0002-000000000002',
        NOW() - INTERVAL '3 days',
        NOW() + INTERVAL '11 days',
        NULL,
        'borrowed',
        NULL
    ),
    -- Alice: OVERDUE — Sapiens (due 5 days ago)
    (
        '44444444-0004-0004-0004-000000000004',
        '22222222-0002-0002-0002-000000000004',
        '33333333-0003-0003-0003-000000000011',
        '22222222-0002-0002-0002-000000000002',
        NOW() - INTERVAL '19 days',
        NOW() - INTERVAL '5 days',
        NULL,
        'overdue',
        NULL
    ),
    -- Bob: returned Design Patterns
    (
        '44444444-0004-0004-0004-000000000005',
        '22222222-0002-0002-0002-000000000005',
        '33333333-0003-0003-0003-000000000003',
        '22222222-0002-0002-0002-000000000002',
        NOW() - INTERVAL '45 days',
        NOW() - INTERVAL '31 days',
        NOW() - INTERVAL '32 days',
        'returned',
        NULL
    ),
    -- Bob: currently borrowing Dune (active)
    (
        '44444444-0004-0004-0004-000000000006',
        '22222222-0002-0002-0002-000000000005',
        '33333333-0003-0003-0003-000000000018',
        '22222222-0002-0002-0002-000000000002',
        NOW() - INTERVAL '7 days',
        NOW() + INTERVAL '7 days',
        NULL,
        'borrowed',
        NULL
    ),
    -- Carol: OVERDUE — Thinking Fast and Slow (due 10 days ago)
    (
        '44444444-0004-0004-0004-000000000007',
        '22222222-0002-0002-0002-000000000006',
        '33333333-0003-0003-0003-000000000013',
        '22222222-0002-0002-0002-000000000002',
        NOW() - INTERVAL '24 days',
        NOW() - INTERVAL '10 days',
        NULL,
        'overdue',
        NULL
    ),
    -- David: returned The Lean Startup
    (
        '44444444-0004-0004-0004-000000000008',
        '22222222-0002-0002-0002-000000000007',
        '33333333-0003-0003-0003-000000000016',
        '22222222-0002-0002-0002-000000000002',
        NOW() - INTERVAL '60 days',
        NOW() - INTERVAL '46 days',
        NOW() - INTERVAL '44 days',
        'returned',
        'Returned 2 days late'
    )
ON CONFLICT DO NOTHING;


-- ============================================================
-- SECTION 14: SYNC available_copies after seed borrows
-- ============================================================
-- Decrement available_copies for every currently-borrowed book

UPDATE books SET available_copies = available_copies - 1
WHERE id = '33333333-0003-0003-0003-000000000001';  -- Clean Code (John)

UPDATE books SET available_copies = available_copies - 1
WHERE id = '33333333-0003-0003-0003-000000000009';  -- 1984 (Alice)

UPDATE books SET available_copies = available_copies - 1
WHERE id = '33333333-0003-0003-0003-000000000011';  -- Sapiens (Alice overdue)

UPDATE books SET available_copies = available_copies - 1
WHERE id = '33333333-0003-0003-0003-000000000018';  -- Dune (Bob)

UPDATE books SET available_copies = available_copies - 1
WHERE id = '33333333-0003-0003-0003-000000000013';  -- Thinking Fast (Carol overdue)


-- ============================================================
-- SECTION 15: SEED DATA — fines (for overdue records)
-- ============================================================
-- Alice: Sapiens overdue 5 days → $2.50
-- Carol: Thinking Fast overdue 10 days → $5.00
-- David: Lean Startup returned 2 days late → $1.00 (paid)

INSERT INTO fines
    (id, borrow_record_id, user_id, amount, days_overdue, is_paid, paid_at)
VALUES
    (
        '55555555-0005-0005-0005-000000000001',
        '44444444-0004-0004-0004-000000000004',   -- Alice overdue borrow
        '22222222-0002-0002-0002-000000000004',   -- Alice
        2.50,
        5,
        FALSE,
        NULL
    ),
    (
        '55555555-0005-0005-0005-000000000002',
        '44444444-0004-0004-0004-000000000007',   -- Carol overdue borrow
        '22222222-0002-0002-0002-000000000006',   -- Carol
        5.00,
        10,
        FALSE,
        NULL
    ),
    (
        '55555555-0005-0005-0005-000000000003',
        '44444444-0004-0004-0004-000000000008',   -- David late return
        '22222222-0002-0002-0002-000000000007',   -- David
        1.00,
        2,
        TRUE,
        NOW() - INTERVAL '40 days'
    )
ON CONFLICT DO NOTHING;


-- ============================================================
-- SECTION 16: VERIFICATION QUERIES
-- ============================================================
-- Run these after the script to confirm everything loaded.

-- Count rows in each table
SELECT 'categories'    AS tbl, COUNT(*) AS rows FROM categories
UNION ALL
SELECT 'users',                COUNT(*)          FROM users
UNION ALL
SELECT 'books',                COUNT(*)          FROM books
UNION ALL
SELECT 'borrow_records',       COUNT(*)          FROM borrow_records
UNION ALL
SELECT 'fines',                COUNT(*)          FROM fines
ORDER BY tbl;

-- Active borrows
SELECT user_name, book_title, due_date, status
FROM v_borrow_records
WHERE status IN ('borrowed', 'overdue')
ORDER BY due_date;

-- Unpaid fines
SELECT user_name, book_title, amount, days_overdue
FROM v_unpaid_fines
ORDER BY amount DESC;

-- Books with availability
SELECT title, author, total_copies, available_copies, availability_status
FROM v_books
ORDER BY title;


-- ============================================================
-- SECTION 17: USEFUL STORED PROCEDURES
-- ============================================================

-- Procedure: borrow a book (atomic — decrements available_copies)
CREATE OR REPLACE PROCEDURE sp_borrow_book(
    p_user_id   UUID,
    p_book_id   UUID,
    p_issued_by UUID,
    p_due_date  TIMESTAMPTZ,
    p_notes     TEXT DEFAULT NULL
)
LANGUAGE plpgsql AS $$
DECLARE
    v_available INTEGER;
BEGIN
    -- Lock the book row
    SELECT available_copies INTO v_available
    FROM books WHERE id = p_book_id FOR UPDATE;

    IF v_available IS NULL THEN
        RAISE EXCEPTION 'Book not found: %', p_book_id;
    END IF;

    IF v_available <= 0 THEN
        RAISE EXCEPTION 'No copies available for book: %', p_book_id;
    END IF;

    -- Check user does not already have this book
    IF EXISTS (
        SELECT 1 FROM borrow_records
        WHERE user_id = p_user_id
          AND book_id = p_book_id
          AND status  = 'borrowed'
    ) THEN
        RAISE EXCEPTION 'User already has this book borrowed';
    END IF;

    -- Insert borrow record
    INSERT INTO borrow_records (user_id, book_id, issued_by, due_date, notes)
    VALUES (p_user_id, p_book_id, p_issued_by, p_due_date, p_notes);

    -- Decrement available copies
    UPDATE books SET available_copies = available_copies - 1
    WHERE id = p_book_id;
END;
$$;

-- Procedure: return a book (atomic — increments available_copies + creates fine)
CREATE OR REPLACE PROCEDURE sp_return_book(
    p_borrow_id    UUID,
    p_fine_per_day NUMERIC DEFAULT 0.50,
    p_notes        TEXT    DEFAULT NULL
)
LANGUAGE plpgsql AS $$
DECLARE
    v_borrow       borrow_records%ROWTYPE;
    v_days_overdue INTEGER;
    v_fine_amount  NUMERIC(10,2);
BEGIN
    -- Lock the borrow record
    SELECT * INTO v_borrow
    FROM borrow_records
    WHERE id = p_borrow_id AND status = 'borrowed'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Borrow record not found or already returned: %', p_borrow_id;
    END IF;

    -- Calculate overdue days
    v_days_overdue := GREATEST(
        0,
        EXTRACT(DAY FROM NOW() - v_borrow.due_date)::INTEGER
    );
    v_fine_amount := v_days_overdue * p_fine_per_day;

    -- Mark as returned
    UPDATE borrow_records
    SET status      = 'returned',
        returned_at = NOW(),
        notes       = COALESCE(p_notes, notes)
    WHERE id = p_borrow_id;

    -- Increment available copies
    UPDATE books
    SET available_copies = available_copies + 1
    WHERE id = v_borrow.book_id;

    -- Create fine if overdue
    IF v_fine_amount > 0 THEN
        INSERT INTO fines (borrow_record_id, user_id, amount, days_overdue)
        VALUES (p_borrow_id, v_borrow.user_id, v_fine_amount, v_days_overdue);
    END IF;
END;
$$;

-- Function: get dashboard summary stats
CREATE OR REPLACE FUNCTION fn_dashboard_stats()
RETURNS TABLE (
    total_books       BIGINT,
    total_copies      BIGINT,
    available_copies  BIGINT,
    borrowed_copies   BIGINT,
    total_users       BIGINT,
    active_borrows    BIGINT,
    overdue_count     BIGINT,
    unpaid_fines_total NUMERIC
)
LANGUAGE sql STABLE AS $$
    SELECT
        (SELECT COUNT(*)          FROM books          WHERE is_active = TRUE),
        (SELECT SUM(total_copies) FROM books          WHERE is_active = TRUE),
        (SELECT SUM(available_copies) FROM books      WHERE is_active = TRUE),
        (SELECT SUM(total_copies - available_copies) FROM books WHERE is_active = TRUE),
        (SELECT COUNT(*)          FROM users          WHERE is_active = TRUE),
        (SELECT COUNT(*)          FROM borrow_records WHERE status = 'borrowed'),
        (SELECT COUNT(*)          FROM borrow_records WHERE status IN ('borrowed','overdue') AND due_date < NOW()),
        (SELECT COALESCE(SUM(amount), 0) FROM fines   WHERE is_paid = FALSE);
$$;


-- ============================================================
-- SECTION 18: ROW-LEVEL SECURITY (optional — for Supabase)
-- ============================================================
-- Uncomment if you are using Supabase with RLS enabled.

-- ALTER TABLE users          ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE books          ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE borrow_records ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE fines          ENABLE ROW LEVEL SECURITY;

-- Example policy: students can only see their own borrow records
-- CREATE POLICY student_own_borrows ON borrow_records
--     FOR SELECT
--     USING (user_id = current_setting('app.current_user_id')::UUID);

-- ============================================================
-- SECTION 19: FINAL SUMMARY
-- ============================================================

DO $$
DECLARE
    v_cats   INTEGER;
    v_users  INTEGER;
    v_books  INTEGER;
    v_borrow INTEGER;
    v_fines  INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_cats   FROM categories;
    SELECT COUNT(*) INTO v_users  FROM users;
    SELECT COUNT(*) INTO v_books  FROM books;
    SELECT COUNT(*) INTO v_borrow FROM borrow_records;
    SELECT COUNT(*) INTO v_fines  FROM fines;

    RAISE NOTICE '============================================';
    RAISE NOTICE 'Library Management System — DB Setup Done!';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Categories    : %', v_cats;
    RAISE NOTICE 'Users         : %', v_users;
    RAISE NOTICE 'Books         : %', v_books;
    RAISE NOTICE 'Borrow Records: %', v_borrow;
    RAISE NOTICE 'Fines         : %', v_fines;
    RAISE NOTICE '--------------------------------------------';
    RAISE NOTICE 'Default Credentials:';
    RAISE NOTICE '  Admin     : admin@library.com     / Admin@123';
    RAISE NOTICE '  Librarian : librarian@library.com / Librarian@123';
    RAISE NOTICE '  Student   : student@library.com   / Student@123';
    RAISE NOTICE '============================================';
END;
$$;

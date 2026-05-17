-- ============================================================
-- LIBRARY MANAGEMENT SYSTEM - Seed Data
-- ============================================================
-- Default admin password: Admin@123 (bcrypt hashed)
-- Default librarian password: Librarian@123 (bcrypt hashed)
-- Default student password: Student@123 (bcrypt hashed)

-- ============================================================
-- SEED: categories
-- ============================================================
INSERT INTO categories (id, name, description) VALUES
  (uuid_generate_v4(), 'Fiction', 'Novels, short stories, and other fictional works'),
  (uuid_generate_v4(), 'Non-Fiction', 'Biographies, history, science, and factual works'),
  (uuid_generate_v4(), 'Science & Technology', 'Computer science, engineering, and technology books'),
  (uuid_generate_v4(), 'Mathematics', 'Algebra, calculus, statistics, and mathematics'),
  (uuid_generate_v4(), 'History', 'World history, ancient civilizations, and historical events'),
  (uuid_generate_v4(), 'Philosophy', 'Ethics, logic, metaphysics, and philosophical works'),
  (uuid_generate_v4(), 'Business', 'Management, economics, entrepreneurship, and finance'),
  (uuid_generate_v4(), 'Self-Help', 'Personal development, motivation, and productivity'),
  (uuid_generate_v4(), 'Science Fiction', 'Futuristic and speculative fiction'),
  (uuid_generate_v4(), 'Biography', 'Life stories of notable individuals')
ON CONFLICT DO NOTHING;

-- ============================================================
-- SEED: users (passwords are bcrypt hashed)
-- Admin@123     -> $2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK8i
-- Librarian@123 -> $2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi
-- Student@123   -> $2a$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW
-- ============================================================
INSERT INTO users (id, name, email, password, role, student_id, phone, is_active) VALUES
  (
    uuid_generate_v4(),
    'System Administrator',
    'admin@library.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK8i',
    'admin',
    NULL,
    '+1-555-0100',
    TRUE
  ),
  (
    uuid_generate_v4(),
    'Jane Librarian',
    'librarian@library.com',
    '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'librarian',
    NULL,
    '+1-555-0101',
    TRUE
  ),
  (
    uuid_generate_v4(),
    'John Student',
    'student@library.com',
    '$2a$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
    'student',
    'STU-2024-001',
    '+1-555-0102',
    TRUE
  ),
  (
    uuid_generate_v4(),
    'Alice Johnson',
    'alice@library.com',
    '$2a$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
    'student',
    'STU-2024-002',
    '+1-555-0103',
    TRUE
  ),
  (
    uuid_generate_v4(),
    'Bob Smith',
    'bob@library.com',
    '$2a$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
    'student',
    'STU-2024-003',
    '+1-555-0104',
    TRUE
  )
ON CONFLICT DO NOTHING;

-- ============================================================
-- SEED: books (using category names via subquery)
-- ============================================================
INSERT INTO books (title, author, isbn, category_id, description, publisher, publication_year, total_copies, available_copies, language, pages) VALUES
  ('Clean Code', 'Robert C. Martin', '978-0132350884',
    (SELECT id FROM categories WHERE name = 'Science & Technology'),
    'A handbook of agile software craftsmanship', 'Prentice Hall', 2008, 5, 5, 'English', 431),
  ('The Pragmatic Programmer', 'David Thomas, Andrew Hunt', '978-0135957059',
    (SELECT id FROM categories WHERE name = 'Science & Technology'),
    'Your journey to mastery', 'Addison-Wesley', 2019, 4, 4, 'English', 352),
  ('Design Patterns', 'Gang of Four', '978-0201633610',
    (SELECT id FROM categories WHERE name = 'Science & Technology'),
    'Elements of reusable object-oriented software', 'Addison-Wesley', 1994, 3, 3, 'English', 395),
  ('Introduction to Algorithms', 'Thomas H. Cormen', '978-0262033848',
    (SELECT id FROM categories WHERE name = 'Mathematics'),
    'Comprehensive introduction to algorithms', 'MIT Press', 2009, 6, 6, 'English', 1292),
  ('To Kill a Mockingbird', 'Harper Lee', '978-0061935466',
    (SELECT id FROM categories WHERE name = 'Fiction'),
    'A classic of modern American literature', 'Harper Perennial', 1960, 4, 4, 'English', 336),
  ('1984', 'George Orwell', '978-0451524935',
    (SELECT id FROM categories WHERE name = 'Fiction'),
    'A dystopian social science fiction novel', 'Signet Classic', 1949, 5, 5, 'English', 328),
  ('Sapiens', 'Yuval Noah Harari', '978-0062316097',
    (SELECT id FROM categories WHERE name = 'History'),
    'A brief history of humankind', 'Harper', 2015, 4, 4, 'English', 443),
  ('Thinking, Fast and Slow', 'Daniel Kahneman', '978-0374533557',
    (SELECT id FROM categories WHERE name = 'Non-Fiction'),
    'Explores the two systems that drive the way we think', 'Farrar, Straus and Giroux', 2011, 3, 3, 'English', 499),
  ('The Great Gatsby', 'F. Scott Fitzgerald', '978-0743273565',
    (SELECT id FROM categories WHERE name = 'Fiction'),
    'A story of the fabulously wealthy Jay Gatsby', 'Scribner', 1925, 5, 5, 'English', 180),
  ('Atomic Habits', 'James Clear', '978-0735211292',
    (SELECT id FROM categories WHERE name = 'Self-Help'),
    'An easy and proven way to build good habits', 'Avery', 2018, 6, 6, 'English', 320),
  ('The Lean Startup', 'Eric Ries', '978-0307887894',
    (SELECT id FROM categories WHERE name = 'Business'),
    'How constant innovation creates radically successful businesses', 'Crown Business', 2011, 3, 3, 'English', 336),
  ('Dune', 'Frank Herbert', '978-0441013593',
    (SELECT id FROM categories WHERE name = 'Science Fiction'),
    'Epic science fiction novel set in the distant future', 'Ace', 1965, 4, 4, 'English', 896),
  ('Steve Jobs', 'Walter Isaacson', '978-1451648539',
    (SELECT id FROM categories WHERE name = 'Biography'),
    'The exclusive biography of Steve Jobs', 'Simon & Schuster', 2011, 3, 3, 'English', 656),
  ('The Republic', 'Plato', '978-0872201361',
    (SELECT id FROM categories WHERE name = 'Philosophy'),
    'Plato''s masterwork on justice and the ideal state', 'Hackett Publishing', NULL, 4, 4, 'English', 368),
  ('JavaScript: The Good Parts', 'Douglas Crockford', '978-0596517748',
    (SELECT id FROM categories WHERE name = 'Science & Technology'),
    'Unearthing the excellence in JavaScript', 'O''Reilly Media', 2008, 5, 5, 'English', 172)
ON CONFLICT (isbn) DO NOTHING;

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/chat_app_test?sslmode=disable';
process.env.JWT_ACCESS_SECRET = 'test-secret-test-secret-test-secret-123456';

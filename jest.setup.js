// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock environment variables
process.env.DATABASE_URL = 'mysql://test:test@localhost:3306/test';
process.env.OPENAI_API_KEY = 'sk-test';
process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000';

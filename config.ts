// reads the base url from .env so we dont hardcode it everywhere
import dotenv from 'dotenv';
dotenv.config();

export const baseUrl = process.env.BASE_URL || 'https://inerg-test.web.app';

const dotenv = require('dotenv');
const path = require('path');
const { OpenAI } = require('openai');
const { fileURLToPath } = require('url');
const { dirname, join } = path;



dotenv.config({ path: join(__dirname, '..', '.env') });
console.log(">>>>>>> ", process.env.OPENAI_API_KEY)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

module.exports = openai;

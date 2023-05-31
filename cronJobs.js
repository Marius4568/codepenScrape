import { config } from 'dotenv';
config();

import cron from 'node-cron';
import { executeCodePenScraping } from './scraping.js';

const codepenProfile = process.env.CODEPEN_PROFILE;

cron.schedule('* * * * *', async () => {
  try {
    console.log(`Running a task every hour for ${codepenProfile}`);
    await executeCodePenScraping(codepenProfile);

  } catch (error) {
    console.error('Error:', error);
  }
});
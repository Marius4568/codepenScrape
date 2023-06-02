import { config } from 'dotenv';
config();

import cron from 'node-cron';
import {executeCodePenScraping} from './scraper/controller'

const codepenProfile = process.env.CODEPEN_PROFILE; 

if (codepenProfile) {
cron.schedule('0 * * * *', async () => {
  try {
    console.log(`Running a task every hour for ${codepenProfile}`);
    await executeCodePenScraping(codepenProfile);

  } catch (error) {
    console.error('Error:', error);
  }
});
 }


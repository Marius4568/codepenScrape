import { config } from 'dotenv';
config();

import cron from 'node-cron';
import {performCodePenOperations} from './scraper/controller'
import Logger from './logger';

const codepenProfile = process.env.CODEPEN_PROFILE; 

if (codepenProfile) {
cron.schedule('* * * * *', async () => {
  try {
    Logger.info(`Running a task every minute for ${codepenProfile}`);
    await performCodePenOperations(codepenProfile);

  } catch (error) {
    Logger.error('Error while doing cron job:', error);
  }
});
 }
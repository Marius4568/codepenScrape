import { config } from 'dotenv';
import { executeCodePenScraping } from './scraper/controller';
import './server';
// import './cronJobs';
config();
(async () =>
{
  const codepenProfile = process.env.CODEPEN_PROFILE || ''; 
  await executeCodePenScraping(codepenProfile);
})()

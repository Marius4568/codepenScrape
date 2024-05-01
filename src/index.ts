import { config } from 'dotenv';
import { executeCodePenScraping } from './scraper/controller';
import './server';
// import './cronJobs';
console.log(
  process.env,
  'process.env variables'
)
config();
(async () => {
  try {
    const codepenProfile = process.env.CODEPEN_PROFILE || '';
    await executeCodePenScraping(codepenProfile);
    console.log('CodePen scraping completed successfully');
  } catch (err) {
    console.error('Error during CodePen scraping:', err);
  } finally {
    process.exit(0);
  }
})();

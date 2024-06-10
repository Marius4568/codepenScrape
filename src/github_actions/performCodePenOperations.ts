import { config } from 'dotenv';
import { performCodePenOperations } from '../scraper/controller';
import Logger from '../logger';

config();
(async () => {
  try {
    const codepenProfile = process.env.CODEPEN_PROFILE || '';
    await performCodePenOperations(codepenProfile);
  } catch (err) {
    Logger.error('Error during CodePen operations:', err);
  } finally {
    Logger.info('Exiting process')
    process.exit(0);
  }
})();
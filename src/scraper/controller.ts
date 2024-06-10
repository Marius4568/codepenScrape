import { sendNewCodePenChangedDataNotification } from '../email/operations';
import { scrapeUsersCodepensData } from './operations';
import { fetchUserTotalViews, updateDBDataWithScrapedData, fetchUserCodepens, fetchUserTotalLikes, fetchUserTotalComments } from '../db/operations';
import Logger from '../logger';

// OPERATIONS
// 1) Scrape specific codepen profile's data.
// 2) If needed update total profile views, total views history
// 3) If needed update codepen info and total codepen views history
// 4) Send a notification to the user if there are any changes in codepen data

export const performCodePenOperations = async (codepenProfileUsername: string) => {
    try {
        Logger.info(`Starting CodePen operations for profile: ${codepenProfileUsername}`);

        const codepensUrl = `https://codepen.io/${codepenProfileUsername}/pens/public`;
        Logger.info(`Scraping data from URL: ${codepensUrl}`);
        const codepensScrapeData = await scrapeUsersCodepensData(codepensUrl);
        Logger.info('Scraped CodePens Data:', codepensScrapeData);

        const previousTotalViews = await fetchUserTotalViews(codepenProfileUsername) || 0;
        Logger.info(`Previous Total Views: ${previousTotalViews}`);

        const previousTotalLikes = await fetchUserTotalLikes(codepenProfileUsername) || 0;
        Logger.info(`Previous Total Likes: ${previousTotalLikes}`);

        const previousTotalComments = await fetchUserTotalComments(codepenProfileUsername) || 0;
        Logger.info(`Previous Total Comments: ${previousTotalComments}`);

        const previousPensData = await fetchUserCodepens(codepenProfileUsername);
        Logger.info('Previous Pens Data:', previousPensData);

        const haveReceivedMoreInteractions = codepensScrapeData.total_views > previousTotalViews ||
            codepensScrapeData.total_likes > previousTotalLikes ||
            codepensScrapeData.total_comments > previousTotalComments;

        Logger.info(`Have received more interactions: ${haveReceivedMoreInteractions}`);

        if (haveReceivedMoreInteractions) {
            Logger.info('Updating database with scraped data');
            await updateDBDataWithScrapedData({ profile_username: codepenProfileUsername }, codepensScrapeData);

            if (previousPensData) {
                Logger.info('Sending notification for new interactions');
                await sendNewCodePenChangedDataNotification(
                    codepensScrapeData.total_views, previousTotalViews,
                    codepensScrapeData.total_likes, previousTotalLikes,
                    codepensScrapeData.total_comments, previousTotalComments,
                    codepensScrapeData.pens, previousPensData
                );
            }
        }

        Logger.info('Finished CodePen operations');
        return codepensScrapeData;

    } catch (error) {
        Logger.error('Error during CodePen operations:', error);
    }
};

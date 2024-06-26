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
        Logger.info(`Previous Pens Data: ${previousPensData}`);

        const haveReceivedMoreInteractions = codepensScrapeData.total_views > previousTotalViews ||
            codepensScrapeData.total_likes > previousTotalLikes ||
            codepensScrapeData.total_comments > previousTotalComments;

        Logger.info(`Have received more interactions: ${haveReceivedMoreInteractions}`);
        // Calculate new interactions for each pen
        const penInteractions = codepensScrapeData.pens.map(pen => {
            const previousPenData = previousPensData.find(prevPen => prevPen.codepen_id === pen.codepen_id);

            Logger.info(`Processing Pen ID: ${pen.codepen_id}`);
            Logger.info(`Current Pen Data: ${JSON.stringify(pen, null, 2)}`);
            Logger.info(`Previous Pen Data: ${JSON.stringify(previousPenData, null, 2)}`);

            const previousPenViews = previousPenData ? previousPenData.views_count : 0;
            const previousPenLikes = previousPenData ? previousPenData.likes_count : 0;
            const previousPenComments = previousPenData ? previousPenData.comments_count : 0;

            const newViews = pen.views - previousPenViews;
            const newLikes = pen.likes - previousPenLikes;
            const newComments = pen.comments_count - previousPenComments;

            Logger.info(`Pen ID: ${pen.codepen_id} | New Views: ${newViews} | New Likes: ${newLikes} | New Comments: ${newComments}`);

            return {
                codepen_id: pen.codepen_id,
                title: pen.title,
                new_views: newViews,
                new_likes: newLikes,
                new_comments: newComments,
                total_views: pen.views,
                total_likes: pen.likes,
                total_comments: pen.comments_count,
            };
        }).filter(pen => pen.new_views > 0 || pen.new_likes > 0 || pen.new_comments > 0);
        console.log(JSON.stringify(penInteractions))
        if (haveReceivedMoreInteractions) {
            Logger.info('Updating database with scraped data');
            await updateDBDataWithScrapedData({ profile_username: codepenProfileUsername }, codepensScrapeData);

            Logger.info('Sending notification for new interactions');
            await sendNewCodePenChangedDataNotification(
                {
                    totalViews: codepensScrapeData.total_views,
                    previousTotalViews,
                    totalLikes: codepensScrapeData.total_likes,
                    previousTotalLikes,
                    totalComments: codepensScrapeData.total_comments,
                    previousTotalComments,
                    penInteractions
                }
            );
        }

        Logger.info('Finished CodePen operations');
        return codepensScrapeData;

    } catch (error) {
        Logger.error('Error during CodePen operations:', error);
    }
};

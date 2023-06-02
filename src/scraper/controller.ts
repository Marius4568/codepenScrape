import { sendGridNotification } from '../email/operations';
import { scrapeCodePenPage } from './operations';
import { fetchPreviousTotalViews, fetchPreviousPenViews, updateTotalViewsInDB, updatePenViewsInDB } from '../db/operations';

export const executeCodePenScraping = async (codepenProfile: string) => {
    try {
        const url = `https://codepen.io/${codepenProfile}/pens/public`;
        const data = await scrapeCodePenPage(url);
        const timeScraped = new Date();

        const previousViews = await fetchPreviousTotalViews(codepenProfile);
        const previousPensDataObj = await fetchPreviousPenViews(codepenProfile);
        const previousPensData = Object.entries(previousPensDataObj).map(([title, views]) => ({ title, views, likes: 0, comments: 0 }));

        await updateTotalViewsInDB(codepenProfile, data.totalViews);
        await updatePenViewsInDB(codepenProfile, data.pens);

        if (data.totalViews > previousViews) {
            await sendGridNotification(data.totalViews, previousViews, data.pens, previousPensData);
        }

        console.log('Data:', data);
        console.log('Scrape Date:', timeScraped.toLocaleString());
    } catch (error) {
        console.error('Error:', error);
    }
};

import { sendGridNotification } from '../email/operations';
import { scrapeCodePenPage } from './operations';
import { fetchPreviousTotalViews, fetchPreviousPenViews, updateTotalViewsInDB, updatePenViewsInDB } from '../db/operations';

export const executeCodePenScraping = async (
    codepenProfile: string, 
    shouldUpdateDB: boolean = true, 
    shouldNotify: boolean = true
) => {
    try {
        console.log(codepenProfile)
        const url = `https://codepen.io/${codepenProfile}/pens/public`;
        const data = await scrapeCodePenPage(url);
        const timeScraped = new Date();

        const previousViews = await fetchPreviousTotalViews(codepenProfile);
        const previousPensDataObj = await fetchPreviousPenViews(codepenProfile);
        const previousPensData = Object.entries(previousPensDataObj).map(([title, views]) => ({ title, views, likes: 0, comments: 0 }));

        if (shouldUpdateDB) {
            await updateTotalViewsInDB(codepenProfile, data.totalViews);
            await updatePenViewsInDB(codepenProfile, data.pens);
        }
           
        if (shouldNotify && data.totalViews > previousViews) {
            await sendGridNotification(data.totalViews, previousViews, data.pens, previousPensData);
        }

        console.log('Data:', data);
        console.log('Scrape Date:', timeScraped.toLocaleString());

        return data; // return the scraped data
    } catch (error) {
        console.error('Error:', error);
        throw error; // re-throw the error so it can be caught in the route handler
    }
};

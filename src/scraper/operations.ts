import { Page } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { penData } from '../email/operations';
puppeteer.use(StealthPlugin());

const delayTime = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const extractPageData = async (page: Page) => {
       return await page.evaluate(() => {
        // Query all required elements
        const viewsElements = document.querySelectorAll('a[data-stat="views"]');
        const likeElements = document.querySelectorAll('button[data-stat="loves"]');
        const commentElements = document.querySelectorAll('a[data-stat="comments"]');
        const titleElements = document.querySelectorAll('h2[title] a');

        // Extract data from elements
        const titles = Array.from(titleElements).map(el => el.textContent || 'N/A');
       const views = Array.from(viewsElements).map(el => parseInt((el.textContent || '').replace(/[\, \.]/g, '')) || 0);
const likes = Array.from(likeElements).map(el => parseInt((el.textContent || '').replace(/[\, \. love]/gi, '')) || 0);
const comments = Array.from(commentElements).map(el => parseInt((el.textContent || '').replace(/[\, \.]/g, '')) || 0);
        // Build pensData array
        const pensData = Array.from(titleElements, (el, index) => {
            return {
                title: titles[index] || 'N/A',
                views: views[index] || 0,
                likes: likes[index] || 0,
                comments: comments[index] || 0,
            };
        });

        // Calculate total views, likes, and comments
        const totalViews = views.reduce((acc, curr) => acc + curr, 0);
        const totalLikes = likes.reduce((acc, curr) => acc + curr, 0);
        const totalComments = comments.reduce((acc, curr) => acc + curr, 0);

        return {
            pens: pensData,
            totalViews,
            totalLikes,
            totalComments,
        };
    });
};

// This function will handle page navigation
const handlePageNavigation = async (page: Page, data: { pens: penData[]; totalViews: number; totalLikes: number; totalComments: number; }) => {
    const nextButton = await page.$('button[data-direction="next"]');
    if (nextButton) {
        await Promise.all([
            page.click('button[data-direction="next"]'),
            delayTime(3000),
            page.waitForNavigation({ waitUntil: 'networkidle0' }),
        ]);
        console.log('Clicked on next button');
        const nextPageData = await extractPageData(page);
        data.pens = [...data.pens, ...nextPageData.pens];
        data.totalViews += nextPageData.totalViews;
        data.totalLikes += nextPageData.totalLikes;
        data.totalComments += nextPageData.totalComments;
        return true;
    }
    return false;
}

export const scrapeCodePenPage = async (url: string) => {
    const browser = await puppeteer.launch({
        headless: true, executablePath: process.env.NODE_ENV === "production" ? process.env.PUPPETEER_EXECUTABLE_PATH : puppeteer.executablePath(),
    args: ['--no-sandbox', '--disable-setuid-sandbox', "--single-process", '--no-zygote']});

    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(2 * 60 * 1000);
    await page.goto(url, { waitUntil: 'networkidle0' });

    let data = await extractPageData(page);
    let safetyCounter = 0;
    let hasNextPage = await handlePageNavigation(page, data);
    
    // Add a safety counter
    while (hasNextPage && safetyCounter < 50) {
        safetyCounter += 1;
        hasNextPage = await handlePageNavigation(page, data);
    }

    await browser.close();
    return data;
};
import { Page } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import Logger from '../logger';
import { CodepenComment, CodepensScrapeData, PenData } from '../types';

puppeteer.use(StealthPlugin());

const delayTime = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const extractCodepenData = async (page: Page): Promise<PenData> => {
    return await page.evaluate(() => {
        const extractNumberFromText = (text: string) => {
            const numberMatch = text.match(/[\d,]+/);
            return numberMatch ? parseInt(numberMatch[0].replace(/,/g, ''), 10) : 0;
        };

        //TODO: edit this for more accuracy
        // Extract Likes and Views
        const likesAndViewsElements = document.querySelectorAll('h3.itemDetailsStats-module_statTitle-oEV0h');
        let likes = 0;
        let views = 0;

        likesAndViewsElements.forEach(element => {
            const text = element.textContent || '';
            const number = extractNumberFromText(text);

            if (text.includes('Love')) {
                likes = number;
            } else if (text.includes('View')) {
                views = number;
            }
        });

        // Extract Title and codepenID
        const titleElement = document.querySelector('h1.ItemTitleWithAuthor_title-oP3ro > a');
        const title = titleElement && titleElement?.textContent || 'N/A';
        const href = titleElement ? titleElement.getAttribute('href') : '';
        const codepenIdMatch = href ? href.match(/pen\/([a-zA-Z0-9]+)/) : null;
        const codepen_id = codepenIdMatch ? codepenIdMatch[1] : 'N/A';

        // Extract Description
        const description = document.querySelector('.RenderedMarkdown-module_root-T9BRK > p')?.textContent || 'N/A';

        // Extract Tags
        const tagElements = Array.from(document.querySelectorAll("span.Tag-module_root-UzSJ1 > a"));
        const tags = tagElements.map(elem => elem.textContent?.trim() || 'N/A');

        // Extract Comments
        const comments: CodepenComment[] = [];
        const commentElements = document.querySelectorAll('li[data-comment="true"]');
        commentElements.forEach(commentElement => {
            const authorElement = commentElement.querySelector('a.ItemComment-module_commentAuthor-QBmsC em');
            const usernameElement = commentElement.querySelector('a.ItemComment-module_commentAuthor-QBmsC');
            const textElement = commentElement.querySelector('div.ItemComment-module_commentContent-5j5sK p');
            const timeElement = commentElement.querySelector('time[datetime]');

            const author = authorElement && authorElement?.textContent?.trim() || 'N/A';
            const usernameMatch = usernameElement ? usernameElement?.textContent?.match(/\(\@(.*?)\)/) : null;
            const username = usernameMatch ? usernameMatch[1].trim() : 'N/A';
            const text = textElement && textElement?.textContent?.trim() || 'N/A';
            // const date = timeElement ? timeElement.getAttribute('datetime') : 'N/A';

            comments.push({
                author,
                username,
                text,
                // date
            });
        });

        return {
            codepen_id: codepen_id,
            title,
            description,
            tags,
            views,
            likes,
            comments_count: comments.length,
            comments,
        };
    });
};

const goToNextCodepen = async (page: Page): Promise<boolean> => {
    const nextButton = await page.$('button[aria-label="Next Pen"]');
    const noMoreButton = await page.$('button[aria-label="Next Pen"][disabled]');

    if (nextButton && !noMoreButton) {
        await nextButton.evaluate(button => button.scrollIntoView()); // Ensure the button is visible
        await delayTime(2000); // Give it a moment to ensure it's interactable

        await Promise.all([
            nextButton.click(),
            page.waitForNavigation({ waitUntil: 'networkidle0' }),
        ]);
        await delayTime(2000);
        Logger.info('Clicked on next button');
        return true;
    } else {
        Logger.info('Next button is disabled. Reached the last pen.');
        return false;
    }
};

export const scrapeUsersCodepensData = async (url: string): Promise<CodepensScrapeData> => {
    const browser = await puppeteer.launch({
        headless: true,
        executablePath: process.env.NODE_ENV === "production" ? process.env.PUPPETEER_EXECUTABLE_PATH : puppeteer.executablePath(),
        args: ['--no-sandbox', '--disable-setuid-sandbox', "--single-process", '--no-zygote']
    });

    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(2 * 60 * 1000);
    await page.goto(url, { waitUntil: 'networkidle0' });

    // for console logs that occur during evaluation of the pages (scraping)
    page.on('console', msg => {
        for (let i = 0; i < msg.args().length; ++i)
            console.log(`${msg.text()}`);
    });

    Logger.info(`Navigated to ${url}`);

    await expandFirstCodepen(page);

    let safetyCounter = 0;
    let hasNextPage = true;
    const collectedData: PenData[] = [];
    let total_views = 0, total_likes = 0, total_comments = 0;

    while (hasNextPage && safetyCounter < 50) {
        safetyCounter++;
        const codepenData = await extractCodepenData(page);
        await delayTime(10000);
        collectedData.push(codepenData);
        total_views += codepenData.views;
        total_likes += codepenData.likes;
        total_comments += codepenData.comments_count;

        hasNextPage = await goToNextCodepen(page);
    }

    await browser.close();
    Logger.info('Closing browser');

    console.log({
        pens: collectedData,
        total_views,
        total_likes,
        total_comments
    }, 'dtttta');
    return {
        pens: collectedData,
        total_views,
        total_likes,
        total_comments
    };
};

const expandFirstCodepen = async (page: Page) => {
    try {
        await page.waitForSelector('.ItemPreviewPopOutButton-module_popupButton-NIvxj', { timeout: 5000 });
        const firstExpandButton = await page.$('.ItemPreviewPopOutButton-module_popupButton-NIvxj');
        if (firstExpandButton) {
            await firstExpandButton.click();
            Logger.info('Clicked the first expand button');
            await delayTime(5000);
        } else {
            Logger.warn('No expand button found');
        }
    } catch (error: unknown) {
        if (error instanceof Error) {
            Logger.error(`Error expanding first CodePen: ${error.message}`);
            const pageContent = await page.content();
            Logger.info(`Page Content at error: ${pageContent}`);
        }
    }
};

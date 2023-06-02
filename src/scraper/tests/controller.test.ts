import { executeCodePenScraping } from '../controller';
import { scrapeCodePenPage } from '../operations';
import { fetchPreviousTotalViews, fetchPreviousPenViews, updateTotalViewsInDB, updatePenViewsInDB } from '../../db/operations';
import { sendGridNotification } from '../../email/operations';

jest.mock('../operations');
jest.mock('../../db/operations');
jest.mock('../../email/operations');

const mockedScrapeCodePenPage = scrapeCodePenPage as jest.MockedFunction<typeof scrapeCodePenPage>;
const mockedFetchPreviousTotalViews = fetchPreviousTotalViews as jest.MockedFunction<typeof fetchPreviousTotalViews>;
const mockedFetchPreviousPenViews = fetchPreviousPenViews as jest.MockedFunction<typeof fetchPreviousPenViews>;
const mockedUpdateTotalViewsInDB = updateTotalViewsInDB as jest.MockedFunction<typeof updateTotalViewsInDB>;
const mockedUpdatePenViewsInDB = updatePenViewsInDB as jest.MockedFunction<typeof updatePenViewsInDB>;
const mockedSendGridNotification = sendGridNotification as jest.MockedFunction<typeof sendGridNotification>;

describe('executeCodePenScraping', () => {
  it('should execute scraping without error', async () => {
    const mockData = {
      pens: [],
      totalViews: 0,
      totalLikes: 0,
      totalComments: 0,
    };

    mockedScrapeCodePenPage.mockResolvedValue(mockData);
    mockedFetchPreviousTotalViews.mockResolvedValue(0);
    mockedFetchPreviousPenViews.mockResolvedValue({});
    mockedUpdateTotalViewsInDB.mockResolvedValue();
    mockedUpdatePenViewsInDB.mockResolvedValue();
    mockedSendGridNotification.mockResolvedValue();

    await expect(executeCodePenScraping('testProfile')).resolves.not.toThrow();
  });
});
import { performCodePenOperations } from '../controller';
import { scrapeUsersCodepensData } from '../operations';
import { fetchUserTotalViews, fetchUserLatestCodepensData, updateProfileAndTotalViewsHistory, updateUserCodepensData } from '../../db/operations';
import { sendNewCodePenChangedDataNotification } from '../../email/operations';

jest.mock('../operations');
jest.mock('../../db/operations');
jest.mock('../../email/operations');

const mockedScrapeCodePenPage = scrapeUsersCodepensData as jest.MockedFunction<typeof scrapeUsersCodepensData>;
const mockedFetchPreviousTotalViews = fetchUserTotalViews as jest.MockedFunction<typeof fetchUserTotalViews>;
const mockedFetchPreviousPenViews = fetchUserLatestCodepensData as jest.MockedFunction<typeof fetchUserLatestCodepensData>;
const mockedUpdateTotalViewsInDB = updateProfileAndTotalViewsHistory as jest.MockedFunction<typeof updateProfileAndTotalViewsHistory>;
const mockedUpdatePenViewsInDB = updateUserCodepensData as jest.MockedFunction<typeof updateUserCodepensData>;
const mockedSendGridNotification = sendNewCodePenChangedDataNotification as jest.MockedFunction<typeof sendNewCodePenChangedDataNotification>;

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

    await expect(performCodePenOperations('testProfile')).resolves.not.toThrow();
  });
});
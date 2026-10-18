import { Api } from '../../shared/api/api.class';
import type {
  PortfolioWork,
  PortfolioWorkCreateRequest,
  PortfolioWorkUpdateRequest,
  PortfolioWorkWriteResponse,
} from './types';
import { USERS_ME } from '../../shared/api/constants';

const PORTFOLIO_WORKS_PATH = `${USERS_ME}portfolio-works/`;

export class PortfolioWorkService {
  private readonly api: Api;

  constructor(api: Api) {
    this.api = api;
  }

  list(): Promise<PortfolioWork[]> {
    return this.api.get<PortfolioWork[]>(PORTFOLIO_WORKS_PATH);
  }

  create(
    data: PortfolioWorkCreateRequest
  ): Promise<PortfolioWorkWriteResponse> {
    return this.api.post<PortfolioWorkWriteResponse>(
      PORTFOLIO_WORKS_PATH,
      data
    );
  }

  update(
    portfolioWorkId: number,
    data: PortfolioWorkUpdateRequest
  ): Promise<PortfolioWorkWriteResponse> {
    const path = `${PORTFOLIO_WORKS_PATH}${portfolioWorkId}/`;
    return this.api.patch<PortfolioWorkWriteResponse>(path, data);
  }

  delete(portfolioWorkId: number): Promise<void> {
    const path = `${PORTFOLIO_WORKS_PATH}${portfolioWorkId}/`;
    return this.api.delete<void>(path);
  }
}

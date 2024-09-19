import { ExecutionAPI } from "./api";
import { ExecutionState, GetStatusResponse } from "./types";

export interface Page {
  number: number;
  values: Record<string, unknown>[];
}

export class Paginator {
  private client: ExecutionAPI;
  private executionId: string;
  private pageSize: number;
  private currentPageNumber: number;
  pageCache: Map<number, Page>;
  totalRows: number;

  private constructor(
    client: ExecutionAPI,
    executionId: string,
    pageSize: number,
    firstPage: Page,
    totalRows: number,
  ) {
    this.client = client;
    this.executionId = executionId;
    this.pageSize = pageSize;
    this.currentPageNumber = firstPage.number;
    this.pageCache = new Map();
    this.pageCache.set(this.currentPageNumber, firstPage);
    this.totalRows = totalRows;
  }

  static async new(
    client: ExecutionAPI,
    executionStatus: GetStatusResponse,
    pageLimit: number,
  ): Promise<Paginator> {
    if (executionStatus.state !== ExecutionState.COMPLETED) {
      throw new Error("Paginator can only be constructed on Complete execution state.");
    }
    const executionId = executionStatus.execution_id;
    const results = await client.getExecutionResults(executionId, {
      limit: pageLimit,
      offset: 0,
    });

    if (!results.result) {
      throw new Error("Can't paginate execution without results.");
    }
    const totalRows = results.result.metadata.total_row_count;
    const firstPage = {
      number: 1,
      values: results.result.rows,
    };
    return new Paginator(client, executionId, pageLimit, firstPage, totalRows);
  }

  maxPage(): number {
    return Math.ceil(this.totalRows / this.pageSize);
  }

  async nextPage(): Promise<Page | undefined> {
    if (this.currentPageNumber < this.maxPage()) {
      const nextPage = await this.getPage(this.currentPageNumber + 1);
      this.currentPageNumber++;
      return nextPage;
    }
    console.warn("You are already on the last page!");
    return;
  }

  async previousPage(): Promise<Page | undefined> {
    if (this.currentPageNumber > 1) {
      const previousPage = await this.getPage(this.currentPageNumber - 1);
      this.currentPageNumber--;
      return previousPage;
    }
    console.warn("You are already on the first page.");
    return;
  }

  async lastPage(): Promise<Page | undefined> {
    const lastPage = await this.getPage(this.maxPage());
    this.currentPageNumber = this.maxPage();
    return lastPage;
  }

  async getPage(n: number): Promise<Page | undefined> {
    if (n >= 1 && n <= this.maxPage()) {
      if (this.pageCache.has(n)) {
        return this.pageCache.get(n)!;
      }
      const pageNResults = await this.client.getExecutionResults(this.executionId, {
        limit: this.pageSize,
        // Page 1 has offset 0.
        offset: this.pageSize * (n - 1),
      });
      if (!pageNResults.result) {
        throw new Error(`Expected results for page ${n} of ${this.maxPage}`);
      }
      const pageN = {
        number: n,
        values: pageNResults.result.rows,
      };
      this.pageCache.set(n, pageN);
      return pageN;
    }
    console.warn(
      `Invalid page number requested ${n}: Must be contained in [1, ${this.maxPage()}]`,
    );
    return;
  }

  public getCurrentPageValues(): Page {
    return this.pageCache.get(this.currentPageNumber)!;
  }
}

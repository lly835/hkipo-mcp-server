// 新股信息接口
export interface IPOInfo {
  stockCode: string;
  stockName: string;
  listingDate: string;
  sponsor: string;
  priceRange: string;
  lotSize: number;
  subscriptionPeriod: string;
  marketCap: number;
  peRatio: number;
  resultDate: string;
  industry: string;
  status: string;
}

// 管理层信息接口
export interface ManagementInfo {
  name: string;
  position: string;
  rank: number;
}

// 基石投资者信息接口
export interface CornerStoneInvestor {
  name: string;
  shareholding: number;
  percentage: number;
  releaseDate: string;
  relatedParty: string;
  investorType: string;
  investmentAmount: number;
}

// 公司信息接口
export interface CompanyInfo {
  business: string;
  totalShares: number;
  publicOffering: number;
  internationalOffering: number;
  
  // 基本信息
  fullName?: string;
  website?: string;
  principalOffice?: string;
  registrars?: string;
  registrarsTel?: string;
  chairman?: string;
  secretary?: string;
  telephone?: string;
  substantialShareholders?: string;
  
  // 发行信息
  minimumCapital?: number;
  raiseMoney?: number;
  totalMarketCap?: number;
  hkMarketCap?: number;
  issueRatio?: number;
  overAllotment?: string;
  stabilizingManager?: string;
  underwritingFee?: number;
  listingExpenses?: number;
  currency?: string;
  
  // 用途说明
  useOfProceeds?: string;
  
  // 承销团信息
  allUnderwriters?: string;
  leadAgent?: string;
  bookRunners?: string;
  coordinator?: string;
  
  // 招股书链接
  prospectusLink?: string;
  
  // A股信息
  isAHStock?: boolean;
  aSymbol?: string;
  
  // 管理层信息
  management?: ManagementInfo[];
  
  // 基石投资者信息
  cornerStoneInvestors?: CornerStoneInvestor[];
  totalCornerStonePercentage?: number;
}

// 新股详情接口
export interface IPODetail extends IPOInfo {
  companyInfo: CompanyInfo;
  prospectusUrl?: string;
  greyMarket?: GreyMarketData;
  firstDayPerformance?: FirstDayPerformance;
}

// 配售信息接口
export interface AllocationInfo {
  publicOfferingRatio: number;
  internationalOfferingRatio: number;
  allocationRate: number;
  subscriptionMultiple: number;
  allocationResultUrl?: string;
  retailInvestors: number;
  institutionalInvestors: number;
}

// 暗盘数据接口
export interface GreyMarketData {
  stockCode: string;
  currentPrice: number;
  changePercent: number;
  volume: number;
  brokerQuotes: BrokerQuote[];
  lastUpdated: string;
  ipoPricing?: number;     // 招股价
  turnover?: number;       // 成交额
  shortName?: string;      // 股票简称
  listingDate?: string;    // 上市日期
  resultDate?: string;     // 公布结果日期
}

// 券商报价接口
export interface BrokerQuote {
  brokerName: string;
  bidPrice: number;
  askPrice: number;
  spread: number;
}

// 首日表现接口
export interface FirstDayPerformance {
  stockCode: string;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  closePrice: number;
  changePercent: number;
  volume: number;
  turnoverRate: number;
  marketCap: number;
  listingDate: string;
}

// API响应接口
export interface ApiResponse<T> {
  result: number;
  message: string;
  data: T;
  timestamp?: string;
}

// 分页接口
export interface PaginationParams {
  pageIndex: number;
  pageSize: number;
  sector?: string;
}

// 分页响应接口
export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  totalPages: number;
}

// 配置接口
export interface MCPConfig {
  aipoBaseUrl: string;
  jybBaseUrl: string;
  userAgent: string;
  rateLimit: number;
  rateLimitWindow: number;
  requestVerificationToken: string;
}

// 错误类型
export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

// 配售结果接口
export interface PlacingResult {
  stockCode: string;
  stockName: string;
  lotSize: number;
  totalShares: number;
  allocationRate: string;
  clawBack: number;
  subscribed: number;
  placementTimes: number;
  codesRate: number;
  headHammer: number;
  priceCeiling: number;
  priceFloor: number;
  ipoPricing: number;
  raiseMoney: number;
  invalidApplication: number;
  allocationResultUrl?: string;
  allocationList: AllocationLevel[];
}

// 配售结果分配层级
export interface AllocationLevel {
  shares: number;
  applicants: number;
  successfulApplicants: number | null;
  winningRate: number;
  allocationDetails: string;
  isPlacee: number;
  amount: number;
} 
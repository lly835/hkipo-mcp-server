import { config } from 'dotenv';
import { MCPConfig } from '../types/index.js';

// 加载环境变量
config();

export const mcpConfig: MCPConfig = {
  aipoBaseUrl: process.env.AIPO_BASE_URL || 'https://aipo.myiqdii.com',
  userAgent: process.env.AIPO_USER_AGENT || 'Mozilla/5.0 (compatible; HKIPO-MCP-Server)',
  rateLimit: parseInt(process.env.RATE_LIMIT || '100'),
  rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '3600'),
  // 使用简化的TOKEN环境变量，同时保持向后兼容
  requestVerificationToken: process.env.TOKEN || process.env.REQUEST_VERIFICATION_TOKEN || '',
};

// API端点配置
export const API_ENDPOINTS = {
  // 新股信息
  GET_IPO_LIST: '/Home/GetHKIPOInfoMore',
  GET_IPO_DETAIL: '/Home/NewStockBrief',
  
  // 滚动信息
  GET_TOP_SCROLL: '/Home/GetTopScrollList',
  
  // 横幅信息
  GET_BANNER_LIST: '/Home/GetBannerList',
  
  // 订单详情
  QUERY_ORDER_DETAIL: '/home/QueryOrderDetail',
  
  // 暗盘相关（可能需要进一步分析HAR文件获取）
  GET_GREY_MARKET: '/grey-market', // 待确认
  
  // 配售信息（可能需要进一步分析HAR文件获取）
  GET_ALLOCATION_INFO: '/allocation', // 待确认
} as const;

export default mcpConfig; 
import { config } from 'dotenv';
import { MCPConfig } from '../types/index.js';

// 加载环境变量
config();

export const mcpConfig: MCPConfig = {
  aipoBaseUrl: process.env.AIPO_BASE_URL || 'https://aipo.myiqdii.com',
  jybBaseUrl: process.env.JYB_BASE_URL || 'https://jybdata.iqdii.com',  // 添加新的API基础URL
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
  
  // 订单详情
  QUERY_ORDER_DETAIL: '/home/QueryOrderDetail',
  
  // 暗盘相关
  GET_GREY_MARKET: '/grey-market', // 旧的暗盘接口（已弃用）
  GET_GREY_LIST: '/Home/GetGreyList', // 新的暗盘列表接口
  
  // 配售结果（新增）
  GET_PLACING_RESULT: '/jybapp/IPOService/GetPlacingResult', // 新股配售结果接口
} as const;

export default mcpConfig; 
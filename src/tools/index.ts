import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const tools: Tool[] = [
  {
    name: 'list_active_ipos',
    description: '获取当前正在招股的新股列表',
    inputSchema: {
      type: 'object',
      properties: {
        industry: {
          type: 'string',
          description: '行业筛选条件（可选）',
        },
        pageIndex: {
          type: 'number',
          description: '页码，从1开始',
          minimum: 1,
          default: 1,
        },
        pageSize: {
          type: 'number',
          description: '每页数量',
          minimum: 1,
          maximum: 100,
          default: 20,
        },
      },
      required: [],
    },
  },
  {
    name: 'get_ipo_details',
    description: '获取特定新股的详细信息，包括招股价格、一手股数、募资金额、招股书链接等',
    inputSchema: {
      type: 'object',
      properties: {
        stock_code: {
          type: 'string',
          description: '股票代码，例如：01304',
          pattern: '^[0-9]{4,5}$',
        },
      },
      required: ['stock_code'],
    },
  },
  {
    name: 'get_allocation_info',
    description: '获取新股配售信息，包括中签率、认购倍数、配售结果等',
    inputSchema: {
      type: 'object',
      properties: {
        stock_code: {
          type: 'string',
          description: '股票代码，例如：01304',
          pattern: '^[0-9]{4,5}$',
        },
      },
      required: ['stock_code'],
    },
  },
  {
    name: 'get_grey_market_data',
    description: '获取新股暗盘交易数据，包括暗盘价格、涨跌幅、成交量等',
    inputSchema: {
      type: 'object',
      properties: {
        stock_code: {
          type: 'string',
          description: '股票代码，例如：01304',
          pattern: '^[0-9]{4,5}$',
        },
      },
      required: ['stock_code'],
    },
  },
  {
    name: 'get_first_day_performance',
    description: '获取新股首日上市表现，包括开盘价、最高价、最低价、收盘价、涨跌幅等',
    inputSchema: {
      type: 'object',
      properties: {
        stock_code: {
          type: 'string',
          description: '股票代码，例如：01304',
          pattern: '^[0-9]{4,5}$',
        },
      },
      required: ['stock_code'],
    },
  },
  {
    name: 'search_ipo_by_name',
    description: '根据公司名称搜索新股信息',
    inputSchema: {
      type: 'object',
      properties: {
        company_name: {
          type: 'string',
          description: '公司名称或关键词',
          minLength: 1,
        },
        exact_match: {
          type: 'boolean',
          description: '是否精确匹配公司名称',
          default: false,
        },
      },
      required: ['company_name'],
    },
  },
  {
    name: 'get_market_overview',
    description: '获取新股市场概览，包括近期上市新股统计、平均表现等',
    inputSchema: {
      type: 'object',
      properties: {
        days: {
          type: 'number',
          description: '统计天数，默认30天',
          minimum: 1,
          maximum: 365,
          default: 30,
        },
      },
      required: [],
    },
  },
]; 
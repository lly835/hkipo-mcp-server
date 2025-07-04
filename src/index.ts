#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { tools } from './tools/index.js';
import { ToolHandlers } from './handlers/toolHandlers.js';
import { NetworkLogger } from './utils/logger.js';

class HKIPOMCPServer {
  private server: Server;
  private toolHandlers: ToolHandlers;

  constructor() {
    this.server = new Server(
      {
        name: 'hkipo-mcp-server',
        version: '1.0.0',
        description: '港股新股信息MCP服务',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.toolHandlers = new ToolHandlers();
    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return { tools: tools };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'list_active_ipos':
            return await this.toolHandlers.listActiveIPOs(args);
          case 'get_ipo_details':
            return await this.toolHandlers.getIPODetails(args);
          case 'get_grey_market_data':
            return await this.toolHandlers.getGreyMarketData(args);
          case 'get_first_day_performance':
            return await this.toolHandlers.getFirstDayPerformance(args);
          case 'search_ipo_by_name':
            return await this.toolHandlers.searchIPOByName(args);
          case 'get_market_overview':
            return await this.toolHandlers.getMarketOverview(args);
          case 'get_placing_result':
            return await this.toolHandlers.getPlacingResult(args);
          default:
            throw new Error(`未知的工具: ${name}`);
        }
      } catch (error: any) {
        console.error(`执行工具 ${name} 失败:`, error);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message || '未知错误',
              message: `执行工具 ${name} 失败`,
              timestamp: new Date().toISOString()
            }, null, 2)
          }]
        };
      }
    });

    this.server.onerror = (error) => {
      console.error('[MCP服务器错误]', error);
    };

    process.on('SIGINT', () => this.gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => this.gracefulShutdown('SIGTERM'));
  }

  private async gracefulShutdown(signal: string): Promise<void> {
    console.error(`收到 ${signal} 信号，正在关闭服务...`);
    try {
      NetworkLogger.logServerStop();
      await this.server.close();
      process.exit(0);
    } catch (error) {
      console.error('关闭服务时出错:', error);
      process.exit(1);
    }
  }

  public async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    NetworkLogger.logServerStart();
    console.error('港股新股信息MCP服务已启动，等待连接...');
    process.stdin.resume();
  }
}

async function main() {
  try {
    const server = new HKIPOMCPServer();
    await server.start();
  } catch (error) {
    console.error('启动MCP服务器失败:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('启动失败:', error);
  process.exit(1);
}); 
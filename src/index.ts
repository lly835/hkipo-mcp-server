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
        description: '港股新股信息MCP服务 - 提供实时的香港新股信息查询能力',
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
    // 列出工具
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      try {
        return {
          tools: tools,
        };
      } catch (error) {
        console.error('列出工具失败:', error);
        throw error;
      }
    });

    // 执行工具
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'list_active_ipos':
            return await this.toolHandlers.listActiveIPOs(args);

          case 'get_ipo_details':
            return await this.toolHandlers.getIPODetails(args);

          case 'get_allocation_info':
            return await this.toolHandlers.getAllocationInfo(args);

          case 'get_grey_market_data':
            return await this.toolHandlers.getGreyMarketData(args);

          case 'get_first_day_performance':
            return await this.toolHandlers.getFirstDayPerformance(args);

          case 'search_ipo_by_name':
            return await this.toolHandlers.searchIPOByName(args);

          case 'get_market_overview':
            return await this.toolHandlers.getMarketOverview(args);

          default:
            const errorMsg = `未知的工具: ${name}`;
            console.error(errorMsg);
            return {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  success: false,
                  error: errorMsg,
                  message: '工具不存在',
                }, null, 2)
              }]
            };
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

    // 改进错误处理
    this.server.onerror = (error) => {
      console.error('[MCP服务器错误]', error);
      // 不要在错误时退出，让服务继续运行
    };

    // 处理进程信号
    const gracefulShutdown = async (signal: string) => {
      console.error(`收到 ${signal} 信号，正在关闭服务...`);
      try {
        NetworkLogger.logServerStop();
        await this.server.close();
        console.error('MCP服务已安全关闭');
        process.exit(0);
      } catch (error) {
        console.error('关闭服务时出错:', error);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    
    // 捕获未处理的异常
    process.on('uncaughtException', (error) => {
      console.error('未捕获的异常:', error);
      // 不要退出，记录错误继续运行
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('未处理的Promise拒绝:', reason);
      // 不要退出，记录错误继续运行
    });
  }

  public async start(): Promise<void> {
    try {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      NetworkLogger.logServerStart();
      console.error('港股新股信息MCP服务已启动，等待连接...');
      
      // 保持进程运行
      process.stdin.resume();
      
    } catch (error) {
      console.error('连接MCP传输失败:', error);
      throw error;
    }
  }
}

// 启动服务器
async function main() {
  try {
    const server = new HKIPOMCPServer();
    await server.start();
  } catch (error) {
    console.error('启动MCP服务器失败:', error);
    process.exit(1);
  }
}

// 直接启动主程序
main().catch((error) => {
  console.error('启动失败:', error);
  process.exit(1);
}); 
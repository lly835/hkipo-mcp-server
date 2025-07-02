// 简化的日志工具，只输出到控制台

// 简单的日志接口
export interface NetworkLogData {
  method: string;
  url: string;
  responseStatus?: number;
  duration?: number;
  error?: string;
  timestamp: string;
}

// 简化的控制台日志记录器
export class NetworkLogger {
  static logRequestStart(method: string, url: string): string {
    const requestId = `req_${Date.now()}`;
    console.error(`🌐 ${method} ${url}`);
    return requestId;
  }

  static logRequestError(
    requestId: string,
    method: string,
    url: string,
    error: string
  ): void {
    console.error(`❌ ${method} ${url}: ${error}`);
  }

  static logToolError(toolName: string, error: string): void {
    console.error(`❌ 工具失败: ${toolName} - ${error}`);
  }

  static logServerStart(): void {
    console.error(`🚀 港股新股信息MCP服务已启动`);
  }

  static logServerStop(): void {
    console.error(`🛑 港股新股信息MCP服务已停止`);
  }
}

// 兼容性导出（保持现有代码不变）
export const logger = {
  info: (message: string, meta?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.error(`[${new Date().toTimeString().split(' ')[0]}] ℹ️  ${message}`, meta ? JSON.stringify(meta) : '');
    }
  },
  error: (message: string, meta?: any) => {
    console.error(`[${new Date().toTimeString().split(' ')[0]}] ❌ ${message}`, meta ? JSON.stringify(meta) : '');
  },
  warn: (message: string, meta?: any) => {
    console.error(`[${new Date().toTimeString().split(' ')[0]}] ⚠️  ${message}`, meta ? JSON.stringify(meta) : '');
  },
  debug: (message: string, meta?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.error(`[${new Date().toTimeString().split(' ')[0]}] 🐛 ${message}`, meta ? JSON.stringify(meta) : '');
    }
  }
}; 
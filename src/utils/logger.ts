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
  private static requestCounter = 0;

  /**
   * 记录网络请求开始
   */
  static logRequestStart(method: string, url: string): string {
    const requestId = `req_${++this.requestCounter}_${Date.now()}`;
    
    if (process.env.NODE_ENV === 'development') {
      console.error(`[${new Date().toTimeString().split(' ')[0]}] 🌐 ${method} ${url}`);
    }

    return requestId;
  }

  /**
   * 记录网络请求成功
   */
  static logRequestSuccess(
    requestId: string,
    method: string,
    url: string,
    responseStatus: number,
    duration?: number
  ): void {
    if (process.env.NODE_ENV === 'development') {
      const durationStr = duration ? ` (${duration}ms)` : '';
      console.error(`[${new Date().toTimeString().split(' ')[0]}] ✅ ${method} ${url} - ${responseStatus}${durationStr}`);
    }
  }

  /**
   * 记录网络请求失败
   */
  static logRequestError(
    requestId: string,
    method: string,
    url: string,
    error: string,
    responseStatus?: number,
    duration?: number
  ): void {
    const durationStr = duration ? ` (${duration}ms)` : '';
    const statusStr = responseStatus ? ` - ${responseStatus}` : '';
    console.error(`[${new Date().toTimeString().split(' ')[0]}] ❌ ${method} ${url}${statusStr}${durationStr}: ${error}`);
  }

  /**
   * 记录API解析错误
   */
  static logParseError(url: string, error: string): void {
    console.error(`[${new Date().toTimeString().split(' ')[0]}] 🔧 解析失败 ${url}: ${error}`);
  }

  /**
   * 记录工具调用
   */
  static logToolCall(toolName: string, args: any): void {
    if (process.env.NODE_ENV === 'development') {
      console.error(`[${new Date().toTimeString().split(' ')[0]}] 🔧 工具调用: ${toolName}`);
    }
  }

  /**
   * 记录工具调用成功
   */
  static logToolSuccess(toolName: string, duration?: number): void {
    if (process.env.NODE_ENV === 'development') {
      const durationStr = duration ? ` (${duration}ms)` : '';
      console.error(`[${new Date().toTimeString().split(' ')[0]}] ✅ 工具完成: ${toolName}${durationStr}`);
    }
  }

  /**
   * 记录工具调用失败
   */
  static logToolError(toolName: string, error: string): void {
    console.error(`[${new Date().toTimeString().split(' ')[0]}] ❌ 工具失败: ${toolName} - ${error}`);
  }

  /**
   * 记录服务器启动
   */
  static logServerStart(): void {
    console.error(`[${new Date().toTimeString().split(' ')[0]}] 🚀 港股新股信息MCP服务已启动`);
  }

  /**
   * 记录服务器停止
   */
  static logServerStop(): void {
    console.error(`[${new Date().toTimeString().split(' ')[0]}] 🛑 港股新股信息MCP服务已停止`);
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
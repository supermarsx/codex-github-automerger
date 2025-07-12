export const logger = {
  info: (...args: any[]) => console.log('[info]', ...args),
  error: (...args: any[]) => console.error('[error]', ...args)
};

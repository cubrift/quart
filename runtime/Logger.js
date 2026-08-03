const pino = require('pino');
const pretty = require('pino-pretty');

const logger = pino(
  { level: process.env.LOG_LEVEL || 'info' },
  isDev ? pretty({ colorize: true }) : undefined
);

function handleRejection(reason, promise) {
  const isAbort = 
    reason?.name === 'AbortError' || 
    reason?.message?.includes('aborted') || 
    reason?.code === 'ABORT_ERR';

  if (isAbort) {
    logger.info('Async task was cancelled via AbortSignal.');
    return; 
  }

  logger.error(reason, 'Unhandled rejection');
}

module.exports = {
  logger,
  handleRejection
}
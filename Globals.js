const pino = require('pino');
const pretty = require('pino-pretty');
const { program } = require('commander');

const { version } = require('./package.json');

const isDev = process.env.NODE_ENV !== 'production';

const logger = pino(
  { level: process.env.LOG_LEVEL || 'info' },
  isDev ? pretty({ colorize: true }) : undefined
);

function validateEnv() {
  const requiredEnvVars = ['OPENAI_API_KEY', 'GIPHY_API_KEY'];
  const missingVars = requiredEnvVars.filter(
    (key) => !process.env[key] || !process.env[key].trim()
  );

  if (missingVars.length > 0) {
    logger.error(`Missing required API configuration: ${missingVars.join(', ')}`);
    logger.error(`Please set the required environment variable(s) in your .env file.`);
    logger.error(`Refer to .env.example or README.md for configuration details.`);
    process.exit(1);
  }
}

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

function initialize() {
  validateEnv();
  process.on('unhandledRejection', handleRejection);

  program
    .name('quart')
    .description('An AI chatbot built for WhatsApp hosted using Baileys.')
    .version(version);
  
  program
    .option('-t, --terminal', 'display the QR in the terminal');
  
  program.parse(process.argv);
  return program.opts();
}

module.exports = {
  version,
  isDev,
  logger: logger.child({ module: 'quart' }),
  initialize,
};
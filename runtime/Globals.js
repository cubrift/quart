const { program } = require('commander');
const { version } = require('../package.json');
const { logger: rootLogger, handleRejection } = require('./Logger');

const logger = rootLogger.child({ module: 'quart' });

const shutdownStack = [];

function shutdown() {
  logger.info('Shutting down...');
  for (const shutdownFunc of shutdownStack) {
    if (!shutdownFunc) continue;
    try {
      shutdownFunc();
    } catch (err) {
      logger.error(err, 'Error during shutdown');
      process.exit(1);
    }
  }
  process.exit(0);
}

function validateEnv() {
  const requiredEnvVars = ['OPENAI_API_KEY', 'GIPHY_API_KEY'];
  const missingVars = requiredEnvVars.filter(
    (key) => !process.env[key] || !process.env[key].trim()
  );

  if (missingVars.length > 0) {
    logger.fatal(`Missing required API configuration: ${missingVars.join(', ')}`);
    logger.fatal(`Please set the required environment variable(s) in your .env file.`);
    logger.fatal(`Refer to .env.example or README.md for configuration details.`);
    process.exit(1);
  }
}

function initialize() {
  validateEnv();
  process.on('unhandledRejection', handleRejection);

  program
    .name('quart')
    .description('An AI chatbot built for WhatsApp hosted using Baileys.')
    .version(version);
  
  program
    .option('-t, --terminal', 'display the QR in the terminal')
    .option('-v, --verbose', 'enable verbose logging');

  program.parse(process.argv);
  const opts = program.opts();

  if (opts.verbose) {
    logger.level = 'debug';
  }

  return opts;
}

module.exports = {
  version,
  shutdownStack,
  logger,
  initialize,
  shutdown
};
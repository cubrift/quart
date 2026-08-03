const { program } = require('commander');
const { version } = require('../package.json');
const { logger, handleRejection } = require('./Logger');

const isDev = process.env.NODE_ENV !== 'production';

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
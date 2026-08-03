const { program } = require('commander');
const { version } = require('../package.json');
const { logger, handleRejection } = require('./Logger');

function validateEnv() {
  const requiredEnvVars = ['OPENAI_API_KEY', 'GIPHY_API_KEY', 'AUTH_DIR', 'DATABASE_PATH'];
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
    .option('-t, --terminal', 'display the QR in the terminal');
  
  program.parse(process.argv);
  return program.opts();
}

module.exports = {
  version,
  logger: logger.child({ module: 'quart' }),
  initialize,
};
const { intro, outro, text, select, confirm, cancel, isCancel, note } = require('@clack/prompts');
const { existsSync } = require('fs');
const { writeFile, unlink } = require('fs/promises');
const color = require('picocolors');

(async () => {
  intro(color.inverse('quart'));
  const openai = await text({
    message: 'What is the OPENAI_API_KEY for Quart?',
    placeholder: 'sk-proj-...',
    validate(value) {
      if (!value || value.length === 0) return 'Value is required!';
      if (!value.startsWith("sk-proj-")) return 'Invalid API key format!';
    },
  });
  if (isCancel(openai)) {
    return cancel('OpenAI API key is required to run Quart.');
  }
  const giphy = await text({
    message: 'What is the GIPHY_API_KEY for Quart?',
    validate(value) {
      if (!value || value.length === 0) return 'Value is required!';
    },
  });
  if (isCancel(giphy)) {
    return cancel('GIPHY API key is required to run Quart.');
  }
  if (existsSync('.env')) {
    const c = await confirm({
      message: 'A .env file already exists. Do you want to overwrite it?',
      initialValue: false,
    });
    if (!c) return;
    await unlink('.env');
  }
  await writeFile('.env', `OPENAI_API_KEY=${openai}\nGIPHY_API_KEY=${giphy}`);
  await note('npm link\nquart', 'Next steps.');
  outro('Thanks for checking out Quart!');
})();
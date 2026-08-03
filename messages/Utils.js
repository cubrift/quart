const { downloadMediaMessage } = require("baileys");

const getRealLid = lid => lid.replace(/:\d+@lid$/, '@lid');

async function extractImageData(msg) {
  const directImage = msg.message?.imageMessage;
  const quotedMessage =
    msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  const quotedImage = quotedMessage?.imageMessage;

  const imageMessage = directImage || quotedImage;

  if (!imageMessage) return null;

  const mediaMessage = directImage
    ? msg
    : { message: quotedMessage };

  const buffer = await downloadMediaMessage(
    mediaMessage,
    'buffer',
    {}
  );

  const mimeType = imageMessage.mimetype || 'image/jpeg';

  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

module.exports = {
  getRealLid,
  extractImageData
};
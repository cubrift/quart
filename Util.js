const { downloadMediaMessage } = require("baileys");

const getRealLid = lid => lid.replace(/:\d+@lid$/, '@lid');

async function extractImageData(msg) {
  const isImage = msg.message?.imageMessage;
  const quotedImage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

  if (!isImage && !quotedImage) return null;

  const buffer = await downloadMediaMessage(
    isImage ? msg : { message: quotedImage },
    'buffer',
    {}
  );

  const base64Image = `data:image/jpeg;base64,${buffer.toString('base64')}`;
  return base64Image;
}

module.exports = {
    getRealLid,
    extractImageData
};
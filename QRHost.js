const express = require('express');
const QRCode = require('qrcode');
const { logger } = require('./Globals');

const app = express();
const PORT = process.env.PORT || 3000;

let server = null;

let currentQrData = null;

app.get('/qr', async (req, res) => {
  if (!currentQrData) {
    return res.json({ qr: "about:blank" });
  }
  try {
    const qrImage = await QRCode.toDataURL(currentQrData, { type: "image/webp" });
    res.json({ qr: qrImage });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate QR' });
  }
});

function updateQRHost(qrData) {
  if (currentQrData) {
    currentQrData = qrData;
  }
  else {
    currentQrData = qrData;
    app.get('/', async (req, res) => {
      try {
        const qrImage = await QRCode.toDataURL(qrData);
        
        res.send(`<!DOCTYPE html>
<html>
  <head>
    <title>QR Code for Quart</title>
    <style>
      body {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        margin: 0;
        height: 100vh;
      }
      img {
        image-rendering: pixelated;
        border-radius: 8px;
        padding: 16px;
        background: white;
      }
    </style>
  </head>
  <body>
    <img width="500" src="${qrImage}" alt="QR Code" />
  </body>
  <script>
    async function fetchQr() {
      try {
        const res = await fetch('/qr');
        const { qr } = await res.json();

        if (qr) {
          document.body.innerHTML = \`<img width="500" src="\${qr}" alt="QR Code" />\`;
        }
      } catch (err) {
        console.error('Error fetching QR:', err);
      }
    }

    fetchQr();
    setInterval(fetchQr, 1000);
  </script>
</html>`);
      } catch (err) {
        res.status(500).send('Error generating QR Code');
      }
    });

    server = app.listen(PORT, () => {
      logger.info({ port: PORT }, 'QR Web Server running');
    });
  }
}

function stopQRHost() {
  if (server) {
    currentQrData = null;
    server.close(() => {
      logger.info('QR Web Server stopped');
    });
  }
}

module.exports = {
  updateQRHost,
  stopQRHost
}
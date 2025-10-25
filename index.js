const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
  
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false
  });

  // Pairing code request (8-digit)
  if (!sock.authState.creds.registered) {
    const phoneNumber = process.env.PHONE_NUMBER || ''; // Railway environment variable
    if (phoneNumber) {
      setTimeout(async () => {
        const code = await sock.requestPairingCode(phoneNumber);
        console.log('🔐 Pairing Code:', code);
      }, 3000);
    } else {
      console.log('⚠️ Phone number not provided. Set PHONE_NUMBER environment variable.');
    }
  }

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Connection closed. Reconnecting:', shouldReconnect);
      if (shouldReconnect) {
        startBot();
      }
    } else if (connection === 'open') {
      console.log('✅ Bot connected successfully!');
    }
  });

  sock.ev.on('creds.update', saveCreds);
  
  // Message handler
  sock.ev.on('messages.upsert', async ({messages}) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;
    
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
    console.log('Received:', text);
    
    if (text?.toLowerCase() === 'ping') {
      await sock.sendMessage(msg.key.remoteJid, { text: 'Pong! 🏓' });
    }
  });
}

startBot();

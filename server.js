const { Client, GatewayIntentBits } = require('discord.js');
const admin = require('firebase-admin');

// Load config from bot-config.js
const config = require('./bot-config.js');

// Firebase Admin setup
const serviceAccount = {
  type: config.FIREBASE_TYPE,
  project_id: config.FIREBASE_PROJECT_ID,
  private_key_id: config.FIREBASE_PRIVATE_KEY_ID,
  private_key: config.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  client_email: config.FIREBASE_CLIENT_EMAIL,
  client_id: config.FIREBASE_CLIENT_ID,
  auth_uri: config.FIREBASE_AUTH_URI,
  token_uri: config.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: config.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: config.FIREBASE_CLIENT_X509_CERT_URL
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: config.FIREBASE_DATABASE_URL
});

const db = admin.database();

// Discord Bot
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const DISCORD_BOT_TOKEN = config.DISCORD_BOT_TOKEN;
const DISCORD_CHANNEL_ID = config.DISCORD_CHANNEL_ID;

// Listen to Discord messages and send to Firebase
client.on('messageCreate', (message) => {
    if (message.channelId === DISCORD_CHANNEL_ID && !message.author.bot) {
        db.ref('messages').push({
            content: message.content,
            author: message.author.username,
            timestamp: Date.now(),
            source: 'discord'
        });
        console.log(`[Discord] ${message.author.username}: ${message.content}`);
    }
});

// Listen to Firebase messages and send to Discord
const messagesRef = db.ref('messages');
messagesRef.limitToLast(1).on('child_added', (snapshot) => {
    const messageData = snapshot.val();
    
    if (messageData.source === 'web' && DISCORD_CHANNEL_ID) {
        const channel = client.channels.cache.get(DISCORD_CHANNEL_ID);
        if (channel) {
            channel.send(messageData.content);
            console.log(`[Sent to Discord] ${messageData.content}`);
        }
    }
});

client.once('ready', () => {
    console.log(`🤖 Bot "${client.user.tag}" is online!`);
});

client.login(DISCORD_BOT_TOKEN);

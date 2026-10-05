const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { Client, GatewayIntentBits } = require('discord.js');

admin.initializeApp();
const db = admin.database();

// Discord Bot
const DISCORD_BOT_TOKEN = functions.config().discord.token;
const DISCORD_CHANNEL_ID = functions.config().discord.channel_id;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Initialize Discord bot
client.once('ready', () => {
    console.log(`Bot logged in as ${client.user.tag}`);
});

// Listen to Discord messages and send to Firebase
client.on('messageCreate', (message) => {
    if (message.channelId === DISCORD_CHANNEL_ID && !message.author.bot) {
        db.ref('messages').push({
            content: message.content,
            author: message.author.username,
            timestamp: Date.now(),
            source: 'discord'
        });
    }
});

// Login to Discord
if (DISCORD_BOT_TOKEN) {
    client.login(DISCORD_BOT_TOKEN);
}

// Listen to Firebase messages and send to Discord
exports.sendToDiscord = functions.database.ref('/messages/{pushId}')
    .onCreate((snapshot, context) => {
        const messageData = snapshot.val();
        
        if (messageData.source === 'web' && DISCORD_CHANNEL_ID) {
            const channel = client.channels.cache.get(DISCORD_CHANNEL_ID);
            if (channel) {
                return channel.send(messageData.content);
            }
        }
        return null;
    });

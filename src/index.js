// src/index.js
const { Client, GatewayIntentBits, Events } = require('discord.js');
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  NoSubscriberBehavior,
  getVoiceConnection,
  demuxProbe,
  entersState,
  VoiceConnectionStatus,
  AudioPlayerStatus
} = require('@discordjs/voice');
const fs = require('fs');
const dotenv = require('dotenv'); dotenv.config();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Player global (reutilizable)
const audioPlayer = createAudioPlayer({
  behaviors: { noSubscriber: NoSubscriberBehavior.Pause }
});

// Logs útiles para depurar reproducción
audioPlayer.on('stateChange', (oldS, newS) => {
  console.log(`🎚️ Player: ${oldS.status} -> ${newS.status}`);
});
audioPlayer.on('error', (err) => {
  console.error('💥 Audio player error:', err);
});

client.once('ready', () => {
  console.log(`✅ Zauron esta en Mordor como: ${client.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const { commandName } = interaction;

  if (commandName === 'ping') {
    return interaction.reply('Pong! 🏓');
  }

  if (commandName === 'joinleader') {
    const channelId = process.env.LEADER_CHANNEL_ID;
    if (!channelId) {
      return interaction.reply({ content: '❌ Falta LEADER_CHANNEL_ID en .env', ephemeral: true });
    }

    const connection = joinVoiceChannel({
      channelId,
      guildId: interaction.guildId,
      adapterCreator: interaction.guild.voiceAdapterCreator,
      selfDeaf: false, // para que no aparezca "Deafened"
      selfMute: false
    });

    try {
      // Esperamos a READY antes de suscribir
      await entersState(connection, VoiceConnectionStatus.Ready, 15_000);
      const sub = connection.subscribe(audioPlayer);
      console.log('✅ Voice READY. ¿Subcripción creada?', !!sub);
      return interaction.reply('✅ Me uní al canal Party Leader (READY).');
    } catch (e) {
      console.error('❌ No llegó a READY:', e);
      connection.destroy();
      return interaction.reply({ content: '❌ No pude estabilizar la conexión de voz (READY). Intenta de nuevo.', ephemeral: true });
    }
  }

  if (commandName === 'leave') {
    const connection = getVoiceConnection(interaction.guildId);
    if (connection) {
      connection.destroy();
      return interaction.reply('👋 Abandono la Tierra media');
    }
    return interaction.reply({ content: '❗ No estoy en ningún canal de voz.', ephemeral: true });
  }

  if (commandName === 'playtest') {
    const connection = getVoiceConnection(interaction.guildId);
    if (!connection) {
      return interaction.reply({ content: '❌ No estoy en un canal de voz. Usa /joinleader primero.', ephemeral: true });
    }

    try {
      await entersState(connection, VoiceConnectionStatus.Ready, 10_000);
    } catch {
      return interaction.reply({ content: '❌ La conexión no está lista. Prueba /joinleader otra vez.', ephemeral: true });
    }

    const filePath = 'assets/test.mp3';
    if (!fs.existsSync(filePath)) {
      return interaction.reply({ content: '❌ No encuentro assets/test.mp3', ephemeral: true });
    }

    // Demux robusto del MP3
    const inStream = fs.createReadStream(filePath);
    const { stream: probed, type } = await demuxProbe(inStream);
    const resource = createAudioResource(probed, { inputType: type });

    connection.subscribe(audioPlayer);
    audioPlayer.play(resource);

    // Opcional: esperar a "Playing" para confirmar
    try {
      await entersState(audioPlayer, AudioPlayerStatus.Playing, 5_000);
      console.log('▶️ Audio está sonando');
    } catch {
      console.warn('⚠️ El player no llegó a Playing a tiempo.');
    }

    return interaction.reply('🎵 Reproduciendo audio de prueba...');
  }

  if (commandName === 'stop') {
    audioPlayer.stop();
    return interaction.reply('⏹️ Audio detenido.');
  }
});

client.on('error', (err) => {
  console.error('❌ Error en el cliente:', err);
});

client.login(process.env.ZAURON_TOKEN);

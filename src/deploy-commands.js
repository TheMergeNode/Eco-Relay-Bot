// src/deploy-commands.js
const { REST, Routes } = require('discord.js');
const dotenv = require('dotenv'); dotenv.config();

const commands = [
  { name: 'ping',       description: 'Responde con Pong!' },
  { name: 'joinleader', description: 'Zauron se une al canal Party Leader' },
  { name: 'leave',      description: 'Zauron se sale del canal de voz actual' },
  { name: 'playtest',   description: 'Reproduce un audio de prueba (si ya estoy conectado)' },
  { name: 'stop',       description: 'Detiene el audio de prueba' }
];

async function main() {
  try {
    if (!process.env.ZAURON_TOKEN || !process.env.GUILD_ID) {
      throw new Error('Faltan ZAURON_TOKEN o GUILD_ID en el .env');
    }

    const rest = new REST({ version: '10' }).setToken(process.env.ZAURON_TOKEN);

    console.log('⌛ Registrando comandos (guild)...');

    const app = await rest.get(Routes.oauth2CurrentApplication());
    await rest.put(
      Routes.applicationGuildCommands(app.id, process.env.GUILD_ID),
      { body: commands }
    );

    console.log('✅ Comandos registrados en el guild con éxito.');
  } catch (error) {
    console.error('❌ Error registrando comandos:', error);
  }
}

main();

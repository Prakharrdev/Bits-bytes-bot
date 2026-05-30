const notion = require('../lib/notion');
const auth = require('../lib/auth');
const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMembers,
	]
});

client.once('ready', async () => {
	try {
		console.log('Bot is online. Debugging auth...');
		const guild = client.guilds.cache.get(process.env.GUILD_ID);
		if (!guild) {
			console.error('Guild not found:', process.env.GUILD_ID);
			process.exit(1);
		}

		// Let's debug for Noida and its lead
		const city = 'Noida';
		const leadDiscordId = '1116608716473638912'; // Aryan Chauhan
		
		console.log(`\n--- Debugging auth for City: "${city}" and User: "${leadDiscordId}" ---`);

		const fork = await notion.findForkByCity(city);
		if (!fork) {
			console.error(`Fork not found in Notion for city: ${city}`);
		} else {
			console.log('Fork found in Notion:', fork.id);
			console.log('Notion City Name:', notion.getCityName(fork));
			const extractedLeadId = notion.getLeadDiscordId(fork);
			console.log('Extracted Lead Discord ID from Notion:', extractedLeadId);
			console.log('Match with target user.id:', extractedLeadId === leadDiscordId);
		}

		console.log('\n--- Checking member in guild ---');
		const member = await guild.members.fetch(leadDiscordId).catch(err => {
			console.error('Failed to fetch guild member:', err.message);
			return null;
		});

		if (member) {
			console.log('Member found in guild:', member.user.tag);
			console.log('Roles in cache:', member.roles.cache.map(r => r.name));
			console.log('Admin:', member.permissions.has('Administrator'));
			console.log('ManageRoles:', member.permissions.has('ManageRoles'));
			console.log('Is Staff:', auth.isStaff(member, guild));
		}

		console.log('\n--- Running checkHierarchyAndStaff ---');
		const mockUser = { id: leadDiscordId };
		
		// Run auth checks
		const isAuthorized = await auth.isAuthorizedForCity(mockUser, city, guild);
		console.log(`\nRESULT: isAuthorizedForCity = ${isAuthorized}`);

		process.exit(0);
	} catch (err) {
		console.error('Error during debug:', err);
		process.exit(1);
	}
});

client.login(process.env.DISCORD_TOKEN);

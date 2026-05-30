const { REST, Routes } = require('discord.js');
require('dotenv').config();

if (!process.env.DISCORD_TOKEN) {
	console.error('Error: DISCORD_TOKEN is not set in .env');
	process.exit(1);
}

if (!process.env.GUILD_ID) {
	console.error('Error: GUILD_ID is not set in .env');
	process.exit(1);
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
	try {
		console.log(`Fetching roles for Guild: ${process.env.GUILD_ID}...`);
		const roles = await rest.get(Routes.guildRoles(process.env.GUILD_ID));
		
		console.log('\n--- Discord Guild Roles ---');
		roles.sort((a, b) => b.position - a.position);
		
		const roleList = roles.map(role => ({
			name: role.name,
			id: role.id,
			position: role.position,
			color: role.color.toString(16),
			hoist: role.hoist,
			managed: role.managed
		}));

		console.table(roleList);
	} catch (error) {
		console.error('Failed to fetch guild roles:', error);
	}
})();

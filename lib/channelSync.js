const { PermissionFlagsBits } = require('discord.js');
const notion = require('./notion');
const logger = require('./logger');
const { getStaffRole } = require('./auth');

/**
 * Synchronize permissions for a single city fork channel in all guild caches.
 * @param {Client} client - The Discord client
 * @param {Object} fork - The Notion fork object
 */
async function syncForkPermissions(client, fork) {
	const city = notion.getCityName(fork);
	const leadDiscordId = fork.properties?.['Discord ID']?.rich_text?.[0]?.text?.content;

	if (!city || city === 'UNKNOWN') return;

	const channelName = `gobitsnbytes-${city.toLowerCase().replace(/\s+/g, '-')}`;

	for (const [, guild] of client.guilds.cache) {
		const cityChannel = guild.channels.cache.find(c => c.name === channelName);
		if (!cityChannel) continue;

		logger.info(`[SYNC] Synchronizing permissions for #${channelName} in guild: ${guild.name}`);

		const { getForkLeadRole, isStaff } = require('./auth');
		const forkLeadRole = getForkLeadRole(guild);

		// 1. Fetch team members to compute desired state
		let teamMembers = [];
		try {
			teamMembers = await notion.getTeamMembers(fork.id);
		} catch (teamErr) {
			logger.warn(`[SYNC] Could not fetch team members for fork ${city}: ${teamErr.message}`);
		}

		const notionTeamDiscordIds = new Set(teamMembers.map(m => m.discordId).filter(Boolean));
		if (leadDiscordId) notionTeamDiscordIds.add(leadDiscordId);

		const cityRole = guild.roles.cache.find(r => r.name.toLowerCase() === city.toLowerCase());
		if (!cityRole) {
			logger.warn(`[SYNC] City role not found for ${city}`);
			continue;
		}

		// Ensure member cache is loaded
		await guild.members.fetch().catch(() => {});

		// Filter members who have the city role
		const cityMembers = guild.members.cache.filter(member => member.roles.cache.has(cityRole.id));

		const desiredPermissions = new Map();

		for (const [memberId, member] of cityMembers) {
			// Check if they have the Fork Lead role or are the registered Notion lead
			const hasForkLeadRole = forkLeadRole && member.roles.highest.position >= forkLeadRole.position;
			const isLeadInNotion = leadDiscordId === memberId;

			if (hasForkLeadRole || isLeadInNotion) {
				desiredPermissions.set(memberId, { type: 'admin', memberObj: member });
				continue;
			}

			// Check if they are a contributor (Staff/Contributor/Team role OR registered team member in Notion)
			const hasStaffRole = isStaff(member, guild);
			const hasContributorRole = member.roles.cache.some(r => 
				r.name.toLowerCase() === 'contributor' || 
				r.name.toLowerCase() === 'team' || 
				r.name.toLowerCase() === 'team member'
			);
			const isRegisteredTeamMember = notionTeamDiscordIds.has(memberId);

			if (hasStaffRole || hasContributorRole || isRegisteredTeamMember) {
				desiredPermissions.set(memberId, { type: 'member', memberObj: member });
			}
		}

		// Rebuild overwrites list
		const overwrites = [
			{
				id: guild.roles.everyone.id,
				deny: [PermissionFlagsBits.ViewChannel],
				type: 0 // Role
			}
		];

		// Add overwrites for each desired member
		for (const [memberId, config] of desiredPermissions) {
			if (config.type === 'admin') {
				overwrites.push({
					id: memberId,
					allow: [
						PermissionFlagsBits.ViewChannel,
						PermissionFlagsBits.SendMessages,
						PermissionFlagsBits.EmbedLinks,
						PermissionFlagsBits.AttachFiles,
						PermissionFlagsBits.ReadMessageHistory,
						PermissionFlagsBits.ManageMessages,
						PermissionFlagsBits.ManageChannels,
						PermissionFlagsBits.ManageWebhooks
					],
					type: 1 // Member
				});
				logger.info(`[SYNC]   -> Granted Admin access to <@${memberId}>`);
			} else {
				overwrites.push({
					id: memberId,
					allow: [
						PermissionFlagsBits.ViewChannel,
						PermissionFlagsBits.SendMessages,
						PermissionFlagsBits.EmbedLinks,
						PermissionFlagsBits.AttachFiles,
						PermissionFlagsBits.ReadMessageHistory
					],
					type: 1 // Member
				});
				logger.info(`[SYNC]   -> Granted Member access to <@${memberId}>`);
			}
		}

		await cityChannel.permissionOverwrites.set(overwrites, 'Self-healing channel permission synchronization');
	}
}

/**
 * Synchronize permissions for all active forks.
 * @param {Client} client - The Discord client
 */
async function syncAllForks(client) {
	try {
		const forks = await notion.getForks();
		const activeForks = forks.filter(f => f.properties?.Status?.select?.name === 'Active');
		logger.info(`[SYNC] Found ${activeForks.length} active forks in registry.`);

		for (const fork of activeForks) {
			await syncForkPermissions(client, fork);
		}
	} catch (err) {
		logger.error('[SYNC] Self-healing synchronization failed', err);
	}
}

module.exports = {
	syncForkPermissions,
	syncAllForks,
};

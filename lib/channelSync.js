const { PermissionFlagsBits, ChannelType } = require('discord.js');
const notion = require('./notion');
const logger = require('./logger');

/**
 * Synchronize permissions for a single city fork channel in all guild caches.
 * Also ensures that corresponding city roles and channels exist, and leads are role-assigned.
 * @param {Client} client - The Discord client
 * @param {Object} fork - The Notion fork object
 */
async function syncForkPermissions(client, fork) {
	const city = notion.getCityName(fork);
	const leadDiscordId = notion.getLeadDiscordId(fork);

	if (!city || city === 'UNKNOWN') return;

	const channelName = `gobitsnbytes-${city.toLowerCase().replace(/\s+/g, '-')}`;

	// Fetch team members once per fork
	let teamMembers = [];
	try {
		teamMembers = await notion.getTeamMembers(fork.id);
	} catch (teamErr) {
		logger.warn(`[SYNC] Could not fetch team members for fork ${city}: ${teamErr.message}`);
	}

	const notionTeamDiscordIds = new Set(
		teamMembers
			.map(m => m.discordId ? m.discordId.replace(/\D/g, '') : null)
			.filter(Boolean)
	);
	if (leadDiscordId) notionTeamDiscordIds.add(leadDiscordId);

	for (const [, guild] of client.guilds.cache) {
		const { getForkLeadRole, getStaffRole, isStaff } = require('./auth');
		const forkLeadRole = getForkLeadRole(guild);
		const staffRole = getStaffRole(guild);

		// 1. Ensure the City Roles exist in the guild
		let cityRole = guild.roles.cache.find(r => r.name.toLowerCase() === city.toLowerCase());
		if (!cityRole) {
			try {
				logger.info(`[SYNC] City role for "${city}" not found. Creating...`);
				cityRole = await guild.roles.create({
					name: city,
					reason: `Automated sync: Missing city role for active fork ${city}`
				});
			} catch (err) {
				logger.error(`[SYNC] Failed to create city role "${city}":`, err.message);
			}
		}

		let contributorCityRole = guild.roles.cache.find(r => r.name.toLowerCase() === `contributor-${city.toLowerCase()}`);
		if (!contributorCityRole) {
			try {
				logger.info(`[SYNC] Contributor city role for "contributor-${city}" not found. Creating...`);
				contributorCityRole = await guild.roles.create({
					name: `contributor-${city}`,
					reason: `Automated sync: Missing contributor city role for active fork ${city}`
				});
			} catch (err) {
				logger.error(`[SYNC] Failed to create contributor city role "contributor-${city}":`, err.message);
			}
		}

		let contributorRole = guild.roles.cache.find(r => r.name.toLowerCase() === 'contributor');
		if (!contributorRole) {
			try {
				logger.info(`[SYNC] Contributor role "contributor" not found. Creating...`);
				contributorRole = await guild.roles.create({
					name: 'contributor',
					reason: `Automated sync: Missing general contributor role`
				});
			} catch (err) {
				logger.error(`[SYNC] Failed to create contributor role:`, err.message);
			}
		}

		// Ensure member cache is loaded
		await guild.members.fetch().catch(() => {});

		// 2. Ensure the Fork Lead has the @fork-lead, contributor, contributor-city, and city roles assigned
		if (leadDiscordId && cityRole && contributorCityRole && contributorRole) {
			try {
				const leadMember = guild.members.cache.get(leadDiscordId);
				if (leadMember) {
					const hasForkLead = forkLeadRole ? leadMember.roles.cache.has(forkLeadRole.id) : false;
					const hasCityRole = leadMember.roles.cache.has(cityRole.id);
					const hasContribCityRole = leadMember.roles.cache.has(contributorCityRole.id);
					const hasContributor = leadMember.roles.cache.has(contributorRole.id);

					if (forkLeadRole && !hasForkLead) {
						await leadMember.roles.add(forkLeadRole).catch(err => {
							logger.warn(`[SYNC] Failed to assign @fork-lead role to lead: ${err.message}`);
						});
					}
					if (!hasCityRole) {
						await leadMember.roles.add(cityRole).catch(err => {
							logger.warn(`[SYNC] Failed to assign city role to lead: ${err.message}`);
						});
					}
					if (!hasContribCityRole) {
						await leadMember.roles.add(contributorCityRole).catch(err => {
							logger.warn(`[SYNC] Failed to assign contributor-city role to lead: ${err.message}`);
						});
					}
					if (!hasContributor) {
						await leadMember.roles.add(contributorRole).catch(err => {
							logger.warn(`[SYNC] Failed to assign contributor role to lead: ${err.message}`);
						});
					}
				}
			} catch (err) {
				logger.error(`[SYNC] Failed to assign roles to lead <@${leadDiscordId}>:`, err.message);
			}
		}

		// Ensure all registered team members have the roles assigned
		for (const memberId of notionTeamDiscordIds) {
			if (memberId === leadDiscordId) continue;
			try {
				const memberObj = guild.members.cache.get(memberId);
				if (memberObj) {
					const hasCityRole = cityRole ? memberObj.roles.cache.has(cityRole.id) : false;
					const hasContribCityRole = contributorCityRole ? memberObj.roles.cache.has(contributorCityRole.id) : false;
					const hasContributor = contributorRole ? memberObj.roles.cache.has(contributorRole.id) : false;

					if (cityRole && !hasCityRole) {
						logger.info(`[SYNC] Team member <@${memberId}> is missing city role "${city}". Assigning...`);
						await memberObj.roles.add(cityRole).catch(err => {
							logger.warn(`[SYNC] Failed to assign city role "${city}" to team member <@${memberId}>: ${err.message}`);
						});
					}
					if (contributorCityRole && !hasContribCityRole) {
						logger.info(`[SYNC] Team member <@${memberId}> is missing contributor city role "contributor-${city}". Assigning...`);
						await memberObj.roles.add(contributorCityRole).catch(err => {
							logger.warn(`[SYNC] Failed to assign contributor city role to team member <@${memberId}>: ${err.message}`);
						});
					}
					if (contributorRole && !hasContributor) {
						logger.info(`[SYNC] Team member <@${memberId}> is missing contributor role. Assigning...`);
						await memberObj.roles.add(contributorRole).catch(err => {
							logger.warn(`[SYNC] Failed to assign contributor role to team member <@${memberId}>: ${err.message}`);
						});
					}
				}
			} catch (err) {
				logger.error(`[SYNC] Failed to assign roles to team member <@${memberId}>:`, err.message);
			}
		}

		// Remove contributor city role from members who are not in the team and are not the lead/staff
		if (contributorCityRole) {
			const membersWithContribCityRole = guild.members.cache.filter(m => m.roles.cache.has(contributorCityRole.id));
			for (const [memberId, memberObj] of membersWithContribCityRole) {
				const isLead = leadDiscordId === memberId;
				const isTeamMember = notionTeamDiscordIds.has(memberId);
				const isStaffMember = isStaff(memberObj, guild);

				if (!isLead && !isTeamMember && !isStaffMember) {
					logger.info(`[SYNC] User <@${memberId}> has contributor city role "contributor-${city}" but is not in the team or lead. Removing role...`);
					await memberObj.roles.remove(contributorCityRole).catch(err => {
						logger.warn(`[SYNC] Failed to remove contributor city role "contributor-${city}" from <@${memberId}>: ${err.message}`);
					});
				}
			}
		}

		// 3. Ensure the City Channel exists
		let cityChannel = guild.channels.cache.find(c => c.name === channelName);
		if (!cityChannel) {
			logger.info(`[SYNC] Channel #${channelName} not found. Creating...`);
			try {
				const category = guild.channels.cache.find(c => c.name === 'FORKS' && c.type === ChannelType.GuildCategory);
				cityChannel = await guild.channels.create({
					name: channelName,
					type: ChannelType.GuildText,
					parent: category ? category.id : null,
					reason: `Automated sync: Missing channel for active fork ${city}`
				});
			} catch (err) {
				logger.error(`[SYNC] Failed to create channel #${channelName}:`, err.message);
				continue;
			}
		}

		logger.info(`[SYNC] Synchronizing permissions for #${channelName} in guild: ${guild.name}`);

		const overwrites = [
			{
				id: guild.roles.everyone.id,
				deny: [PermissionFlagsBits.ViewChannel],
				type: 0 // Role
			}
		];

		if (contributorCityRole) {
			overwrites.push({
				id: contributorCityRole.id,
				allow: [
					PermissionFlagsBits.ViewChannel,
					PermissionFlagsBits.SendMessages,
					PermissionFlagsBits.EmbedLinks,
					PermissionFlagsBits.AttachFiles,
					PermissionFlagsBits.ReadMessageHistory
				],
				type: 0 // Role
			});
		}

		if (staffRole) {
			overwrites.push({
				id: staffRole.id,
				allow: [
					PermissionFlagsBits.ViewChannel,
					PermissionFlagsBits.SendMessages,
					PermissionFlagsBits.EmbedLinks,
					PermissionFlagsBits.AttachFiles,
					PermissionFlagsBits.ReadMessageHistory,
					PermissionFlagsBits.ManageMessages,
					PermissionFlagsBits.ManageWebhooks
				],
				type: 0 // Role
			});
		}

		if (leadDiscordId) {
			overwrites.push({
				id: leadDiscordId,
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

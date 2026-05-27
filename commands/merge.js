const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const notion = require('../lib/notion');
const config = require('../config');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('merge')
		.setDescription('Officially onboard a new fork lead.')
		.addUserOption(option => option.setName('user').setDescription('The user to merge').setRequired(true))
		.addStringOption(option => option.setName('city').setDescription('The city for the fork').setRequired(true))
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

	async execute(interaction) {
		const user = interaction.options.getUser('user');
		const city = interaction.options.getString('city');
		const guild = interaction.guild;

		const flags = config.PRIVACY.merge ? [MessageFlags.Ephemeral] : [];
		await interaction.deferReply({ flags });

		try {
			// 1. Check for existing active fork
			const existingFork = await notion.findForkByCity(city);
			if (existingFork && existingFork.properties?.Status?.select?.name === 'Active') {
				const existingDiscordId = existingFork.properties?.['Discord ID']?.rich_text?.[0]?.text?.content;
				if (existingDiscordId && existingDiscordId !== user.id) {
					const flags = config.PRIVACY.merge ? [MessageFlags.Ephemeral] : [];
					return await interaction.editReply({
						content: `❌ An active fork for **${city}** already exists.`,
						flags
					});
				}
			}

			// 2. Assign @fork-lead role
			const { getForkLeadRole, getStaffRole } = require('../lib/auth');
			const forkLeadRole = getForkLeadRole(guild);
			if (!forkLeadRole) throw new Error('@fork-lead role not found in server.');
			
			const member = await guild.members.fetch(user.id);
			let roleAssigned = true;
			try {
				await member.roles.add(forkLeadRole);
			} catch (roleErr) {
				console.error('[MERGE] Failed to assign fork-lead role (hierarchy/permissions check):', roleErr.message);
				roleAssigned = false;
			}

			// Resolve or create contributor role
			let contributorRole = guild.roles.cache.get('1506019068132462804') || guild.roles.cache.find(r => r.name.toLowerCase() === 'contributor');
			if (!contributorRole) {
				try {
					contributorRole = await guild.roles.create({
						name: 'contributor',
						reason: 'Merge onboarding general contributor role creation'
					});
				} catch (err) {
					console.error('[MERGE] Failed to create contributor role:', err.message);
				}
			}
			if (contributorRole) {
				try {
					await member.roles.add(contributorRole);
				} catch (roleErr) {
					console.error('[MERGE] Failed to assign contributor role:', roleErr.message);
				}
			}

			// Resolve or create contributor city role
			let contributorCityRole = guild.roles.cache.find(r => r.name.toLowerCase() === `contributor-${city.toLowerCase()}`);
			if (!contributorCityRole) {
				try {
					contributorCityRole = await guild.roles.create({
						name: `contributor-${city}`,
						reason: 'Merge onboarding contributor city role creation'
					});
				} catch (err) {
					console.error(`[MERGE] Failed to create contributor city role "contributor-${city}":`, err.message);
				}
			}
			if (contributorCityRole) {
				try {
					await member.roles.add(contributorCityRole);
				} catch (roleErr) {
					console.error(`[MERGE] Failed to assign contributor city role (${city}):`, roleErr.message);
					roleAssigned = false;
				}
			}

			// Resolve or create city role
			let cityRole = guild.roles.cache.find(r => r.name.toLowerCase() === city.toLowerCase());
			if (!cityRole) {
				try {
					cityRole = await guild.roles.create({
						name: city,
						reason: 'Merge onboarding city role creation'
					});
				} catch (err) {
					console.error(`[MERGE] Failed to create city role "${city}":`, err.message);
				}
			}
			if (cityRole) {
				try {
					await member.roles.add(cityRole);
				} catch (roleErr) {
					console.error(`[MERGE] Failed to assign city role (${city}):`, roleErr.message);
				}
			}

			// 3. Update Notion
			const fork = await notion.findForkByCity(city);
			if (fork) {
				await notion.updateForkStatus(fork.id, 'Active', user.id);
			}

			// 4. Create/Setup City Channel
			const category = guild.channels.cache.find(c => c.name === 'FORKS' && c.type === ChannelType.GuildCategory);
			const channelName = `gobitsnbytes-${city.toLowerCase().replace(/\s+/g, '-')}`;
			
			const overwrites = [
				{ id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] }
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
					]
				});
			}

			overwrites.push({
				id: user.id,
				allow: [
					PermissionFlagsBits.ViewChannel,
					PermissionFlagsBits.SendMessages,
					PermissionFlagsBits.EmbedLinks,
					PermissionFlagsBits.AttachFiles,
					PermissionFlagsBits.ReadMessageHistory,
					PermissionFlagsBits.ManageMessages,
					PermissionFlagsBits.ManageChannels,
					PermissionFlagsBits.ManageWebhooks
				]
			});

			const staffRole = getStaffRole(guild);
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
					]
				});
			}

			let channel = guild.channels.cache.find(c => c.name === channelName);
			if (!channel) {
				channel = await guild.channels.create({
					name: channelName,
					type: ChannelType.GuildText,
					parent: category ? category.id : null,
					permissionOverwrites: overwrites
				});
			} else {
				await channel.permissionOverwrites.set(overwrites);
			}

			const successEmbed = new EmbedBuilder()
				.setTitle(`${config.EMOJIS.protocol} PROTOCOL_MERGE // ACCESS_KEY_GENERATED`)
				.setDescription(`Synchronization complete. Credentials assigned to member: **<@${user.id}>**.`)
				.addFields(
					{ name: '⌬ NODE_LOCATION', value: `\`${city.toUpperCase()}\``, inline: true },
					{ name: '⌬ SYSTEM_ID', value: `\`${channelName.toUpperCase()}\``, inline: true }
				);

			if (!roleAssigned) {
				successEmbed.addFields({ name: 'Warning: Role Assignment', value: `The bot could not assign the **@fork-lead** role automatically because the bot's highest role is below the **@fork-lead** role in the server settings hierarchy. Please assign the role to <@${user.id}> manually.`, inline: false });
			}

			successEmbed.setColor(config.COLORS.success)
				.setThumbnail(interaction.guild.iconURL())
				.setTimestamp()
				.setFooter({ text: config.BRANDING.footerText });

			const handbookButton = new ButtonBuilder()
				.setLabel(config.BRANDING.documentationLabel)
				.setURL('https://www.notion.so/33949ed2fc33818ba073ffa2d815bf1a?v=33949ed2fc3380ccbfe2000c860aa29a&source=copy_link')
				.setStyle(ButtonStyle.Link);

			const row = new ActionRowBuilder().addComponents(handbookButton);

			await interaction.editReply({ embeds: [successEmbed], components: [row] });

			// Announce new fork to announcements channel
			try {
				const announcementChannel = await guild.channels.fetch('1490415427409412376');
				if (announcementChannel) {
					const capitalizedCity = city.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
					await announcementChannel.send(`**Bits&Bytes ${capitalizedCity}** is now live! Led by <@${user.id}>`);
				}
			} catch (error) {
				console.warn('[MERGE] Could not send announcement:', error.message);
			}

			// 5. Trigger self-healing permissions sync immediately
			try {
				const { syncForkPermissions } = require('../lib/channelSync');
				const updatedFork = await notion.findForkByCity(city);
				if (updatedFork) {
					await syncForkPermissions(guild.client, updatedFork);
				}
			} catch (syncErr) {
				console.warn('[MERGE] Permission sync fail:', syncErr.message);
			}

		} catch (error) {
			console.error('[MERGE] Error:', error);
			await interaction.editReply('❌ There was an error while merging the fork lead.');
		}
	},
};

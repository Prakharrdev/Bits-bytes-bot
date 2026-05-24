const { Events } = require('discord.js');
const meetingsDb = require('../lib/meetingsDb');

module.exports = {
	name: Events.VoiceStateUpdate,
	async execute(oldState, newState) {
		const oldChannelId = oldState.channelId;
		const newChannelId = newState.channelId;

		// ── User joined a voice channel ──
		if (newChannelId && newChannelId !== oldChannelId) {
			try {
				if (process.env.RECORDING_ENABLED === 'true') {
					const { isRecording, getMeetingIdByChannel, handleUserJoin } = require('../lib/voiceRecorder');
					const meetingId = getMeetingIdByChannel(newChannelId);
					if (meetingId && !newState.member?.user?.bot) {
						handleUserJoin(meetingId, newState.member);
					}
				}
			} catch (err) {
				console.error('[MEETING] Error handling voice join for recording:', err.message);
			}
		}

		// ── User left a voice channel ──
		if (oldChannelId && oldChannelId !== newChannelId) {
			const oldChannel = oldState.channel;
			if (!oldChannel) return;

			// Notify recorder of user leave
			try {
				if (process.env.RECORDING_ENABLED === 'true') {
					const { isRecording, getMeetingIdByChannel, handleUserLeave } = require('../lib/voiceRecorder');
					const meetingId = getMeetingIdByChannel(oldChannelId);
					if (meetingId && !oldState.member?.user?.bot) {
						handleUserLeave(meetingId, oldState.member);
					}
				}
			} catch (err) {
				console.error('[MEETING] Error handling voice leave for recording:', err.message);
			}

			// If the voice channel is now empty (no non-bot members)
			const humanMembers = oldChannel.members.filter(m => !m.user.bot);
			if (humanMembers.size === 0) {
				try {
					const meeting = await meetingsDb.findMeetingByTempChannel(oldChannelId);

					if (meeting && (meeting.status === 'active' || meeting.status === 'scheduled')) {
						console.log(`[MEETING] Temporary VC ${oldChannel.name} (${oldChannelId}) is now empty.`);

						// Stop recording and queue transcription BEFORE deleting the channel
						if (process.env.RECORDING_ENABLED === 'true') {
							try {
								const { stopRecording } = require('../lib/voiceRecorder');
								const { queueTranscription } = require('../lib/transcriptionPipeline');
								const recordingData = await stopRecording(meeting.id);
								if (recordingData) {
									queueTranscription(meeting, recordingData, oldState.client).catch(err => {
										console.error(`[MEETING] Transcription pipeline error for ${meeting.id}:`, err);
									});
								}
							} catch (recErr) {
								console.error(`[MEETING] Error stopping recording for ${meeting.id}:`, recErr);
							}
						}

						// Delete the temp VC
						await oldChannel.delete('Temporary meeting VC has ended (all users left).').catch(err => {
							console.error(`[MEETING ERROR] Failed to delete temporary VC:`, err.message);
						});

						// Mark meeting as completed
						await meetingsDb.updateMeetingStatus(meeting.id, 'completed');
						console.log(`[MEETING] Meeting "${meeting.title}" (${meeting.id}) marked as completed.`);
					}
				} catch (error) {
					console.error('[MEETING ERROR] Error checking temporary VC status:', error);
				}
			}
		}
	}
};

const notion = require('../lib/notion');

async function runTests() {
	console.log('🧪 Starting SQLite Operational Database Tests...');
	const mockForkId = 'mock_fork_page_123';

	try {
		// 1. Clean up any existing test data (direct query to ensure fresh state)
		console.log('🧹 Cleaning up old test data...');
		const sqlite3 = require('sqlite3').verbose();
		const path = require('path');
		const db = new sqlite3.Database(path.resolve(__dirname, '../data/bot.db'));
		await new Promise((resolve) => {
			db.run(`DELETE FROM team_members WHERE fork_id = ?`, [mockForkId], () => {
				db.run(`DELETE FROM events WHERE fork_id = ?`, [mockForkId], () => {
					db.run(`DELETE FROM reports WHERE fork_id = ?`, [mockForkId], () => {
						db.close();
						resolve();
					});
				});
			});
		});

		// 2. Test Add Team Member
		console.log('➡️ Testing addTeamMember...');
		const member1 = await notion.addTeamMember(mockForkId, '1234567890', 'Tech Lead', 'Alice');
		const member2 = await notion.addTeamMember(mockForkId, '0987654321', 'Ops Lead', 'Bob');
		console.log(`✅ Members added. IDs: ${member1.id}, ${member2.id}`);

		// 3. Test Find Team Member
		console.log('➡️ Testing findTeamMember...');
		const found = await notion.findTeamMember(mockForkId, '1234567890');
		if (!found) throw new Error('Could not find member Alice!');
		console.log('✅ Found member:', found.properties.Name.title[0].text.content);
		if (found.properties.Role.select.name !== 'Tech Lead') throw new Error('Role mismatch!');

		// 4. Test Get Team Members
		console.log('➡️ Testing getTeamMembers...');
		const members = await notion.getTeamMembers(mockForkId);
		console.log(`✅ Fetched ${members.length} team members.`);
		if (members.length !== 2) throw new Error(`Expected 2 members, got ${members.length}`);

		// 5. Test Update Team Member
		console.log('➡️ Testing updateTeamMember...');
		await notion.updateTeamMember(member1.id, 'Creative Lead', 'Alice Updated');
		const updated = await notion.findTeamMember(mockForkId, '1234567890');
		console.log('✅ Updated member name:', updated.properties.Name.title[0].text.content);
		if (updated.properties.Role.select.name !== 'Creative Lead') throw new Error('Update role failed!');

		// 6. Test Remove Team Member
		console.log('➡️ Testing removeTeamMember...');
		await notion.removeTeamMember(member2.id);
		const postRemoveMembers = await notion.getTeamMembers(mockForkId);
		console.log(`✅ Members after deletion: ${postRemoveMembers.length}`);
		if (postRemoveMembers.length !== 1) throw new Error('Deletion failed!');

		// 7. Test Create Event
		console.log('➡️ Testing createEvent...');
		const event = await notion.createEvent({
			title: 'Hackathon 2026',
			forkId: mockForkId,
			date: '2026-06-01',
			type: 'Hackathon',
			description: 'Annual hackathon',
			createdBy: 'system'
		});
		console.log(`✅ Event created. ID: ${event.id}`);

		// 8. Test Get Events
		console.log('➡️ Testing getEvents...');
		const events = await notion.getEvents(mockForkId, 'Idea');
		console.log(`✅ Fetched ${events.length} events.`);
		if (events.length !== 1) throw new Error('Event get failed!');
		if (events[0].title !== 'Hackathon 2026') throw new Error('Event title mismatch!');

		// 9. Test Update Event
		console.log('➡️ Testing updateEvent...');
		await notion.updateEvent(event.id, {
			status: 'Completed',
			attendees: 42
		});
		const eventsCompleted = await notion.getEvents(mockForkId, 'Completed');
		console.log(`✅ Fetched completed events: ${eventsCompleted.length}`);
		if (eventsCompleted.length !== 1) throw new Error('Event update failed!');
		if (eventsCompleted[0].actualAttendees !== 42) throw new Error('Attendees mismatch!');

		// 10. Test Create Report
		console.log('➡️ Testing createReport...');
		const report = await notion.createReport({
			forkId: mockForkId,
			type: 'Monthly',
			isLate: false,
			notes: 'All going perfectly.',
			attachmentUrl: 'https://google.com'
		});
		console.log(`✅ Report created. ID: ${report.id}`);

		// 11. Test Get Reports
		console.log('➡️ Testing getReports...');
		const reports = await notion.getReports(mockForkId);
		console.log(`✅ Fetched ${reports.length} reports.`);
		if (reports.length !== 1) throw new Error('Report get failed!');
		if (reports[0].status !== 'on-time') throw new Error('Report status mismatch!');

		console.log('\n🌟🌟 ALL TESTS PASSED SUCCESSFULLY! 🌟🌟');
		process.exit(0);

	} catch (error) {
		console.error('\n❌ TEST RUN FAILED WITH ERROR:', error);
		process.exit(1);
	}
}

runTests();

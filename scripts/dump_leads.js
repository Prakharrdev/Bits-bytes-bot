const notion = require('../lib/notion');

(async () => {
	try {
		console.log('Fetching active/pending forks...');
		const forks = await notion.getForks();
		console.log(`Found ${forks.length} forks.`);
		forks.forEach(f => {
			const city = notion.getCityName(f);
			const leadName = f.properties?.["What's your name?"]?.rich_text?.[0]?.text?.content || 'Unknown';
			const discordIdField = f.properties?.['Discord ID']?.rich_text?.[0]?.text?.content || 'Not set';
			const status = f.properties?.['Status']?.select?.name || 'Unknown';
			
			console.log(`City: ${city.padEnd(15)} | Lead Name: ${leadName.padEnd(20)} | Discord ID: ${discordIdField.padEnd(20)} | Status: ${status}`);
		});
	} catch (err) {
		console.error('Error fetching leads:', err.message);
	}
})();

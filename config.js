/**
 * 🛰️ BITS&BYTES PROTOCOL - ELITE CONFIGURATION ENGINE
 * Version: 2.0.0 (Tactical Overhaul)
 */

module.exports = {
	// 🎨 TACTICAL PALETTE (Elite Tech Aesthetic - Clean & Professional)
	COLORS: {
		primary: '#97192c',    // Brand Pink / Burgundy Core
		secondary: '#120f0a',  // Brand Ink
		success: '#23a55a',    // Modern Emerald/Mint
		warning: '#ffae24',    // Brand Amber
		error: '#f04438',      // Destructive Red
		neutral: '#ff7a1b',    // Brand Coral (Accent)
	},

	// ⚛️ TACTICAL ICONOGRAPHY (Clean & Minimalist)
	EMOJIS: {
		protocol: '',          // Clean / No emoji
		node: '▪',             // Clean square bullet
		active: '🟢',          // Simple status dot
		pending: '🟡',         // Simple status dot
		archived: '📦',        // Archive box
		pulse: '⚡',           // Pulse/Activity
		save: '💾',            // Save
		help: '❓',            // Help
		link: '🔗',           // Link
		success: '🟢',         // Success
		warning: '🟡',         // Warning
		error: '🔴',           // Error
		health: '📈',          // Health
		team: '👥',            // Team
		event: '📅',           // Event
		report: '📝',          // Report
		badge: '🏆',           // Badge
		reminder: '🔔',        // Reminder
		onboarding: '📋',      // Onboarding
		leaderboard: '🏆',     // Leaderboard
		points: '⭐',          // Points
		calendar: '📅',        // Calendar
		city: '📍',            // City
		github: '💻',          // GitHub
		website: '🌐',         // Website
		partnership: '🤝',     // Partnership
	},

	// 📄 PROTOCOL BRANDING
	BRANDING: {
		footerText: 'BITS&BYTES // SECURE_PROTOCOL_V2.0.0',
		documentationLabel: 'Bits&Bytes Wiki →',
	},

	// 🖥️ SYSTEM INTERFACE SETTINGS
	UI: {
		useServerIcon: true,    // Identity verification
		terminalStyle: true,    // Tactical monospace interface
		minimalist: true,       // Strip unnecessary fluff
	},

	// 🛡️ SECURITY & PRIVACY MANAGEMENT
	// Set any command to 'false' to make its output public to the channel.
	// Set to 'true' to make it visible only to the user (ephemeral).
	PRIVACY: {
		// Original commands
		forks: true,
		help: true,
		pulse: true,
		archive: true,
		merge: true,
		'fork-request': true,
		'view-forks': false,
		// New Phase 1 commands
		'fork-health': false,      // Public - shows network health
		'team-update': true,       // Private - team management
		'team-view': false,        // Public - shows team structure
		'fork-status': false,      // Public - shows fork dashboard
		// New Phase 2 commands
		'report-submit': true,     // Private - report submission
		'report-status': false,    // Public - shows report status
		'event-create': true,      // Private - event creation
		'event-update': true,      // Private - event updates
		'event-status': false,     // Public - shows event pipeline
		'event-calendar': false,   // Public - shows network calendar
		'onboarding-status': false,// Public - shows onboarding progress
		'onboarding-complete': true,// Private - staff command
		// New Phase 3 commands
		leaderboard: false,        // Public - shows points leaderboard
		'fork-badges': false,      // Public - shows achievements
		'meet-email': true,        // Ephemeral - email registration
		'meet-schedule': true      // Ephemeral - meeting scheduler
	}
};

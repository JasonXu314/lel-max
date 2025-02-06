export const COLORS = {
	CONTROL: {
		LIGHT: '#FFBF00',
		DARK: '#D9A200'
	},
	DATA: {
		LIGHT: '#FF8C1A',
		DARK: '#D36900'
	},
	CONDITION: {
		LIGHT: '#59C059',
		DARK: '#3A993A'
	},
	SYSTEM: {
		LIGHT: '#5CB1D6',
		DARK: '#2E8EB7'
	},
	SPECIAL: {
		HIGHLIGHT: 'rgba(200, 200, 255, 0.75)',
		OUTLINE: 'black'
	}
} as const;

export type BlockClass = keyof typeof COLORS;


export const COLORS = {
	CONTROL: {
		LIGHT: '#FFBF00',
		DARK: '#D9A200'
	},
	DATA: {
		LIGHT: '#FF8C1A',
		DARK: '#D36900'
	},
	VALUE: {
		LIGHT: '#59C059',
		DARK: '#3A993A'
	},
	SPECIAL: {
		HIGHLIGHT: 'rgba(200, 200, 255, 0.75)',
		OUTLINE: 'black'
	}
} as const;

export type BlockClass = Exclude<keyof typeof COLORS, 'SPECIAL'>;

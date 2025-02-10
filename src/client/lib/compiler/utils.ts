// source: https://en.cppreference.com/w/cpp/language/operator_precedence
export enum OperatorPrecedence {
	SCOPE_RESOLUTION = 1,

	POSTFIX_INC = 2,
	POSTFIX_DEC = 2,
	FUNC_CAST = 2,
	FUNC_CALL = 2,
	SUBSCRIPT = 2,
	MEMBER_ACCESS = 2,

	PREFIX_INC = 3,
	PREFIX_DEC = 3,
	UN_PLUS = 3,
	UN_MINUS = 3,
	BOOL_NOT = 3,
	BIT_NOT = 3,
	C_CAST = 3,
	PTR_DEREF = 3,
	ADDROF = 3,
	SIZEOF = 3,
	NEW = 3,
	DELETE = 3,

	PTR_TO_MEMBER = 4,

	MULT = 5,
	DIV = 5,
	MOD = 5,

	ADD = 6,
	SUB = 6,

	LSHIFT = 7,
	RSHIFT = 7,

	SPACESHIP = 8,

	LT = 9,
	LTE = 9,
	GTE = 9,
	GT = 9,

	EQ = 10,
	NEQ = 10,

	BIT_AND = 11,

	BIT_XOR = 12,

	BIT_OR = 13,

	BOOL_AND = 14,

	BOOL_OR = 15,

	TERNARY_COND = 16,
	THROW = 16,
	ASSIGNMENT = 16,
	PLUS_EQ = 16,
	MIN_EQ = 16,
	MULT_EQ = 16,
	DIV_EQ = 16,
	MOD_EQ = 16,
	LSHIFT_EQ = 16,
	RSHIFT_EQ = 16,
	BIT_AND_EQ = 16,
	BIT_XOR_EQ = 16,
	BIT_OR_EQ = 16,

	COMMA = 17
}

export enum Associativity {
	LTR,
	RTL
}

export const OPERATOR_ASSOCIATIVITY = [
	null,
	Associativity.LTR,
	Associativity.LTR,
	Associativity.RTL,
	Associativity.LTR,
	Associativity.LTR,
	Associativity.LTR,
	Associativity.LTR,
	Associativity.LTR,
	Associativity.LTR,
	Associativity.LTR,
	Associativity.LTR,
	Associativity.LTR,
	Associativity.LTR,
	Associativity.LTR,
	Associativity.LTR,
	Associativity.RTL,
	Associativity.LTR
];


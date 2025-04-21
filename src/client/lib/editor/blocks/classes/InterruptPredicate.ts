import { Predicate } from './Predicate';

// simple marker class for ISR compilation
export abstract class InterruptPredicate extends Predicate {
	public readonly type = 'SYSTEM';
	public readonly lvalue = false;

	public abstract readonly name: string;
}


import { readdirSync, readFileSync, statSync } from 'fs';

const classes = new Set(),
	exts = new Map();

function traverse(dir, cb) {
	for (const entry of readdirSync(dir)) {
		if (statSync(`${dir}/${entry}`).isDirectory()) {
			traverse(`${dir}/${entry}`, cb);
		} else {
			cb(readFileSync(`${dir}/${entry}`).toString());
		}
	}
}

traverse('src/client/lib/editor', (contents) => {
	let match = /class (\w+)(?:<.*>)? extends (\w+).*{/.exec(contents);

	if (match && match[2] !== 'Entity') {
		classes.add(match[1]);
		classes.add(match[2]);

		exts.set(match[1], match[2]);
		return;
	}

	match = /class (\w+)(?:<.*>)?.*{/.exec(contents);

	if (match) {
		classes.add(match[1]);
	}
});

function resolve(cls) {
	return exts.has(cls) ? [...resolve(exts.get(cls)), cls] : [cls];
}

classes.forEach((cls) => exts.has(cls) && console.log(resolve(cls).join(' => ')));


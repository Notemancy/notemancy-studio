// src/params/img.js
export function match(value) {
	// This matcher returns true only if the value ends with one of the allowed image extensions.
	return /\.(png|jpe?g|svg|gif|webp)$/i.test(value);
}

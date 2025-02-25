// src/routes/[...img=(.*\.(png|jpg|jpeg|svg|gif|webp))]/+page.server.ts
import { error, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ params, fetch }) => {
	// `params.img` contains the captured path, e.g. "foo/bar/image.png"
	const imgPath = params.img;
	if (!imgPath) {
		throw error(404, 'Image path not provided');
	}

	// Build the URL to your backend API endpoint that serves the attachment.
	const url = `http://localhost:3001/api/attachment/${imgPath}`;

	// Fetch the image from your backend API.
	const res = await fetch(url);
	if (!res.ok) {
		throw error(res.status, await res.text());
	}

	// Get the response body as an ArrayBuffer and forward it along with the content-type.
	const body = await res.arrayBuffer();
	const contentType = res.headers.get('content-type') || 'application/octet-stream';

	return new Response(body, {
		status: 200,
		headers: { 'content-type': contentType }
	});
};


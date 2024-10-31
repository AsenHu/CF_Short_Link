/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.toml`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

interface Env {
    TOKEN: string;
    kv: KVNamespace;
}

interface Data {
    url?: string;
    length?: number;
    number?: boolean;
    capital?: boolean;
    lowercase?: boolean;
    expiration?: number;
    expirationTtl?: number;
}


export default {
    async fetch(request: Request, env: Env): Promise<Response> {

        // Get the path from the request URL
        const path = new URL(request.url).pathname;

        // Check if the request is API
        if (path == '/api/v1/create') {

            // Check if the request has a valid token
            if (request.headers.get('Authorization') || '' != env.TOKEN) {
                return new Response(JSON.stringify({
                    ok: false,
                    error: "Forbidden"
                }), {
                    status: 403,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
            }

            // Check if the request has a valid JSON body
            const data: Data = await request.json();
            if (!data) {
                return new Response(JSON.stringify({
                    ok: false,
                    error: "Bad Request",
                    message: "Invalid option field"
                }), {
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
            }

            // Check for invalid option field in the request data
            const validOptions = ['url', 'length', 'number', 'capital', 'lowercase', 'expiration', 'expirationTtl'];
            const invalidOptions = Object.keys(data).filter(key => !validOptions.includes(key));

            if (invalidOptions.length > 0) {
                return new Response(JSON.stringify({
                    ok: false,
                    error: "Bad Request",
                    message: "Invalid option field"
                }), {
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
            }

            // Validate required fields and default values
            if (!data.url || !/^https?:\/\//.test(data.url)) {
                return new Response(JSON.stringify({
                    ok: false,
                    error: "Bad Request",
                    message: "The 'url' field is required and must include the protocol (http:// or https://)"
                }), {
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
            }

            data.length = data.length || 6;
            data.number = data.number !== undefined ? data.number : true;
            data.capital = data.capital !== undefined ? data.capital : true;
            data.lowercase = data.lowercase !== undefined ? data.lowercase : true;

            if (!data.expiration && !data.expirationTtl) {
                data.expirationTtl = 2592000; // 30 days
            }

            if (data.expirationTtl && data.expirationTtl < 60) {
                return new Response(JSON.stringify({
                    ok: false,
                    error: "Bad Request",
                    message: "'expirationTtl' must be at least 60 seconds"
                }), {
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
            }

            // Create the short link
            let characters = '';
            if (data.lowercase) characters += 'abcdefghijklmnopqrstuvwxyz';
            if (data.capital) characters += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            if (data.number) characters += '0123456789';

            let shortLink = '';
            let attempts = 0;

            while (attempts < 3) {
                shortLink = '';

                for (let i = 0; i < (data.length || 6); i++) {
                    shortLink += characters.charAt(Math.floor(Math.random() * characters.length));
                }

                let prefix = shortLink.substring(0, 1);
                if (['P', 'p'].includes(prefix)) {
                    attempts++;
                    continue;
                }

                prefix = shortLink.substring(0, 2);
                if (['AV', 'BV', 'YT', 'av', 'bv', 'yt'].includes(prefix)) {
                    attempts++;
                    continue;
                }

                const existingValue = await env.kv.get(shortLink, 'text');
                if (!existingValue) {
                    if (data.expiration) {
                        await env.kv.put(shortLink, data.url, {
                            "expiration": data.expiration
                        });
                    } else {
                        await env.kv.put(shortLink, data.url, {
                            "expirationTtl": data.expirationTtl
                        });
                    }

                    // If lowercase is false and capital is true, convert the domain to uppercase
                    const domain = (data.lowercase === false && data.capital === true) ? 'B0.BY/' : 'b0.by/';
                    shortLink = domain + shortLink;
                    break;
                }
                attempts++;
            }

            return new Response(JSON.stringify({
                ok: true,
                shortLink: shortLink
            }), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json'
                }
            });

        }

        // Check if the first letter of the path is "p" or "P"
        if (path.substring(1, 2).toLowerCase() == 'p') {
            const redirectUrl = `https://asen.page/${path.substring(2)}`;
            return Response.redirect(redirectUrl, 301);
        }

        // Check if the first two letters of the path are "av" or "AV"
        if (path.substring(1, 3).toLowerCase() === 'av') {
            const avId = path.substring(3);
            if (/^\d+$/.test(avId)) {
                const redirectUrl = `https://www.bilibili.com/video/av${avId}`;
                return Response.redirect(redirectUrl, 301);
            } else {
                return new Response(JSON.stringify({
                    ok: false,
                    error: "Bad Request",
                    message: "The 'av' must be numeric"
                }), {
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
            }
        }

        // Check if the first two letters of the path are "bv" or "BV"
        if (path.substring(1, 3).toLowerCase() === 'bv') {
            const redirectUrl = `https://www.youtube.com/watch?v=${path.substring(3)}`;
            return Response.redirect(redirectUrl, 302);
        }

        // Check if the first two letters of the path are "yt" or "YT"
        if (path.substring(1, 3).toLowerCase() === 'yt') {
            const redirectUrl = `https://www.youtube.com/watch?v=${path.substring(3)}`;
            return Response.redirect(redirectUrl, 302);
        }

        // Check if the request is a redirect
        if (path.length > 1) {
            const key = path.substring(1);
            const data = await env.kv.get(key, {
                type: 'text',
                cacheTtl: 3600
            });

            if (data) {
                return Response.redirect(data, 302);
            }
        }
        return new Response(JSON.stringify({
            ok: false,
            error: "Not Found"
        }), {
            status: 404,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    },
};